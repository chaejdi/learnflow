'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface InviteInfo {
  email: string;
  academy_name: string;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token || '');

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existsNotice, setExistsNotice] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/invite?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setLoadError(json.error || '유효하지 않은 초대입니다.');
        } else {
          setInfo(json.data);
        }
      } catch {
        if (active) setLoadError('초대 정보를 불러오지 못했습니다.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setExistsNotice('');

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== password2) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.code === 'exists') {
          setExistsNotice(json.error);
        } else {
          setError(json.error || '가입에 실패했습니다.');
        }
        return;
      }

      // 가입 성공 → 바로 로그인시켜 대시보드로
      try {
        const { getBrowserClient } = await import('@/lib/supabase');
        const supabase = getBrowserClient();
        await supabase.auth.signInWithPassword({
          email: info!.email,
          password,
        });
      } catch {
        // 로그인 실패해도 가입은 됐으니 로그인 페이지로
        router.push('/login');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('가입 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
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
          <p className="text-sm text-gray-500 mt-2">선생님 계정 만들기</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : loadError ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-red-500">{loadError}</p>
              <Link
                href="/login"
                className="inline-block text-sm text-primary-500 font-medium"
              >
                로그인 페이지로
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-primary-50 px-3 py-2.5 text-sm text-primary-700">
                <span className="font-semibold">{info?.academy_name}</span> 에
                초대되었습니다.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  readOnly
                  value={info?.email || ''}
                  className={`${inputClass} bg-gray-50 text-gray-500`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="선생님 성함"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="비밀번호 재입력"
                  className={inputClass}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {existsNotice && (
                <div className="space-y-1">
                  <p className="text-sm text-amber-600">{existsNotice}</p>
                  <Link href="/login" className="text-sm text-primary-500 font-medium">
                    로그인하러 가기 →
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  '가입하고 시작하기'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
