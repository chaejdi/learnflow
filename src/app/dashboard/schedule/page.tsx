'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Clock, Loader2, CalendarDays } from 'lucide-react';
import { useAcademy } from '@/hooks/useAcademy';
import { apiFetch } from '@/lib/api-client';
import type { Subject } from '@/types';

// ===== 정규 시간표 (로컬 관리) =====
interface TimeSlot {
  id: string;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  teacher: string;
  room: string;
}

// ===== 체험수업 슬롯 (DB 연동) =====
interface TrialSlotRow {
  id: string;
  subject_id: string;
  date: string;
  time_start: string;
  time_end: string;
  is_available: boolean;
  subjects?: { id: string; name: string };
}

const DAYS = ['월', '화', '수', '목', '금', '토'];

const TIME_SLOTS = [
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
];

const mockSlots: TimeSlot[] = [
  { id: '1', subject: '초등 수학 기초반', day: '월', startTime: '15:00', endTime: '16:00', teacher: '김수학', room: '1교실' },
  { id: '2', subject: '초등 수학 기초반', day: '수', startTime: '15:00', endTime: '16:00', teacher: '김수학', room: '1교실' },
  { id: '3', subject: '초등 수학 기초반', day: '금', startTime: '15:00', endTime: '16:00', teacher: '김수학', room: '1교실' },
  { id: '4', subject: '중등 수학 심화반', day: '화', startTime: '17:00', endTime: '19:00', teacher: '박수학', room: '2교실' },
  { id: '5', subject: '중등 수학 심화반', day: '목', startTime: '17:00', endTime: '19:00', teacher: '박수학', room: '2교실' },
  { id: '6', subject: '초등 영어 회화반', day: '월', startTime: '16:30', endTime: '17:30', teacher: '이영어', room: '3교실' },
  { id: '7', subject: '초등 영어 회화반', day: '수', startTime: '16:30', endTime: '17:30', teacher: '이영어', room: '3교실' },
];

const DAY_COLORS: Record<string, string> = {
  '월': 'bg-blue-100 text-blue-700',
  '화': 'bg-orange-100 text-orange-700',
  '수': 'bg-green-100 text-green-700',
  '목': 'bg-purple-100 text-purple-700',
  '금': 'bg-pink-100 text-pink-700',
  '토': 'bg-yellow-100 text-yellow-700',
};

interface SlotForm {
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  teacher: string;
  room: string;
}

interface TrialForm {
  subject_id: string;
  date: string;
  time_start: string;
  time_end: string;
}

const emptySlotForm: SlotForm = {
  subject: '',
  day: '월',
  startTime: '15:00',
  endTime: '16:00',
  teacher: '',
  room: '',
};

const emptyTrialForm: TrialForm = {
  subject_id: '',
  date: '',
  time_start: '15:00',
  time_end: '16:00',
};

