'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useAcademy } from '@/hooks/useAcademy';
import { apiFetch } from '@/lib/api-client';

interface MonthlyData {
  month: string;
  inquiries: number;
  reservations: number;
  rate: number;
}

export default function AnalyticsPage() {
  const { academyId, isDemo, loading: academyLoading } = useAcademy();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [summary, setSummary] = useState({ total: 0, converted: 0, rate: 0 });

  const fetchData = useCallback(async () => {
    if (isDemo) {
      const demoData: MonthlyData[] = [
        { month: '2026-01', inquiries: 32, reservations: 5, rate: 15.6 },
        { month: '2026-02', inquiries: 41, reservations: 7, rate: 17.1 },
        { month: '2026-03', inquiries: 55, reservations: 11, rate: 20.0 },
        { month: '2026-04', inquiries: 48, reservations: 9, rate: 18.8 },
        { month: '2026-05', inquiries: 63, reservations: 14, rate: 22.2 },
        { month: '2026-06', inquiries: 27, reservations: 6, rate: 22.2 },
      ];
      setMonthlyData(demoData);
      const total = demoData.reduce((s, d) => s + d.inquiries, 0);
      const converted = demoData.reduce((s, d) => s + d.reservations, 0);
      setSummary({ total, converted, rate: total > 0 ? Math.round((converted / total) * 100 * 10) / 10 : 0 });
      setLoading(false);
      return;
    }
    if (!academyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [convRes, resRes] = await Promise.all([
        apiFetch(`/api/conversations?academy_id=${academyId}`),
        apiFetch(`/api/reservations?academy_id=${academyId}`),
      ]);
      const convJson = await convRes.json();
      const resJson = await resRes.json();
      const conversations = convJson.data || [];
      const reservations = resJson.data || [];

      const monthMap = new Map<string, { inquiries: number; reservations: number }>();
      for (const c of conversations) {
        const m = c.created_at.slice(0, 7);
        const entry = monthMap.get(m) || { inquiries: 0, reservations: 0 };
        entry.inquiries++;
        monthMap.set(m, entry);
      }
      for (const r of reservations) {
        const m = r.created_at.slice(0, 7);
        const entry = monthMap.get(m) || { inquiries: 0, reservations: 0 };
        entry.reservations++;
        monthMap.set(m, entry);
      }

      const sorted = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, d]) => ({
          month,
          inquiries: d.inquiries,
          reservations: d.reservations,
          rate: d.inquiries > 0 ? Math.round((d.reservations / d.inquiries) * 100 * 10) / 10 : 0,
        }));

      setMonthlyData(sorted);
      const total = sorted.reduce((s, d) => s + d.inquiries, 0);
      const converted = sorted.reduce((s, d) => s + d.reservations, 0);
      setSummary({ total, converted, rate: total > 0 ? Math.round((converted / total) * 100 * 10) / 10 : 0 });
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [academyId, isDemo]);

  useEffect(() => {
    if (!academyLoading) fetchData();
  }, [academyLoading, fetchData]);

  if (loading || academyLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  const maxInquiries = Math.max(...monthlyData.map((d) => d.inquiries), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">전환율 분석</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryCard label="총 문의" value={summary.total} />
        <SummaryCard label="체험수업 전환" value={summary.converted} />
        <SummaryCard label="전환율" value={`${summary.rate}%`} highlight />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">월별 추이 (최근 6개월)</h2>
        <div className="space-y-3">
          {monthlyData.map((d, i) => {
            const prev = monthlyData[i - 1];
            const diff = prev ? d.rate - prev.rate : 0;
            return (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 shrink-0">{formatMonth(d.month)}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-6 bg-gray-50 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-primary-100 rounded-full"
                      style={{ width: `${(d.inquiries / maxInquiries) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 left-0 h-full bg-primary-500 rounded-full"
                      style={{ width: `${(d.reservations / maxInquiries) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-20 text-right">
                    {d.reservations}/{d.inquiries}건
                  </span>
                </div>
                <div className="flex items-center gap-1 w-20 justify-end">
                  <span className="text-sm font-semibold text-gray-900">{d.rate}%</span>
                  {diff > 0 && <ArrowUpRight size={14} className="text-green-500" />}
                  {diff < 0 && <ArrowDownRight size={14} className="text-red-500" />}
                  {diff === 0 && i > 0 && <Minus size={14} className="text-gray-300" />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary-100" /> 문의</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary-500" /> 체험수업 전환</span>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">인사이트</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          {monthlyData.length >= 2 && (
            <Insight data={monthlyData} />
          )}
          {summary.rate > 0 && (
            <li className="flex items-start gap-2">
              <TrendingUp size={16} className="text-primary-500 shrink-0 mt-0.5" />
              <span>
                전체 기간 평균 전환율은 <strong>{summary.rate}%</strong>입니다.
                {summary.rate >= 20 ? ' 우수한 성과입니다!' : summary.rate >= 10 ? ' 양호한 수준입니다.' : ' 체험수업 안내를 더 적극적으로 해보세요.'}
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-primary-200 bg-primary-50' : 'border-gray-100 bg-white'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-primary-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function Insight({ data }: { data: MonthlyData[] }) {
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  const diff = latest.rate - prev.rate;
  if (Math.abs(diff) < 0.5) {
    return (
      <li className="flex items-start gap-2">
        <Minus size={16} className="text-gray-400 shrink-0 mt-0.5" />
        <span>이번 달 전환율이 지난 달과 비슷합니다.</span>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2">
      {diff > 0 ? (
        <ArrowUpRight size={16} className="text-green-500 shrink-0 mt-0.5" />
      ) : (
        <ArrowDownRight size={16} className="text-red-500 shrink-0 mt-0.5" />
      )}
      <span>
        이번 달 전환율이 지난 달 대비 <strong>{Math.abs(diff).toFixed(1)}%p</strong> {diff > 0 ? '상승' : '하락'}했습니다.
      </span>
    </li>
  );
}

function formatMonth(m: string) {
  const [y, mon] = m.split('-');
  return `${y.slice(2)}.${mon}`;
}
