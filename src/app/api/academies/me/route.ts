import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireAuth, isAuthError } from '@/lib/auth';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 로그인한 원장님(owner) 본인의 학원을 반환한다.
// 학원이 아직 없으면 data: null (온보딩 필요)을 200으로 돌려준다.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  // 미로그인/데모 유저(uuid 아님)는 소유 학원이 없는 것으로 처리
  if (!UUID_RE.test(auth.userId)) {
    return Response.json({ data: null });
  }

  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('academies')
      .select('*')
      .eq('owner_id', auth.userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return Response.json({ data: data ?? null });
  } catch (error) {
    console.error('GET my academy error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
