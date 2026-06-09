'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarDays, Loader2, Plus, X, Trash2, Pencil, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { useAcademy } from '@/hooks/useAcademy';
import { apiFetch } from '@/lib/api-client';
import TimeSelect from '@/components/TimeSelect';
import type { ReservationStatus, Subject } from '@/types';

// ===== 날짜 유틸 (로컬 기준) =====
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  return addDays(x, -dow);
}
function monthDays(year: number, month0: number): Date[] {
  const last = new Date(year, month0 + 1, 0);
  let cur = mondayOf(new Date(year, month0, 1));
  const out: Date[] = [];
  while (cur <= last) { out.push(cur); cur = addDays(cur, 1); }
  return out;
}
const today = new Date();

interface ReservationRow {
  id: string;
  parent_name: string;
  parent_phone: string | null;
  child_name: string | null;
  child_grade: string | null;
  status: ReservationStatus;
  created_at: string;
  trial_slots?: {
    id: string;
    subject_id: string;
    date: string;
    time_start: string;
    time_end: string;
    subjects?: { name: string };
  };
}

const mockReservations: ReservationRow[] = [
  { id: '1', parent_name: '김○○', parent_phone: '010-1111-2222', child_name: '김민준', child_grade: '초3', status: 'confirmed', created_at: '2026-05-30T10:00:00Z', trial_slots: { id: 'm1', subject_id: 's1', date: '2026-05-30', time_start: '15:30', time_end: '17:00', subjects: { name: '수학' } } },
  { id: '2', parent_name: '이○○', parent_phone: '010-3333-4444', child_name: '이서연', child_grade: '중1', status: 'pending', created_at: '2026-05-31T10:00:00Z', trial_slots: { id: 'm2', subject_id: 's1', date: '2026-05-31', time_start: '17:00', time_end: '18:30', subjects: { name: '영어' } } },
];

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '대기 중', cls: 'bg-yellow-50 text-yellow-600' },
  confirmed: { label: '확정', cls: 'bg-green-50 text-green-600' },
  cancelled: { label: '취소', cls: 'bg-red-50 text-red-500' },
  completed: { label: '완료', cls: 'bg-gray-50 text-gray-500' },
};

// 캘린더 예약 칩 색상 (상태별)
const statusChip: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  confirmed: 'bg-green-100 text-green-700 hover:bg-green-200',
  cancelled: 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200',
  completed: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
};

interface ResvForm {
  id?: string;
  parent_name: string;
  parent_phone: string;
  child_name: string;
  child_grade: string;
  subject_id: string;
  slot_date: string;
  slot_time_start: string;
  slot_time_end: string;
  status: ReservationStatus;
}

const emptyForm: ResvForm = {
  parent_name: '', parent_phone: '', child_name: '', child_grade: '',
  subject_id: '', slot_date: '', slot_time_start: '15:00', slot_time_end: '16:00', status: 'pending',
};

