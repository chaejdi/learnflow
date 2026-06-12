import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerRole, isAuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // 결제 정보는 원장(owner) 전용 — 선생님(staff)은 접근 불가
  const m = await requireOwnerRole(request);
  if (isAuthError(m)) return m;

  const { getSupabase } = await import('@/lib/supabase');
  const supabase = getSupabase();

  if (!m.academyId) {
    return NextResponse.json({ subscription: null, plan: null, usage: null });
  }
  const user = { academy_id: m.academyId };

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('academy_id', user.academy_id)
    .single();

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data: usage } = await supabase
    .from('usage_logs')
    .select('ai_chat_count')
    .eq('academy_id', user.academy_id)
    .eq('year_month', yearMonth)
    .single();

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('academy_id', user.academy_id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    subscription,
    usage: usage || { ai_chat_count: 0 },
    payments: payments || [],
  });
}
