import { NextRequest } from 'next/server';
import { requireMaster, isAuthError } from '@/lib/auth';

// 현재 로그인 사용자가 마스터(관리자)인지 — 사이드바 링크 노출용. 비관리자도 200 + false.
export async function GET(request: NextRequest) {
  const auth = await requireMaster(request);
  return Response.json({ isMaster: !isAuthError(auth) });
}
