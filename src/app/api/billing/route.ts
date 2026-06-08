import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ subscription: null, plan: null, usage: null });
  }

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
