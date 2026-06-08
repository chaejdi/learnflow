import { NextRequest } from 'next/server';

export interface AuthResult {
  userId: string;
  email: string;
}

const DEMO_USER: AuthResult = {
  userId: 'demo-user-001',
  email: 'demo@learnflow.kr',
};

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function requireAuth(
  request: NextRequest
): Promise<AuthResult | Response> {
  // Demo mode: Supabase 미설정 시 인증 바이패스
  if (!isSupabaseConfigured()) {
    return DEMO_USER;
  }

  const authHeader = request.headers.get('authorization');

  // 토큰이 없으면 데모 유저로 통과 (로그인 미구현 상태)
  if (!authHeader?.startsWith('Bearer ')) {
    return DEMO_USER;
  }

  const token = authHeader.slice(7);

  const { getSupabase } = await import('@/lib/supabase');
  const supabase = getSupabase();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return Response.json(
      { error: '유효하지 않은 인증 토큰입니다.' },
      { status: 401 }
    );
  }

  return {
    userId: user.id,
    email: user.email || '',
  };
}

export function isAuthError(result: AuthResult | Response): result is Response {
  return result instanceof Response;
}
