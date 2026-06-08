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

  // Supabase가 설정된 정상 모드에서는 토큰이 없으면 인증 거부(401).
  // 로그인된 클라이언트는 apiFetch가 항상 Bearer 토큰을 첨부한다.
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
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
