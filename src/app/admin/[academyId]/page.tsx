'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { ArrowLeft, MessageSquare, CalendarDays, TrendingUp, Bot, AlertTriangle } from 'lucide-react';

type Slot = { date: string; time_start: string; subjects?: { name: string } | { name: string }[] | null };
type Detail = {
  academy: { id: string; name: string; address: string; phone: string; kakao_channel_id: string | null; created_at: string };
  owner: { email: string; name: string } | null;
  subscription: { plan_id: string; status: string; current_period_end: string | null; trial_ends_at: string | null; card_company: string | null; card_last4: string | null } | null;
  plan: { id: string; name: string; price: number; ai_chat_limit: number | null } | null;
  usage: { year_month: string; ai_chat_count: number; limit: number | null };
  stats: { conversations_total: number; conversations_this_month: number; reservations_total: number; reservations_confirmed: number; conversion_rate: number; subjects_count: number };
  recent_conversations: { id: string; kakao_user_id: string; parent_name: string | null; child_name: string | null; status: string; updated_at: string }[];
  recent_reservations: { id: string; parent_name: string | null; child_name: string | null; status: string; created_at: string; trial_slots?: Slot | null }[];
};

const won = (n: number) => n.toLocaleString('ko-KR') + '원';
const date = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: 'short', day: 'numeric' });
function convName(c: { parent_name: string | null; child_name: string | null; kakao_user_id: string }) {
  if (c.parent_name && c.child_name) return `${c.parent_name}(${c.child_name})`;
  return `학부모 ${c.kakao_user_id.slice(-4).toUpperCase()}`;
}
function slotText(s?: Slot | null) {
  if (!s) return '-';
  const subj = Array.isArray(s.subjects) ? s.subjects[0]?.name : s.subjects?.name;
  return `${s.date} ${s.time_start?.slice(0, 5) ?? ''}${subj ? ` · ${subj}` : ''}`;
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 text-gray-400 mb-2">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminAcademyDetail() {
  const params = useParams();
  const academyId = params.academyId as string;
  const [d, setD] = useState<Detail | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/admin/academies?id=${academyId}`);
        if (res.status === 403 || res.status === 401) { setState('forbidden'); return; }
        if (!res.ok) { setState('error'); return; }
        setD((await res.json()).data);
        setState('ok');
      } catch { setState('error'); }
    })();
  }, [academyId]);

  if (state === 'loading') return <p className="text-gray-400 text-sm">불러오는 중...</p>;
  if (state === 'forbidden') return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
      <AlertTriangle className="mx-auto text-amber-500 mb-3" />
      <p className="font-semibold text-gray-800">관리자 전용 페이지입니다</p>
      <Link href="/dashboard" className="inline-block mt-4 text-sm text-primary-600 hover:underline">내 학원 대시보드로 →</Link>
    </div>
  );
  if (state === 'error' || !d) return <p className="text-red-500 text-sm">데이터를 불러오지 못했습니다.</p>;

  const usagePct = d.usage.limit ? Math.min(100, Math.round((d.usage.ai_chat_count / d.usage.limit) * 100)) : null;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> 고객사 목록
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{d.academy.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {d.owner?.email ?? '—'} · {d.academy.phone} · 가입 {date(d.academy.created_at)}
            {!d.academy.kakao_channel_id && <span className="ml-1.5 text-amber-500">· 카톡 미연동</span>}
          </p>
        </div>
        <Link href={`/admin/${academyId}`} className="text-xs text-gray-400">ID: {academyId.slice(0, 8)}</Link>
      </div>

      {/* 구독 정보 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs text-gray-400">요금제</p>
            <p className="font-semibold text-gray-900">{d.plan?.name ?? '미가입'}{d.plan?.price ? ` · ${won(d.plan.price)}/월` : ''}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">구독 상태</p>
            <p className="font-semibold text-gray-900">{d.subscription?.status ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">결제수단</p>
            <p className="font-semibold text-gray-900">{d.subscription?.card_company ? `${d.subscription.card_company} ****${d.subscription.card_last4 ?? ''}` : '미등록'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">{d.subscription?.status === 'trialing' ? '체험 종료' : '다음 결제'}</p>
            <p className="font-semibold text-gray-900">{(d.subscription?.status === 'trialing' ? d.subscription?.trial_ends_at : d.subscription?.current_period_end) ? date((d.subscription?.status === 'trialing' ? d.subscription?.trial_ends_at : d.subscription?.current_period_end) as string) : '—'}</p>
          </div>
        </div>
      </div>

      {/* 사용량 + 통계 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 text-gray-400 mb-2"><Bot size={16} /><span className="text-xs font-medium">이번달 AI 사용</span></div>
          <p className="text-2xl font-bold text-gray-900">{d.usage.ai_chat_count.toLocaleString()}{d.usage.limit ? <span className="text-base text-gray-400"> / {d.usage.limit.toLocaleString()}</span> : <span className="text-base text-gray-400"> (무제한)</span>}</p>
          {usagePct !== null && (
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className={`h-full ${usagePct >= 90 ? 'bg-red-400' : 'bg-primary-400'}`} style={{ width: `${usagePct}%` }} />
            </div>
          )}
        </div>
        <StatCard icon={<MessageSquare size={16} />} label="문의 (누적/이번달)" value={`${d.stats.conversations_total}`} sub={`이번달 ${d.stats.conversations_this_month}건`} />
        <StatCard icon={<CalendarDays size={16} />} label="예약 (확정)" value={`${d.stats.reservations_total}`} sub={`확정 ${d.stats.reservations_confirmed}건`} />
        <StatCard icon={<TrendingUp size={16} />} label="전환율" value={`${d.stats.conversion_rate}%`} sub={`과목 ${d.stats.subjects_count}개`} />
      </div>

      {/* 최근 문의 + 예약 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">최근 문의</h2>
          <div className="space-y-2">
            {d.recent_conversations.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{convName(c)}</span>
                <span className="text-xs text-gray-400">{date(c.updated_at)} · {c.status}</span>
              </div>
            ))}
            {d.recent_conversations.length === 0 && <p className="text-sm text-gray-400 py-2">문의 없음</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">최근 예약</h2>
          <div className="space-y-2">
            {d.recent_reservations.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{r.parent_name ?? '—'}{r.child_name ? `(${r.child_name})` : ''}</span>
                <span className="text-xs text-gray-400">{slotText(r.trial_slots)} · {r.status}</span>
              </div>
            ))}
            {d.recent_reservations.length === 0 && <p className="text-sm text-gray-400 py-2">예약 없음</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
