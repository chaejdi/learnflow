import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireMaster, isAuthError } from '@/lib/auth';

function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type PlanRow = { id: string; name: string; price: number; ai_chat_limit: number | null };
type SubRow = {
  academy_id: string; plan_id: string; status: string;
  current_period_end: string | null; trial_ends_at: string | null;
  card_company: string | null; card_last4: string | null;
};

// GET /api/admin/academies            → 전체 학원(고객사) 목록 + 요약
// GET /api/admin/academies?id=<uuid>  → 단일 학원 상세
export async function GET(request: NextRequest) {
  const auth = await requireMaster(request);
  if (isAuthError(auth)) return auth;

  const supabase = getServiceClient();
  const id = request.nextUrl.searchParams.get('id');
  const ym = yearMonth(new Date());
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  try {
    const { data: plans } = await supabase
      .from('plans')
      .select('id, name, price, ai_chat_limit')
      .returns<PlanRow[]>();
    const planMap = new Map((plans ?? []).map((p) => [p.id, p]));

    if (id) {
      // ---- 단일 학원 상세 ----
      const { data: academy } = await supabase
        .from('academies')
        .select('*')
        .eq('id', id)
        .single();
      if (!academy) {
        return Response.json({ error: '학원을 찾을 수 없습니다.' }, { status: 404 });
      }

      const [{ data: owner }, { data: sub }, { data: usage }, { data: convs }, { data: resvs }, { data: subjects }] =
        await Promise.all([
          supabase.from('users').select('email, name').eq('id', academy.owner_id).single(),
          supabase.from('subscriptions').select('*').eq('academy_id', id).maybeSingle(),
          supabase.from('usage_logs').select('ai_chat_count').eq('academy_id', id).eq('year_month', ym).maybeSingle(),
          supabase.from('conversations').select('id, kakao_user_id, parent_name, child_name, status, created_at, updated_at').eq('academy_id', id).order('updated_at', { ascending: false }),
          supabase.from('reservations').select('id, parent_name, child_name, status, created_at, trial_slots(date, time_start, subjects(name))').eq('academy_id', id).order('created_at', { ascending: false }),
          supabase.from('subjects').select('id').eq('academy_id', id),
        ]);

      const conversations = convs ?? [];
      const reservations = resvs ?? [];
      const monthConvs = conversations.filter((c) => c.created_at >= monthStart).length;
      const confirmed = reservations.filter((r) => r.status === 'confirmed' || r.status === 'completed').length;
      const plan = sub ? planMap.get((sub as SubRow).plan_id) : undefined;

      return Response.json({
        data: {
          academy,
          owner: owner ?? null,
          subscription: sub ?? null,
          plan: plan ?? null,
          usage: { year_month: ym, ai_chat_count: usage?.ai_chat_count ?? 0, limit: plan?.ai_chat_limit ?? null },
          stats: {
            conversations_total: conversations.length,
            conversations_this_month: monthConvs,
            reservations_total: reservations.length,
            reservations_confirmed: confirmed,
            conversion_rate: conversations.length ? Math.round((reservations.length / conversations.length) * 1000) / 10 : 0,
            subjects_count: subjects?.length ?? 0,
          },
          recent_conversations: conversations.slice(0, 10),
          recent_reservations: reservations.slice(0, 10),
        },
      });
    }

    // ---- 전체 목록 ----
    const [{ data: academies }, { data: users }, { data: subs }, { data: usages }, { data: convs }, { data: resvs }] =
      await Promise.all([
        supabase.from('academies').select('id, name, created_at, owner_id, kakao_channel_id').order('created_at', { ascending: false }),
        supabase.from('users').select('id, email, name'),
        supabase.from('subscriptions').select('academy_id, plan_id, status, current_period_end, trial_ends_at, card_company, card_last4').returns<SubRow[]>(),
        supabase.from('usage_logs').select('academy_id, ai_chat_count').eq('year_month', ym),
        supabase.from('conversations').select('academy_id, created_at, updated_at'),
        supabase.from('reservations').select('academy_id, status'),
      ]);

    const userMap = new Map((users ?? []).map((u) => [u.id, u]));
    const subMap = new Map((subs ?? []).map((s) => [s.academy_id, s]));
    const usageMap = new Map((usages ?? []).map((u) => [u.academy_id, u.ai_chat_count]));

    const convAgg = new Map<string, { total: number; month: number; last: string | null }>();
    for (const c of convs ?? []) {
      const a = convAgg.get(c.academy_id) ?? { total: 0, month: 0, last: null };
      a.total += 1;
      if (c.created_at >= monthStart) a.month += 1;
      if (!a.last || c.updated_at > a.last) a.last = c.updated_at;
      convAgg.set(c.academy_id, a);
    }
    const resvAgg = new Map<string, number>();
    for (const r of resvs ?? []) resvAgg.set(r.academy_id, (resvAgg.get(r.academy_id) ?? 0) + 1);

    const rows = (academies ?? []).map((ac) => {
      const sub = subMap.get(ac.id);
      const plan = sub ? planMap.get(sub.plan_id) : undefined;
      const cv = convAgg.get(ac.id) ?? { total: 0, month: 0, last: null };
      return {
        id: ac.id,
        name: ac.name,
        created_at: ac.created_at,
        kakao_connected: !!ac.kakao_channel_id,
        owner_email: userMap.get(ac.owner_id)?.email ?? null,
        plan_id: sub?.plan_id ?? null,
        plan_name: plan?.name ?? '미가입',
        plan_price: plan?.price ?? 0,
        status: sub?.status ?? 'none',
        ai_chat_count: usageMap.get(ac.id) ?? 0,
        ai_chat_limit: plan?.ai_chat_limit ?? null,
        conversations_total: cv.total,
        conversations_this_month: cv.month,
        reservations_total: resvAgg.get(ac.id) ?? 0,
        last_activity: cv.last,
      };
    });

    // 요약: 총 고객사, 유료(active/trialing 외 active), 추정 MRR, 이번달 총 AI 사용량
    const paid = rows.filter((r) => r.status === 'active').length;
    const mrr = rows.filter((r) => r.status === 'active').reduce((s, r) => s + r.plan_price, 0);
    const totalAi = rows.reduce((s, r) => s + r.ai_chat_count, 0);

    return Response.json({
      data: {
        summary: {
          total_academies: rows.length,
          paid_academies: paid,
          trialing: rows.filter((r) => r.status === 'trialing').length,
          mrr,
          total_ai_this_month: totalAi,
          year_month: ym,
        },
        academies: rows,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/academies error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
