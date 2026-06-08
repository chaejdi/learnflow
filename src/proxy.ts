import { NextRequest, NextResponse } from 'next/server';

// Next.js 16부터 Middleware는 Proxy로 명칭이 바뀌었다(기능은 동일).
export function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return NextResponse.next();
  }

  // Supabase 프로젝트 ref 추출 (https://xxx.supabase.co → xxx)
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const authCookieName = `sb-${projectRef}-auth-token`;

  // Supabase는 auth 토큰을 청크로 나눠 저장할 수 있음 (sb-xxx-auth-token.0, .1, ...)
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name === authCookieName || c.name.startsWith(`${authCookieName}.`)
  );

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
