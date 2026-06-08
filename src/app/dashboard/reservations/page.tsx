'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { useAcademy } from '@/hooks/useAcademy';
import { apiFetch } from '@/lib/api-client';
import type { ReservationStatus } from '@/types';

interface ReservationRow {
  id: string;
  parent_name: string;
  child_name: string | null;
  child_grade: string | null;
  status: ReservationStatus;
  created_at: string;
  // join된 데이터
  trial_slots?: {
    date: string;
    time_start: string;
    time_end: string;
    subjects?: { name: string };
  };
}

const mockReservations: ReservationRow[] = [
  {
    id: '1',
    parent_name: '김○○',
    child_name: '김민준',
    child_grade: '초3',
    status: 'confirmed',
    created_at: '2026-05-30T10:00:00Z',
    trial_slots: { date: '2026-05-30', time_start: '15:30', time_end: '17:00', subjects: { name: '수학' } },
  },
  {
    id: '2',
    parent_name: '이○○',
    child_name: '이서연',
    child_grade: '중1',
    status: 'pending',
    created_at: '2026-05-31T10:00:00Z',
    trial_slots: { date: '2026-05-31', time_start: '17:00', time_end: '18:30', subjects: { name: '영어' } },
  },
  {
    id: '3',
    parent_name: '박○○',
    child_name: '박지호',
    child_grade: '초5',
    status: 'cancelled',
    created_at: '2026-06-02T10:00:00Z',
    trial_slots: { date: '2026-06-02', time_start: '15:30', time_end: '17:00', subjects: { name: '국어' } },
  },
];

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '대기 중', cls: 'bg-yellow-50 text-yellow-600' },
  confirmed: { label: '확정', cls: 'bg-green-50 text-green-600' },
  cancelled: { label: '취소', cls: 'bg-red-50 text-red-500' },
  completed: { label: '완료', cls: 'bg-gray-50 text-gray-500' },
};

export default function ReservationsPage() {
  const { academyId, isDemo, loading: academyLoading } = useAcademy();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    if (isDemo) {
      setReservations(mockReservations);
      setLoading(false);
      return;
    }
    if (!academyId) return;

    try {
      setLoading(true);
      const res = await apiFetch(`/api/reservations?academy_id=${academyId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setReservations(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    } finally {
      setLoading(false);
    }
  }, [academyId, isDemo]);

  useEffect(() => {
    if (!academyLoading) fetchReservations();
  }, [academyLoading, fetchReservations]);

  async function handleStatusChange(id: string, status: ReservationStatus) {
    if (isDemo) {
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      return;
    }

    try {
      setUpdating(id);
      const res = await apiFetch('/api/reservations', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await fetchReservations();
    } catch (error) {
      console.error('Failed to update reservation:', error);
    } finally {
      setUpdating(null);
    }
  }

  if (loading || academyLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">예약 관리</h1>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">예약 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  학부모
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  학생
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  과목
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  날짜 / 시간
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  상태
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservations.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-gray-900 font-medium">
                    {res.parent_name}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {res.child_name || '-'} {res.child_grade ? `(${res.child_grade})` : ''}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {res.trial_slots?.subjects?.name || '-'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {res.trial_slots ? (
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-gray-400" />
                        {res.trial_slots.date} {res.trial_slots.time_start}~{res.trial_slots.time_end}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMap[res.status]?.cls || ''}`}
                    >
                      {statusMap[res.status]?.label || res.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {res.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(res.id, 'confirmed')}
                          disabled={updating === res.id}
                          className="text-xs px-3 py-1 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
                        >
                          {updating === res.id ? '...' : '확정'}
                        </button>
                        <button
                          onClick={() => handleStatusChange(res.id, 'cancelled')}
                          disabled={updating === res.id}
                          className="text-xs px-3 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          취소
                        </button>
                      </div>
                    )}
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
