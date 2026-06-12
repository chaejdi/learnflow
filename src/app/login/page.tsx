'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { PENDING_ACADEMY_KEY } from '@/lib/onboarding';

function isSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabaseReady = isSupabaseConfigured();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!supabaseReady) {
      router.push(redirectTo);
      return;
    }

    try {
      setLoading(true);
      const { getBrowserClient } = await import('@/lib/supabase');
      const supabase = getBrowserClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      // 먼저 소속 학원을 확인한다. 초대받은 선생님이면 여기서 자동수락되어 학원이 잡힌다.
      let alreadyHasAcademy = false;
      try {
        const meRes = await apiFetch('/api/academies/me');
        const me = await meRes.json();
        alreadyHasAcademy = !!me?.data?.id;
      } catch {
        // 무시 — 아래 온보딩 로직으로 진행
      }

      // 회원가입 때 보관해둔 학원 정보가 있으면 지금 생성한다(이메일 인증 후 첫 로그인).
      // 단, 이미 소속 학원이 있으면(초대받은 선생님 등) 새 학원을 만들지 않는다.
      const pending = localStorage.getItem(PENDING_ACADEMY_KEY);
      if (pending && !alreadyHasAcademy) {
        try {
          await apiFetch('/api/academies', { method: 'POST', body: pending });
        } catch {
          // 실패해도 로그인은 진행 — 설정에서 다시 만들 수 있음
        }
      }
      localStorage.removeItem(PENDING_ACADEMY_KEY);

      router.push(redirectTo);
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 min-h-screen">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold text-primary-500">
            런플로우
          </a>
          <p className="text-sm text-gray-500 mt-2">
            원장님 전용 대시보드
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          {supabaseReady && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="academy@example.com"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  '로그인'
                )}
              </button>

              <div className="flex items-center justify-between text-xs">
                <Link href="/signup" className="text-primary-500 font-medium">
                  회원가입
                </Link>
                <Link href="/reset-password" className="text-gray-400 hover:text-gray-600">
                  비밀번호 찾기
                </Link>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-400">또는</span>
                </div>
              </div>
            </form>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className={`w-full h-10 rounded-lg text-sm font-semibold transition-colors ${
              supabaseReady
                ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            데모 대시보드 입장
          </button>
          <p className="text-center text-xs text-gray-400">
            계정 없이 데모 모드로 체험할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
