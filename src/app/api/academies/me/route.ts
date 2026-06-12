import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getMembership, isAuthError } from '@/lib/auth';

// 로그인 사용자의 소속 학원과 역할(role)을 반환한다.
// 원장(owner)은 소유 학원, 선생님(staff)은 소속 학원이 잡힌다.
// 대기중 초대가 있으면 getMembership 에서 자동수락되어 학원이 연결된다.
// 학원이 아직 없으면 data: null (온보딩 필요)을 200으로 돌려준다.
export async function GET(request: NextRequest) {
  const m = await getMembership(request);
  if (isAuthError(m)) return m;

  if (!m.academyId) {
    return Response.json({ data: null, role: m.role });
  }

  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('academies')
      .select('*')
      .eq('id', m.academyId)
      .maybeSingle();

    if (error) throw error;

    return Response.json({ data: data ?? null, role: m.role });
  } catch (error) {
    console.error('GET my academy error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
