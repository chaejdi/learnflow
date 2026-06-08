import { NextResponse } from 'next/server';

export function middleware() {
  // 인증 기능 완성 전까지 모든 요청 통과
  // TODO: Supabase Auth 세팅 완료 후 쿠키 기반 인증 체크 활성화
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