export default function ReservationsPage() {
  const { academyId, isDemo, loading: academyLoading } = useAcademy();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ResvForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const days = useMemo(() => monthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const resvByDate = useMemo(() => {
    const m = new Map<string, ReservationRow[]>();
    for (const r of reservations) {
      const d = r.trial_slots?.date;
      if (!d) continue;
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(r);
    }
    return m;
  }, [reservations]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  const fetchReservations = useCallback(async () => {
    if (isDemo) {
      setReservations(mockReservations);
      setLoading(false);
      return;
    }
    if (!academyId) return;
    try {
      setLoading(true);
      const [resvRes, subjRes] = await Promise.all([
        apiFetch(`/api/reservations?academy_id=${academyId}`),
        apiFetch(`/api/subjects?academy_id=${academyId}`),
      ]);
      const resvJson = await resvRes.json();
      const subjJson = await subjRes.json();
      if (resvRes.ok && resvJson.data) setReservations(resvJson.data);
      if (subjRes.ok && subjJson.data) setSubjects(subjJson.data);
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    } finally {
      setLoading(false);
    }
  }, [academyId, isDemo]);

  useEffect(() => {
    if (!academyLoading) fetchReservations();
  }, [academyLoading, fetchReservations]);

  // ESC 로 모달 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowModal(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function handleStatusChange(id: string, status: ReservationStatus) {
    if (isDemo) {
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      return;
    }
    try {
      setUpdating(id);
      const res = await apiFetch('/api/reservations', { method: 'PATCH', body: JSON.stringify({ id, status }) });
      if (res.ok) await fetchReservations();
    } catch (error) {
      console.error('Failed to update reservation:', error);
    } finally {
      setUpdating(null);
    }
  }

  function openNew(date?: string) {
    setForm({ ...emptyForm, subject_id: subjects[0]?.id || '', slot_date: date || '' });
    setShowModal(true);
  }
  function openEdit(r: ReservationRow) {
    setForm({
      id: r.id,
      parent_name: r.parent_name,
      parent_phone: r.parent_phone || '',
      child_name: r.child_name || '',
      child_grade: r.child_grade || '',
      subject_id: r.trial_slots?.subject_id || subjects[0]?.id || '',
      slot_date: r.trial_slots?.date || '',
      slot_time_start: r.trial_slots?.time_start?.slice(0, 5) || '15:00',
      slot_time_end: r.trial_slots?.time_end?.slice(0, 5) || '16:00',
      status: r.status,
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.parent_name.trim()) { alert('학부모 이름을 입력해주세요.'); return; }
    if (!form.subject_id) { alert('과목을 선택해주세요. (설정 > 과목에서 먼저 등록)'); return; }
    if (!form.slot_date) { alert('날짜를 선택해주세요.'); return; }
    if (form.slot_time_start >= form.slot_time_end) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다. 시간을 다시 확인해주세요.');
      return;
    }
    if (isDemo) { setShowModal(false); return; }

    try {
      setSaving(true);
      const payload = {
        academy_id: academyId,
        parent_name: form.parent_name,
        parent_phone: form.parent_phone || null,
        child_name: form.child_name || null,
        child_grade: form.child_grade || null,
        subject_id: form.subject_id,
        slot_date: form.slot_date,
        slot_time_start: form.slot_time_start,
        slot_time_end: form.slot_time_end,
        status: form.status,
      };
      const res = form.id
        ? await apiFetch('/api/reservations', { method: 'PATCH', body: JSON.stringify({ id: form.id, ...payload }) })
        : await apiFetch('/api/reservations', { method: 'POST', body: JSON.stringify(payload) });
      if (res.ok) {
        await fetchReservations();
        setShowModal(false);
      } else {
        const j = await res.json();
        alert(j.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save reservation:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 예약을 삭제하시겠습니까?')) return;
    if (isDemo) {
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setShowModal(false);
      return;
    }
    try {
      const res = await apiFetch(`/api/reservations?id=${id}`, { method: 'DELETE' });
      if (res.ok) { await fetchReservations(); setShowModal(false); }
    } catch (error) {
      console.error('Failed to delete reservation:', error);
    }
  }

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  if (loading || academyLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">예약 관리</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <List size={16} /> 목록
            </button>
            <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <CalendarDays size={16} /> 캘린더
            </button>
          </div>
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            <Plus size={18} />
            예약 추가
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-50" aria-label="이전 달"><ChevronLeft size={20} /></button>
            <h2 className="text-base font-bold text-gray-900">{viewYear}년 {viewMonth + 1}월</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-50" aria-label="다음 달"><ChevronRight size={20} /></button>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 mb-1">
                {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
                  <div key={d} className={`text-center text-xs font-semibold py-1 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => {
                  const dStr = ymd(d);
                  const inMonth = d.getMonth() === viewMonth;
                  const dow = (d.getDay() + 6) % 7;
                  const dayResvs = resvByDate.get(dStr) || [];
                  return (
                    <div
                      key={dStr}
                      onClick={() => openNew(dStr)}
                      className={`min-h-[92px] rounded-md border border-gray-100 p-1 cursor-pointer hover:bg-gray-50 transition-colors ${!inMonth ? 'opacity-40' : ''}`}
                      title="클릭하여 이 날짜에 예약 추가"
                    >
                      <div className={`text-xs font-medium px-1 ${dStr === ymd(today) ? 'text-primary-600' : dow === 6 ? 'text-red-400' : dow === 5 ? 'text-blue-400' : 'text-gray-500'}`}>
                        {d.getDate()}
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {dayResvs.slice(0, 4).map((r) => (
                          <button
                            key={r.id}
                            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                            className={`w-full text-left text-[10px] leading-tight rounded px-1 py-0.5 truncate transition-colors ${statusChip[r.status] || 'bg-gray-100 text-gray-600'}`}
                            title={`${r.parent_name} · ${r.trial_slots?.subjects?.name || ''} ${statusMap[r.status]?.label || ''}`}
                          >
                            {r.trial_slots?.time_start?.slice(0, 5)} {r.trial_slots?.subjects?.name || r.parent_name}
                          </button>
                        ))}
                        {dayResvs.length > 4 && (
                          <div className="text-[10px] text-gray-400 px-1">+{dayResvs.length - 4}건</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* 범례 */}
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100" /> 대기</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100" /> 확정</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100" /> 완료</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100" /> 취소</span>
          </div>
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm mb-3">예약 내역이 없습니다.</p>
          <button onClick={() => openNew()} className="text-sm font-medium text-primary-600 hover:underline">예약 추가하기</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">학부모</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">학생</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">과목</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">날짜 / 시간</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservations.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-gray-900 font-medium">
                    {res.parent_name}
                    {res.parent_phone && <span className="block text-xs text-gray-400 font-normal">{res.parent_phone}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {res.child_name || '-'} {res.child_grade ? `(${res.child_grade})` : ''}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{res.trial_slots?.subjects?.name || '-'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {res.trial_slots ? (
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-gray-400" />
                        {res.trial_slots.date} {res.trial_slots.time_start?.slice(0, 5)}~{res.trial_slots.time_end?.slice(0, 5)}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMap[res.status]?.cls || ''}`}>
                      {statusMap[res.status]?.label || res.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2 items-center">
                      {res.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatusChange(res.id, 'confirmed')} disabled={updating === res.id} className="text-xs px-3 py-1 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50">
                            {updating === res.id ? '...' : '확정'}
                          </button>
                          <button onClick={() => handleStatusChange(res.id, 'cancelled')} disabled={updating === res.id} className="text-xs px-3 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                            취소
                          </button>
                        </>
                      )}
                      <button onClick={() => openEdit(res)} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="수정">
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 예약 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{form.id ? '예약 수정' : '예약 추가'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학부모 이름 <span className="text-red-400">*</span></label>
                  <input type="text" required value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} placeholder="예: 김미영" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                  <input type="tel" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="010-1234-5678" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학생 이름</label>
                  <input type="text" value={form.child_name} onChange={(e) => setForm({ ...form, child_name: e.target.value })} placeholder="예: 김민준" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                  <input type="text" value={form.child_grade} onChange={(e) => setForm({ ...form, child_grade: e.target.value })} placeholder="예: 초3" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">과목 <span className="text-red-400">*</span></label>
                <select required value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className={inputClass}>
                  <option value="">과목을 선택하세요</option>
                  {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜 <span className="text-red-400">*</span></label>
                <input type="date" required value={form.slot_date} onChange={(e) => setForm({ ...form, slot_date: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <TimeSelect value={form.slot_time_start} onChange={(v) => setForm({ ...form, slot_time_start: v })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <TimeSelect value={form.slot_time_end} onChange={(v) => setForm({ ...form, slot_time_end: v })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ReservationStatus })} className={inputClass}>
                  <option value="pending">대기 중</option>
                  <option value="confirmed">확정</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
              <div className="flex justify-between items-center pt-2">
                {form.id ? (
                  <button type="button" onClick={() => handleDelete(form.id!)} className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600">
                    <Trash2 size={15} /> 삭제
                  </button>
                ) : <span />}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
                  <button type="submit" disabled={saving} className="h-10 px-6 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : (form.id ? '저장' : '추가하기')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
