import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || '';
const TOSS_API_URL = 'https://api.tosspayments.com/v1/billing';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { authKey, customerKey } = await request.json();

  if (!authKey || !customerKey) {
    return NextResponse.json({ error: 'authKey와 customerKey가 필요합니다.' }, { status: 400 });
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

  // 토스페이먼츠 빌링키 발급
  const tossResponse = await fetch(`${TOSS_API_URL}/authorizations/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ authKey, customerKey }),
  });

  const tossData = await tossResponse.json();

  if (!tossResponse.ok) {
    return NextResponse.json(
      { error: tossData.message || '카드 등록에 실패했습니다.' },
      { status: 400 }
    );
  }

  // 빌링키 저장
  const { error } = await supabase
    .from('subscriptions')
    .update({
      billing_key: tossData.billingKey,
      customer_key: customerKey,
      card_last4: tossData.card?.number?.slice(-4) || '',
      card_company: tossData.card?.company || '',
      updated_at: new Date().toISOString(),
    })
    .eq('academy_id', user.academy_id);

  if (error) {
    return NextResponse.json({ error: '카드 정보 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    card: {
      last4: tossData.card?.number?.slice(-4),
      company: tossData.card?.company,
    },
  });
}

// 카드 삭제 (빌링키 해제)
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { getSupabase } = await import('@/lib/supabase');
  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('academy_id')
    .eq('id', auth.userId)
    .single();

  if (!user?.academy_id) {
    return NextResponse.json({ error: '학원 정보가 없습니다.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      billing_key: null,
      customer_key: null,
      card_last4: null,
      card_company: null,
      updated_at: new Date().toISOString(),
    })
    .eq('academy_id', user.academy_id);

  if (error) {
    return NextResponse.json({ error: '카드 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
