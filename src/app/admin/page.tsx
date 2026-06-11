'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { Building2, CreditCard, Wallet, Bot, ChevronRight, AlertTriangle } from 'lucide-react';

type Row = {
  id: string;
  name: string;
  created_at: string;
  kakao_connected: boolean;
  owner_email: string | null;
  plan_id: string | null;
  plan_name: string;
  plan_price: number;
  status: string;
  ai_chat_count: number;
  ai_chat_limit: number | null;
  conversations_total: number;
  conversations_this_month: number;
  reservations_total: number;
  last_activity: string | null;
};
type Summary = {
  total_academies: number; paid_academies: number; trialing: number;
  mrr: number; total_ai_this_month: number; year_month: string;
};

const won = (n: number) => n.toLocaleString('ko-KR') + '원';

function statusBadge(s: string) {
  const map: Record<string, [string, string]> = {
    active: ['정상', 'bg-green-100 text-green-700'],
    trialing: ['체험중', 'bg-blue-100 text-blue-700'],
    past_due: ['연체', 'bg-amber-100 text-amber-700'],
    cancelled: ['해지', 'bg-gray-100 text-gray-500'],
    expired: ['만료', 'bg-red-100 text-red-700'],
    none: ['미가입', 'bg-gray-100 text-gray-400'],
  };
  const [label, cls] = map[s] ?? [s, 'bg-gray-100 text-gray-500'];
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

function relTime(iso: string | null) {
  if (!iso) return '활동 없음';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}일 전`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}시간 전`;
  const m = Math.floor(diff / 60000);
  return m > 0 ? `${m}분 전` : '방금';
}

function activityLevel(r: Row): { label: string; cls: string } {
  // 이번 달 문의 수 기준 활성도
  const n = r.conversations_this_month;
  if (n >= 20) return { label: '활발', cls: 'text-green-600' };
  if (n >= 5) return { label: '보통', cls: 'text-amber-600' };
  if (n >= 1) return { label: '저조', cls: 'text-gray-500' };
  return { label: '휴면', cls: 'text-red-500' };
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

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/admin/academies');
        if (res.status === 403 || res.status === 401) { setState('forbidden'); return; }
        if (!res.ok) { setState('error'); return; }
        const json = await res.json();
        setRows(json.data.academies);
        setSummary(json.data.summary);
        setState('ok');
      } catch { setState('error'); }
    })();
  }, []);

  if (state === 'loading') return <p className="text-gray-400 text-sm">불러오는 중...</p>;
  if (state === 'forbidden') return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
      <AlertTriangle className="mx-auto text-amber-500 mb-3" />
      <p className="font-semibold text-gray-800">관리자 전용 페이지입니다</p>
      <p className="text-sm text-gray-500 mt-1">이 계정에는 마스터 권한이 없습니다.</p>
      <Link href="/dashboard" className="inline-block mt-4 text-sm text-primary-600 hover:underline">내 학원 대시보드로 →</Link>
    </div>
  );
  if (state === 'error') return <p className="text-red-500 text-sm">데이터를 불러오지 못했습니다.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">고객사 관리</h1>
        <p className="text-sm text-gray-500 mt-0.5">계약된 학원 현황 · {summary?.year_month} 기준</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Building2 size={16} />} label="총 고객사" value={`${summary?.total_academies ?? 0}곳`} sub={`체험중 ${summary?.trialing ?? 0}곳`} />
        <StatCard icon={<CreditCard size={16} />} label="유료 학원" value={`${summary?.paid_academies ?? 0}곳`} />
        <StatCard icon={<Wallet size={16} />} label="추정 MRR" value={won(summary?.mrr ?? 0)} sub="정상 구독 합계" />
        <StatCard icon={<Bot size={16} />} label="이번달 AI 사용" value={`${(summary?.total_ai_this_month ?? 0).toLocaleString()}건`} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">학원</th>
                <th className="px-4 py-3 font-medium">요금제</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">이번달 AI</th>
                <th className="px-4 py-3 font-medium">문의(누적/이번달)</th>
                <th className="px-4 py-3 font-medium">예약</th>
                <th className="px-4 py-3 font-medium">활성도</th>
                <th className="px-4 py-3 font-medium">최근활동</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const act = activityLevel(r);
                const pct = r.ai_chat_limit ? Math.min(100, Math.round((r.ai_chat_count / r.ai_chat_limit) * 100)) : null;
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/${r.id}`} className="font-medium text-gray-900 hover:text-primary-600">{r.name}</Link>
                      <div className="text-xs text-gray-400">{r.owner_email ?? '—'}{!r.kakao_connected && <span className="ml-1.5 text-amber-500">· 카톡 미연동</span>}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-700">{r.plan_name}</span>
                      {r.plan_price > 0 && <div className="text-xs text-gray-400">{won(r.plan_price)}</div>}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">{r.ai_chat_count.toLocaleString()}{r.ai_chat_limit ? ` / ${r.ai_chat_limit.toLocaleString()}` : ''}</span>
                      {pct !== null && (
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full ${pct >= 90 ? 'bg-red-400' : 'bg-primary-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.conversations_total} <span className="text-gray-300">/</span> {r.conversations_this_month}</td>
                    <td className="px-4 py-3 text-gray-600">{r.reservations_total}</td>
                    <td className={`px-4 py-3 font-medium ${act.cls}`}>{act.label}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{relTime(r.last_activity)}</td>
                    <td className="px-4 py-3"><Link href={`/admin/${r.id}`} className="text-gray-300 hover:text-primary-500"><ChevronRight size={18} /></Link></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">계약된 학원이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
