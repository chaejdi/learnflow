'use client';

import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 px-4">
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
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full h-10 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            데모 대시보드 입장
          </button>
          <p className="text-center text-xs text-gray-400">
            Supabase 연동 전까지 로그인 없이 체험할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
