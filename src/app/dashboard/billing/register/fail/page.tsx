'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function CardRegisterFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get('message') || '카드 등록에 실패했습니다.';
  const code = searchParams.get('code') || '';

  return (
    <div className="p-6 max-w-md mx-auto mt-20 text-center space-y-4">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <span className="text-red-600 text-xl">✕</span>
      </div>
      <p className="text-lg font-semibold">카드 등록 실패</p>
      <p className="text-gray-600">{message}</p>
      {code && <p className="text-xs text-gray-400">코드: {code}</p>}
      <button
        onClick={() => router.push('/dashboard/billing')}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
      >
        돌아가기
      </button>
    </div>
  );
}
