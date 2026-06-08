import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { planId } = await request.json();

  if (!['basic', 'pro'].includes(planId)) {
    return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 });
  }

  const { getSupabase } = await import('@/lib/supabase');
  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('academy_id')
    .eq('id', auth.userId)
    .single();

  if (!user?.academy_id) {
    return NextResponse.json({ error: '학원을 먼저 등록해주세요.' }, { status: 400 });
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('academy_id', user.academy_id)
    .single();

  if (!subscription) {
    return NextResponse.json({ error: '구독 정보가 없습니다.' }, { status: 404 });
  }

  if (!subscription.billing_key) {
    return NextResponse.json({ error: '결제 카드를 먼저 등록해주세요.' }, { status: 400 });
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({
      plan_id: planId,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', subscription.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: '플랜 변경에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ subscription: updated });
}
