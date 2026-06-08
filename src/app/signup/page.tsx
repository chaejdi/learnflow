'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const supabaseReady = isSupabaseConfigured();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!supabaseReady) {
      router.push('/dashboard');
      return;
    }

    const academyPayload = {
      name: academyName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      owner_name: ownerName.trim(),
    };

    try {
      setLoading(true);
      const { getBrowserClient } = await import('@/lib/supabase');
      const supabase = getBrowserClient();

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || '회원가입 중 오류가 발생했습니다.');
        return;
      }

      // 로그인 직후 생성 경로를 위해 항상 보관
      localStorage.setItem(PENDING_ACADEMY_KEY, JSON.stringify(academyPayload));

      if (data.session) {
        // 세션 즉시 발급(이메일 인증 off) → 바로 학원 생성
        const res = await apiFetch('/api/academies', {
          method: 'POST',
          body: JSON.stringify(academyPayload),
        });
        if (res.ok) {
          localStorage.removeItem(PENDING_ACADEMY_KEY);
          router.push('/dashboard');
          return;
        }
        setError('학원 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      // 이메일 인증 필요 → 인증 후 로그인하면 학원이 생성됨
      setNotice(
        '가입 확인 메일을 보냈어요. 메일에서 인증을 완료한 뒤 로그인하면 학원이 자동으로 등록됩니다.'
      );
    } catch {
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 min-h-screen py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary-500">
            런플로우
          </Link>
          <p className="text-sm text-gray-500 mt-2">학원 무료로 시작하기</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          {!supabaseReady ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center">
                현재 데모 모드입니다. 계정 없이 바로 체험할 수 있어요.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full h-10 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
              >
                데모 대시보드 입장
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
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
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  className={inputClass}
                />
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    학원 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    placeholder="예: 행복영어학원"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    원장님 성함
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="선택"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주소
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="선택"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전화번호
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="선택"
                    className={inputClass}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {notice && <p className="text-sm text-green-600">{notice}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  '가입하고 학원 만들기'
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="text-primary-500 font-medium">
                  로그인
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
