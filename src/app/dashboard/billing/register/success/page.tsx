'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAcademy } from '@/hooks/useAcademy';

export default function CardRegisterSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAcademy();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current || !token) return;
    processed.current = true;

    const authKey = searchParams.get('authKey');
    const customerKey = searchParams.get('customerKey');

    if (!authKey || !customerKey) {
      setStatus('error');
      setErrorMsg('인증 정보가 없습니다.');
      return;
    }

    fetch('/api/billing/card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ authKey, customerKey }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setTimeout(() => router.push('/dashboard/billing'), 2000);
        } else {
          setStatus('error');
          setErrorMsg(data.error || '카드 등록에 실패했습니다.');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('네트워크 오류가 발생했습니다.');
      });
  }, [searchParams, token, router]);

  return (
    <div className="p-6 max-w-md mx-auto mt-20 text-center space-y-4">
      {status === 'processing' && (
        <>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600">카드 등록 처리 중...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <p className="text-lg font-semibold">카드가 등록되었습니다!</p>
          <p className="text-sm text-gray-500">결제 관리 페이지로 이동합니다...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-red-600">{errorMsg}</p>
          <button
            onClick={() => router.push('/dashboard/billing')}
            className="text-blue-600 hover:underline"
          >
            돌아가기
          </button>
        </>
      )}
    </div>
  );
}
