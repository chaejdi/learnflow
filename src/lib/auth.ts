import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export interface AuthResult {
  userId: string;
  email: string;
}

export async function requireAuth(
  request: NextRequest
): Promise<AuthResult | Response> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json(
      { error: '인증이 필요합니다.' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
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