export default function SchedulePage() {
  const { academyId, isDemo, loading: academyLoading } = useAcademy();

  // 탭: timetable(정규 시간표) | trial(체험수업 슬롯)
  const [tab, setTab] = useState<'timetable' | 'trial'>('timetable');

  // 정규 시간표 state
  const [slots, setSlots] = useState<TimeSlot[]>(mockSlots);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState<SlotForm>(emptySlotForm);
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');

  // 체험수업 슬롯 state
  const [trialSlots, setTrialSlots] = useState<TrialSlotRow[]>([]);
  const [trialLoading, setTrialLoading] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialForm, setTrialForm] = useState<TrialForm>(emptyTrialForm);
  const [trialSaving, setTrialSaving] = useState(false);

  // 과목 목록 (API에서)
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const fetchSubjects = useCallback(async () => {
    if (isDemo || !academyId) return;
    try {
      const res = await apiFetch(`/api/subjects?academy_id=${academyId}`);
      const json = await res.json();
      if (res.ok && json.data) setSubjects(json.data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  }, [academyId, isDemo]);

  const fetchTrialSlots = useCallback(async () => {
    if (isDemo || !academyId) return;
    try {
      setTrialLoading(true);
      const res = await apiFetch(`/api/trial-slots?academy_id=${academyId}`);
      const json = await res.json();
      if (res.ok && json.data) setTrialSlots(json.data);
    } catch (error) {
      console.error('Failed to fetch trial slots:', error);
    } finally {
      setTrialLoading(false);
    }
  }, [academyId, isDemo]);

  useEffect(() => {
    if (!academyLoading && academyId) {
      fetchSubjects();
      fetchTrialSlots();
    }
  }, [academyLoading, academyId, fetchSubjects, fetchTrialSlots]);

  // 정규 시간표 핸들러
  function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    const newSlot: TimeSlot = { ...slotForm, id: Date.now().toString() };
    setSlots((prev) => [...prev, newSlot]);
    setShowSlotModal(false);
    setSlotForm(emptySlotForm);
  }

  function handleDeleteSlot(id: string) {
    if (!confirm('이 시간표를 삭제하시겠습니까?')) return;
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  function getSlotsForDayAndTime(day: string, time: string) {
    return slots.filter(
      (s) => s.day === day && s.startTime <= time && s.endTime > time
    );
  }

  // 체험수업 슬롯 핸들러
  async function handleAddTrialSlot(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) {
      setShowTrialModal(false);
      return;
    }

    try {
      setTrialSaving(true);
      const res = await apiFetch('/api/trial-slots', {
        method: 'POST',
        body: JSON.stringify(trialForm),
      });
      if (res.ok) {
        await fetchTrialSlots();
        setShowTrialModal(false);
        setTrialForm(emptyTrialForm);
      }
    } catch (error) {
      console.error('Failed to add trial slot:', error);
    } finally {
      setTrialSaving(false);
    }
  }

  async function handleDeleteTrialSlot(id: string) {
    if (!confirm('이 체험수업 슬롯을 삭제하시겠습니까?')) return;
    try {
      const res = await apiFetch(`/api/trial-slots?id=${id}`, { method: 'DELETE' });
      if (res.ok) await fetchTrialSlots();
    } catch (error) {
      console.error('Failed to delete trial slot:', error);
    }
  }

  const subjectNames = subjects.length > 0
    ? subjects.map((s) => s.name)
    : ['초등 수학 기초반', '중등 수학 심화반', '초등 영어 회화반'];

  const inputClass =
    'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  if (academyLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">시간표 관리</h1>
      </div>

      {/* 탭 전환 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('timetable')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'timetable'
              ? 'bg-primary-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          정규 시간표
        </button>
        <button
          onClick={() => setTab('trial')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'trial'
              ? 'bg-primary-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          체험수업 슬롯
        </button>
      </div>

      {/* ===== 정규 시간표 탭 ===== */}
      {tab === 'timetable' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                시간표
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                목록
              </button>
            </div>
            <button
              onClick={() => {
                setSlotForm(emptySlotForm);
                setShowSlotModal(true);
              }}
              className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              <Plus size={18} />
              시간 추가
            </button>
          </div>

          {viewMode === 'table' ? (
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-20 px-3 py-3 text-xs font-semibold text-gray-400 text-center">시간</th>
                    {DAYS.map((day) => (
                      <th key={day} className="px-3 py-3 text-sm font-semibold text-gray-700 text-center">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time) => (
                    <tr key={time} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-400 text-center">{time}</td>
                      {DAYS.map((day) => {
                        const cellSlots = getSlotsForDayAndTime(day, time);
                        return (
                          <td key={day} className="px-1 py-1 text-center">
                            {cellSlots.map((slot) =>
                              slot.startTime === time ? (
                                <div
                                  key={slot.id}
                                  className="bg-primary-50 text-primary-700 rounded-lg px-2 py-1.5 text-xs font-medium"
                                >
                                  <p className="truncate">{slot.subject}</p>
                                  <p className="text-primary-400 mt-0.5">
                                    {slot.teacher} · {slot.room}
                                  </p>
                                </div>
                              ) : null
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <p className="text-gray-400 text-sm">등록된 시간표가 없습니다.</p>
                </div>
              ) : (
                slots
                  .sort((a, b) => {
                    const dayOrder = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
                    if (dayOrder !== 0) return dayOrder;
                    return a.startTime.localeCompare(b.startTime);
                  })
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${DAY_COLORS[slot.day]}`}>
                          {slot.day}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{slot.subject}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                            <Clock size={14} />
                            {slot.startTime}~{slot.endTime}
                            <span className="text-gray-300">|</span>
                            {slot.teacher}
                            <span className="text-gray-300">|</span>
                            {slot.room}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        aria-label="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}
        </>
      )}

      {/* ===== 체험수업 슬롯 탭 ===== */}
      {tab === 'trial' && (
        <>
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={() => {
                setTrialForm(emptyTrialForm);
                setShowTrialModal(true);
              }}
              className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              <Plus size={18} />
              체험수업 슬롯 추가
            </button>
          </div>

          {isDemo ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400 text-sm">
                Supabase 연동 후 체험수업 슬롯을 관리할 수 있습니다.
              </p>
            </div>
          ) : trialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : trialSlots.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400 text-sm">
                등록된 체험수업 슬롯이 없습니다. 슬롯을 추가해주세요.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trialSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center">
                      <CalendarDays size={18} className="text-accent-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {slot.subjects?.name || '과목 미정'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                        <Clock size={14} />
                        {slot.date} {slot.time_start}~{slot.time_end}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                          slot.is_available
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-500'
                        }`}>
                          {slot.is_available ? '예약 가능' : '예약 완료'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTrialSlot(slot.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    aria-label="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 정규 시간표 추가 모달 */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSlotModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">시간 추가</h2>
              <button onClick={() => setShowSlotModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  과목 <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={slotForm.subject}
                  onChange={(e) => setSlotForm({ ...slotForm, subject: e.target.value })}
                  className={inputClass}
                >
                  <option value="">과목을 선택하세요</option>
                  {subjectNames.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  요일 <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSlotForm({ ...slotForm, day })}
                      className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                        slotForm.day === day
                          ? 'bg-primary-500 text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당 선생님</label>
                  <input type="text" value={slotForm.teacher} onChange={(e) => setSlotForm({ ...slotForm, teacher: e.target.value })} placeholder="예: 김수학" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">교실</label>
                  <input type="text" value={slotForm.room} onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })} placeholder="예: 1교실" className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSlotModal(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  취소
                </button>
                <button type="submit" className="h-10 px-6 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 체험수업 슬롯 추가 모달 */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowTrialModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">체험수업 슬롯 추가</h2>
              <button onClick={() => setShowTrialModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTrialSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  과목 <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={trialForm.subject_id}
                  onChange={(e) => setTrialForm({ ...trialForm, subject_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">과목을 선택하세요</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  날짜 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={trialForm.date}
                  onChange={(e) => setTrialForm({ ...trialForm, date: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <input type="time" value={trialForm.time_start} onChange={(e) => setTrialForm({ ...trialForm, time_start: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <input type="time" value={trialForm.time_end} onChange={(e) => setTrialForm({ ...trialForm, time_end: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowTrialModal(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  취소
                </button>
                <button type="submit" disabled={trialSaving} className="h-10 px-6 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50">
                  {trialSaving ? <Loader2 size={16} className="animate-spin" /> : '추가하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
