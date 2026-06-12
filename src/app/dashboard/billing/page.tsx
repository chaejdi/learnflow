'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAcademy } from '@/hooks/useAcademy';

interface Plan {
  id: string;
  name: string;
  price: number;
  ai_chat_limit: number | null;
  features: string[];
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  trial_starts_at: string;
  trial_ends_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  billing_key: string | null;
  card_last4: string | null;
  card_company: string | null;
  plans: Plan;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const PLANS: Plan[] = [
  { id: 'trial', name: '무료 체험', price: 0, ai_chat_limit: 100, features: ['AI 상담 월 100건', '체험수업 예약', '기본 대시보드', '카카오톡 채널 1개'] },
  { id: 'basic', name: '기본', price: 19900, ai_chat_limit: 200, features: ['AI 상담 200건/월', '체험수업 예약', '전환율 분석 대시보드', '카카오 알림톡', '원장님 직접 답변', '이메일 지원'] },
  { id: 'pro', name: '프로', price: 39900, ai_chat_limit: null, features: ['AI 상담 무제한', '다중 지점 관리', 'AI 응답 커스터마이징', '우선 지원', '전담 매니저'] },
];

export default function BillingPage() {
  const router = useRouter();
  const { academyId, token, role, loading: academyLoading } = useAcademy();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<{ ai_chat_count: number }>({ ai_chat_count: 0 });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // 결제 관리는 원장(owner) 전용 — 선생님(staff)은 대시보드로
  useEffect(() => {
    if (!academyLoading && role === 'staff') {
      router.replace('/dashboard');
    }
  }, [academyLoading, role, router]);

  const fetchBilling = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/billing', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubscription(data.subscription);
      setUsage(data.usage || { ai_chat_count: 0 });
      setPayments(data.payments || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleSubscribe = async (planId: string) => {
    if (!subscription?.billing_key) {
      alert('결제 카드를 먼저 등록해주세요.');
      return;
    }
    const res = await fetch('/api/billing/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('플랜이 변경되었습니다!');
      fetchBilling();
    } else {
      alert(data.error);
    }
  };

  const handleRegisterCard = () => {
    if (!academyId) return;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      alert('토스페이먼츠 설정이 필요합니다. (NEXT_PUBLIC_TOSS_CLIENT_KEY)');
      return;
    }
    const customerKey = `customer_${academyId.slice(0, 8)}`;
    // 토스 빌링 위젯으로 리다이렉트
    window.location.href = `/dashboard/billing/register?customerKey=${customerKey}`;
  };

  if (loading || academyLoading || role === 'staff') {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const currentPlan = PLANS.find(p => p.id === subscription?.plan_id) || PLANS[0];
  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const chatLimit = currentPlan.ai_chat_limit;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">결제 관리</h1>

      {/* 현재 구독 상태 */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">현재 플랜</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-blue-600">{currentPlan.name}</p>
            {subscription?.status === 'trialing' && (
              <p className="text-sm text-orange-600 mt-1">
                무료체험 중 — {trialDaysLeft}일 남음
              </p>
            )}
            {subscription?.status === 'active' && (
              <p className="text-sm text-green-600 mt-1">활성 구독</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">
              {currentPlan.price === 0 ? '무료' : `${currentPlan.price.toLocaleString()}원`}
            </p>
            <p className="text-sm text-gray-500">/월</p>
          </div>
        </div>

        {/* 사용량 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">이번 달 AI 상담</span>
            <span className="text-sm font-medium">
              {usage.ai_chat_count}건 / {chatLimit ? `${chatLimit}건` : '무제한'}
            </span>
          </div>
          {chatLimit && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (usage.ai_chat_count / chatLimit) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 결제 수단 */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-semibold">결제 수단</h2>
        {subscription?.card_last4 ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 bg-gray-200 rounded flex items-center justify-center text-xs font-mono">
                CARD
              </div>
              <div>
                <p className="font-medium">{subscription.card_company}</p>
                <p className="text-sm text-gray-500">**** **** **** {subscription.card_last4}</p>
              </div>
            </div>
            <button
              onClick={handleRegisterCard}
              className="text-sm text-blue-600 hover:underline"
            >
              변경
            </button>
          </div>
        ) : (
          <button
            onClick={handleRegisterCard}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
          >
            + 결제 카드 등록
          </button>
        )}
      </div>

      {/* 플랜 선택 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">플랜 변경</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-xl p-5 space-y-3 ${
                plan.id === currentPlan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-2xl font-bold">
                {plan.price === 0 ? '무료' : `${plan.price.toLocaleString()}원`}
                <span className="text-sm font-normal text-gray-500">/월</span>
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                {plan.features.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
              {plan.id === currentPlan.id ? (
                <div className="py-2 text-center text-sm text-blue-600 font-medium">현재 플랜</div>
              ) : plan.id === 'trial' ? null : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  {plan.id === 'basic' ? '기본 플랜으로 변경' : '프로 플랜으로 업그레이드'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 결제 내역 */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold">결제 내역</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">날짜</th>
                <th className="pb-2">금액</th>
                <th className="pb-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2">
                    {new Date(p.paid_at || p.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="py-2">{p.amount.toLocaleString()}원</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      p.status === 'paid' ? 'bg-green-100 text-green-700' :
                      p.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {p.status === 'paid' ? '결제완료' : p.status === 'failed' ? '실패' : '대기'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
