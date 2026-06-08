'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { getBrowserClient } = await import('@/lib/supabase');
      const supabase = getBrowserClient();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/update`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 min-h-screen">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold text-primary-500">런플로우</a>
          <p className="text-sm text-gray-500 mt-2">비밀번호 재설정</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <p className="font-semibold">이메일을 보냈습니다</p>
              <p className="text-sm text-gray-500">
                {email}로 비밀번호 재설정 링크를 보냈습니다. 메일을 확인해주세요.
              </p>
              <Link href="/login" className="text-sm text-primary-500 font-medium hover:underline">
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-600">
                가입할 때 사용한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="academy@example.com"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : '재설정 링크 보내기'}
              </button>

              <p className="text-center text-xs text-gray-400">
                <Link href="/login" className="text-primary-500 font-medium">로그인으로 돌아가기</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
