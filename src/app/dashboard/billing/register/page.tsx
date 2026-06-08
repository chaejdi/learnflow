'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestBillingAuth: (method: string, options: Record<string, string>) => Promise<void>;
    };
  }
}

export default function CardRegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    const customerKey = searchParams.get('customerKey');

    if (!clientKey) {
      setError('토스페이먼츠 클라이언트 키가 설정되지 않았습니다. (NEXT_PUBLIC_TOSS_CLIENT_KEY)');
      return;
    }
    if (!customerKey) {
      setError('고객 키가 없습니다.');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.onload = () => {
      if (!window.TossPayments) return;
      const tossPayments = window.TossPayments(clientKey);
      tossPayments.requestBillingAuth('카드', {
        customerKey,
        successUrl: `${window.location.origin}/dashboard/billing/register/success`,
        failUrl: `${window.location.origin}/dashboard/billing/register/fail`,
      }).catch((err: Error) => {
        if (err.message === 'USER_CANCEL') {
          router.push('/dashboard/billing');
        } else {
          setError(err.message);
        }
      });
    };
    document.head.appendChild(script);
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="p-6 max-w-md mx-auto mt-20 text-center space-y-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => router.push('/dashboard/billing')}
          className="text-blue-600 hover:underline"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        <p className="text-gray-500">카드 등록 화면을 불러오는 중...</p>
      </div>
    </div>
  );
}
