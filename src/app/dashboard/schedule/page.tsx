'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, X, Clock, Loader2, CalendarDays, ChevronLeft, ChevronRight,
  CalendarRange, Pencil,
} from 'lucide-react';
import { useAcademy } from '@/hooks/useAcademy';
import { apiFetch } from '@/lib/api-client';
import type { Subject, ScheduleTerm, ScheduleRow } from '@/types';

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

const DAY_COLORS: Record<string, string> = {
  '월': 'bg-blue-100 text-blue-700',
  '화': 'bg-orange-100 text-orange-700',
  '수': 'bg-green-100 text-green-700',
  '목': 'bg-purple-100 text-purple-700',
  '금': 'bg-pink-100 text-pink-700',
  '토': 'bg-yellow-100 text-yellow-700',
};

// 수업별 색상 팔레트 (Tailwind purge 대비 풀 클래스 문자열로 고정)
const CLASS_COLORS: Record<string, { block: string; dot: string; label: string }> = {
  blue:    { block: 'bg-blue-100 border-blue-300 text-blue-800',       dot: 'bg-blue-400',    label: '파랑' },
  emerald: { block: 'bg-emerald-100 border-emerald-300 text-emerald-800', dot: 'bg-emerald-400', label: '초록' },
  violet:  { block: 'bg-violet-100 border-violet-300 text-violet-800',  dot: 'bg-violet-400',  label: '보라' },
  amber:   { block: 'bg-amber-100 border-amber-300 text-amber-900',     dot: 'bg-amber-400',   label: '노랑' },
  rose:    { block: 'bg-rose-100 border-rose-300 text-rose-800',        dot: 'bg-rose-400',    label: '분홍' },
  sky:     { block: 'bg-sky-100 border-sky-300 text-sky-800',           dot: 'bg-sky-400',     label: '하늘' },
  orange:  { block: 'bg-orange-100 border-orange-300 text-orange-800',  dot: 'bg-orange-400',  label: '주황' },
  slate:   { block: 'bg-slate-100 border-slate-300 text-slate-700',     dot: 'bg-slate-400',   label: '회색' },
};
const CLASS_COLOR_KEYS = Object.keys(CLASS_COLORS);
const colorOf = (key: string | null) => CLASS_COLORS[key || 'blue'] || CLASS_COLORS.blue;

// 시간표 세로 스케일 (분당 px)
const PX_PER_MIN = 0.8;
function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
// 한 요일의 수업들을 겹침 단위로 묶어 칼럼(lane) 배치 → 나란히 표시
function layoutDay(events: ScheduleRow[]) {
  const evs = events
    .map((e) => ({ ev: e, s: toMin(e.time_start), e2: toMin(e.time_end), col: 0, cols: 1 }))
    .sort((a, b) => a.s - b.s || a.e2 - b.e2);
  let i = 0;
  while (i < evs.length) {
    let j = i;
    let clusterEnd = evs[i].e2;
    const cluster = [evs[i]];
    while (j + 1 < evs.length && evs[j + 1].s < clusterEnd) {
      j++;
      cluster.push(evs[j]);
      clusterEnd = Math.max(clusterEnd, evs[j].e2);
    }
    const colEnds: number[] = [];
    for (const ev of cluster) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= ev.s) { colEnds[c] = ev.e2; ev.col = c; placed = true; break; }
      }
      if (!placed) { ev.col = colEnds.length; colEnds.push(ev.e2); }
    }
    for (const ev of cluster) ev.cols = colEnds.length;
    i = j + 1;
  }
  return evs;
}

// 기간별 색상 (달력 라벨용)
const TERM_PALETTE = [
  { bar: 'bg-primary-500', chip: 'bg-primary-50 text-primary-700 border-primary-200', soft: 'bg-primary-50' },
  { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', soft: 'bg-emerald-50' },
  { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', soft: 'bg-amber-50' },
  { bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200', soft: 'bg-rose-50' },
  { bar: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-200', soft: 'bg-violet-50' },
];

// ===== 날짜 유틸 (로컬 기준, UTC 변환 없이 YYYY-MM-DD) =====
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 월=0 ... 일=6
  return addDays(x, -dow);
}
function monthWeeks(year: number, month0: number): Date[][] {
  const last = new Date(year, month0 + 1, 0);
  let cur = mondayOf(new Date(year, month0, 1));
  const weeks: Date[][] = [];
  while (cur <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cur, i)));
    cur = addDays(cur, 7);
  }
  return weeks;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function termForDateStr(dateStr: string, terms: ScheduleTerm[]): ScheduleTerm | null {
  return terms.find((t) => t.start_date <= dateStr && dateStr <= t.end_date) || null;
}
// 한 주(월요일 기준)에 가장 많은 날이 걸친 기간을 그 주의 기간으로 본다 (학기↔방학 경계 주 처리)
function termForWeek(mondayStr: string, terms: ScheduleTerm[]): ScheduleTerm | null {
  const monday = parseYmd(mondayStr);
  const counts = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const t = termForDateStr(ymd(addDays(monday, i)), terms);
    if (t) counts.set(t.id, (counts.get(t.id) || 0) + 1);
  }
  if (counts.size === 0) return null;
  let bestId: string | null = null, best = 0;
  for (const [id, c] of counts) if (c > best) { best = c; bestId = id; }
  return terms.find((t) => t.id === bestId) || null;
}
function fmtRange(start: string, end: string): string {
  const f = (s: string) => {
    const [, m, d] = s.split('-');
    return `${Number(m)}/${Number(d)}`;
  };
  return `${f(start)}~${f(end)}`;
}
function weekLabel(monday: Date): string {
  // 해당 월의 몇째 주인지
  const first = new Date(monday.getFullYear(), monday.getMonth(), 1);
  const week = Math.floor((monday.getDate() + ((first.getDay() + 6) % 7) - 1) / 7) + 1;
  return `${monday.getMonth() + 1}월 ${week}주차`;
}

interface SlotForm {
  id?: string;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  teacher: string;
  room: string;
  color: string;
}
interface TermForm {
  id?: string;
  name: string;
  start_date: string;
  end_date: string;
}
interface TrialForm {
  subject_id: string;
  date: string;
  time_start: string;
  time_end: string;
}

const emptySlotForm: SlotForm = { subject: '', day: '월', startTime: '15:00', endTime: '16:00', teacher: '', room: '', color: 'blue' };
const emptyTermForm: TermForm = { name: '', start_date: '', end_date: '' };
const emptyTrialForm: TrialForm = { subject_id: '', date: '', time_start: '15:00', time_end: '16:00' };

// 데모용 mock 데이터
const today = new Date();
const mockTerms: ScheduleTerm[] = [
  { id: 'demo-term-1', academy_id: 'demo', name: '정규 학기', start_date: `${today.getFullYear()}-01-01`, end_date: `${today.getFullYear()}-12-31` },
];
const mockSchedules: ScheduleRow[] = [
  { id: '1', academy_id: 'demo', term_id: 'demo-term-1', series_id: 's1', week_start: null, subject_id: null, subject_name: '초등 수학 기초반', day_of_week: '월', time_start: '15:00:00', time_end: '16:00:00', teacher: '김수학', room: '1교실', color: 'emerald' },
  { id: '2', academy_id: 'demo', term_id: 'demo-term-1', series_id: 's1', week_start: null, subject_id: null, subject_name: '초등 수학 기초반', day_of_week: '수', time_start: '15:00:00', time_end: '16:00:00', teacher: '김수학', room: '1교실', color: 'emerald' },
  { id: '4', academy_id: 'demo', term_id: 'demo-term-1', series_id: 's2', week_start: null, subject_id: null, subject_name: '중등 수학 심화반', day_of_week: '화', time_start: '17:00:00', time_end: '19:00:00', teacher: '박수학', room: '2교실', color: 'violet' },
];

export default function SchedulePage() {
  const { academyId, isDemo, loading: academyLoading } = useAcademy();

  const [tab, setTab] = useState<'timetable' | 'trial'>('timetable');

  // ===== 정규 시간표 (기간 + 달력) =====
  const [terms, setTerms] = useState<ScheduleTerm[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null); // 월요일 ymd

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState<SlotForm>(emptySlotForm);
  const [editScope, setEditScope] = useState<'one' | 'future'>('one');
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');

  const [showTermModal, setShowTermModal] = useState(false);
  const [termForm, setTermForm] = useState<TermForm>(emptyTermForm);
  const [termSaving, setTermSaving] = useState(false);

  // 기간별 색상 인덱스
  const termColorIndex = useMemo(() => {
    const map: Record<string, number> = {};
    terms.forEach((t, i) => { map[t.id] = i % TERM_PALETTE.length; });
    return map;
  }, [terms]);

  // ===== 체험수업 슬롯 =====
  const [trialSlots, setTrialSlots] = useState<TrialSlotRow[]>([]);
  const [trialLoading, setTrialLoading] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialForm, setTrialForm] = useState<TrialForm>(emptyTrialForm);
  const [trialSaving, setTrialSaving] = useState(false);

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

  const fetchTerms = useCallback(async () => {
    if (isDemo) {
      setTerms(mockTerms);
      setSchedules(mockSchedules);
      return;
    }
    if (!academyId) return;
    try {
      setScheduleLoading(true);
      const [termsRes, schedRes] = await Promise.all([
        apiFetch(`/api/schedule-terms?academy_id=${academyId}`),
        apiFetch(`/api/schedules?academy_id=${academyId}`),
      ]);
      const termsJson = await termsRes.json();
      const schedJson = await schedRes.json();
      if (termsRes.ok && termsJson.data) setTerms(termsJson.data);
      if (schedRes.ok && schedJson.data) setSchedules(schedJson.data);
    } catch (error) {
      console.error('Failed to fetch terms/schedules:', error);
    } finally {
      setScheduleLoading(false);
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
    if (!academyLoading && (academyId || isDemo)) {
      fetchSubjects();
      fetchTerms();
      fetchTrialSlots();
    }
  }, [academyLoading, academyId, isDemo, fetchSubjects, fetchTerms, fetchTrialSlots]);

  // 달력 주 목록
  const weeks = useMemo(() => monthWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

  // 현재 선택된 주 (파생): 사용자가 고른 주가 현재 달에 있으면 그걸, 아니면 오늘이 포함된 주(없으면 첫 주)
  const activeWeek = useMemo(() => {
    if (selectedWeek && weeks.some((w) => ymd(w[0]) === selectedWeek)) return selectedWeek;
    const todayStr = ymd(today);
    const match = weeks.find((w) => w.some((d) => ymd(d) === todayStr));
    return ymd((match || weeks[0])[0]);
  }, [selectedWeek, weeks]);

  const selectedTerm = termForWeek(activeWeek, terms);
  // 실제 모드: 선택한 주(week_start)의 수업만 / 데모: 기간 전체(단일 주처럼)
  const selectedSchedules = useMemo(() => {
    if (isDemo) return selectedTerm ? schedules.filter((s) => s.term_id === selectedTerm.id) : [];
    return schedules.filter((s) => s.week_start === activeWeek);
  }, [isDemo, selectedTerm, schedules, activeWeek]);

  // 편집 중인 수업에 "이후 주" occurrence가 있는지 (있을 때만 범위 선택 노출)
  const editingHasFuture = useMemo(() => {
    if (!slotForm.id) return false;
    const cur = schedules.find((s) => s.id === slotForm.id);
    if (!cur?.series_id || !cur.week_start) return false;
    return schedules.some((s) => s.series_id === cur.series_id && s.week_start && s.week_start > cur.week_start!);
  }, [slotForm.id, schedules]);

  const subjectNames = subjects.length > 0
    ? subjects.map((s) => s.name)
    : ['초등 수학 기초반', '중등 수학 심화반', '초등 영어 회화반'];

  // 선택 주 시간표의 시간 범위 (블록 세로 채우기용)
  const gridWindow = useMemo(() => {
    if (selectedSchedules.length === 0) return { start: 9 * 60, end: 21 * 60 };
    const starts = selectedSchedules.map((s) => toMin(s.time_start));
    const ends = selectedSchedules.map((s) => toMin(s.time_end));
    return {
      start: Math.floor(Math.min(...starts) / 60) * 60,
      end: Math.ceil(Math.max(...ends) / 60) * 60,
    };
  }, [selectedSchedules]);

  // ===== 정규 시간표 핸들러 =====
  function openNewSlot() {
    setSlotForm(emptySlotForm);
    setEditScope('one');
    setShowSlotModal(true);
  }
  function openEditSlot(s: ScheduleRow) {
    setSlotForm({
      id: s.id,
      subject: s.subject_name,
      day: s.day_of_week,
      startTime: s.time_start.slice(0, 5),
      endTime: s.time_end.slice(0, 5),
      teacher: s.teacher || '',
      room: s.room || '',
      color: s.color || 'blue',
    });
    setEditScope('one');
    setShowSlotModal(true);
  }

  async function handleSaveSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTerm) return;
    if (isDemo) {
      if (slotForm.id) {
        setSchedules((prev) => prev.map((s) => s.id === slotForm.id ? {
          ...s, subject_name: slotForm.subject, day_of_week: slotForm.day,
          time_start: slotForm.startTime + ':00', time_end: slotForm.endTime + ':00',
          teacher: slotForm.teacher, room: slotForm.room, color: slotForm.color,
        } : s));
      } else {
        setSchedules((prev) => [...prev, {
          id: Date.now().toString(), academy_id: 'demo', term_id: selectedTerm.id, series_id: Date.now().toString(),
          week_start: null, subject_id: null,
          subject_name: slotForm.subject, day_of_week: slotForm.day,
          time_start: slotForm.startTime + ':00', time_end: slotForm.endTime + ':00',
          teacher: slotForm.teacher, room: slotForm.room, color: slotForm.color,
        }]);
      }
      setShowSlotModal(false);
      setSlotForm(emptySlotForm);
      return;
    }
    try {
      const res = slotForm.id
        ? await apiFetch('/api/schedules', {
            method: 'PATCH',
            body: JSON.stringify({
              id: slotForm.id,
              scope: editScope,
              subject_name: slotForm.subject,
              day_of_week: slotForm.day,
              time_start: slotForm.startTime,
              time_end: slotForm.endTime,
              teacher: slotForm.teacher,
              room: slotForm.room,
              color: slotForm.color,
            }),
          })
        : await apiFetch('/api/schedules', {
            method: 'POST',
            body: JSON.stringify({
              academy_id: academyId,
              term_id: selectedTerm.id,
              subject_name: slotForm.subject,
              day_of_week: slotForm.day,
              time_start: slotForm.startTime,
              time_end: slotForm.endTime,
              teacher: slotForm.teacher,
              room: slotForm.room,
              color: slotForm.color,
            }),
          });
      if (res.ok) {
        await fetchTerms();
        setShowSlotModal(false);
        setSlotForm(emptySlotForm);
      }
    } catch (error) {
      console.error('Failed to save schedule:', error);
    }
  }

  async function handleDeleteSlot(id: string, scope: 'one' | 'future' = 'one') {
    if (isDemo) {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    try {
      await apiFetch(`/api/schedules?id=${id}&scope=${scope}`, { method: 'DELETE' });
      await fetchTerms();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  }

  // ===== 기간 핸들러 =====
  function openNewTerm() {
    setTermForm(emptyTermForm);
    setShowTermModal(true);
  }
  function openEditTerm(t: ScheduleTerm) {
    setTermForm({ id: t.id, name: t.name, start_date: t.start_date, end_date: t.end_date });
    setShowTermModal(true);
  }

  async function handleSaveTerm(e: React.FormEvent) {
    e.preventDefault();
    if (!termForm.name || !termForm.start_date || !termForm.end_date) return;
    if (termForm.start_date > termForm.end_date) {
      alert('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }
    if (isDemo) {
      if (termForm.id) {
        setTerms((prev) => prev.map((t) => t.id === termForm.id ? { ...t, ...termForm } as ScheduleTerm : t));
      } else {
        setTerms((prev) => [...prev, { ...termForm, id: Date.now().toString(), academy_id: 'demo' } as ScheduleTerm]);
      }
      setShowTermModal(false);
      return;
    }
    try {
      setTermSaving(true);
      const method = termForm.id ? 'PATCH' : 'POST';
      const res = await apiFetch('/api/schedule-terms', {
        method,
        body: JSON.stringify({ academy_id: academyId, ...termForm }),
      });
      if (res.ok) {
        await fetchTerms();
        setShowTermModal(false);
      } else {
        const j = await res.json();
        alert(j.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save term:', error);
    } finally {
      setTermSaving(false);
    }
  }

  async function handleDeleteTerm(t: ScheduleTerm) {
    if (!confirm(`'${t.name}' 기간을 삭제하시겠습니까?\n이 기간의 시간표도 함께 삭제됩니다.`)) return;
    if (isDemo) {
      setTerms((prev) => prev.filter((x) => x.id !== t.id));
      setSchedules((prev) => prev.filter((s) => s.term_id !== t.id));
      return;
    }
    try {
      await apiFetch(`/api/schedule-terms?id=${t.id}`, { method: 'DELETE' });
      await fetchTerms();
    } catch (error) {
      console.error('Failed to delete term:', error);
    }
  }

  // ===== 체험수업 슬롯 핸들러 =====
  async function handleAddTrialSlot(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) { setShowTrialModal(false); return; }
    try {
      setTrialSaving(true);
      const res = await apiFetch('/api/trial-slots', { method: 'POST', body: JSON.stringify(trialForm) });
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

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  if (academyLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  const todayStr = ymd(today);

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
            tab === 'timetable' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          정규 시간표
        </button>
        <button
          onClick={() => setTab('trial')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'trial' ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          체험수업 슬롯
        </button>
      </div>

      {/* ===== 정규 시간표 탭 ===== */}
      {tab === 'timetable' && (
        <>
          {/* 기간 칩 + 관리 버튼 */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {terms.length === 0 ? (
                <span className="text-sm text-gray-400">등록된 기간이 없습니다. 학기·방학 기간을 먼저 만들어주세요.</span>
              ) : (
                terms.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openEditTerm(t)}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${TERM_PALETTE[termColorIndex[t.id]].chip}`}
                    title="클릭하여 수정"
                  >
                    <span className={`w-2 h-2 rounded-full ${TERM_PALETTE[termColorIndex[t.id]].bar}`} />
                    {t.name}
                    <span className="text-[11px] opacity-60">{fmtRange(t.start_date, t.end_date)}</span>
                    <Pencil size={11} className="opacity-0 group-hover:opacity-60" />
                  </button>
                ))
              )}
            </div>
            <button
              onClick={openNewTerm}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
            >
              <CalendarRange size={16} />
              기간 추가
            </button>
          </div>

          {/* 월 달력 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-50" aria-label="이전 달">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-base font-bold text-gray-900">{viewYear}년 {viewMonth + 1}월</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-50" aria-label="다음 달">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-1 mb-1">
              <div />
              {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
                <div key={d} className={`text-center text-xs font-semibold py-1 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>

            {/* 주 단위 행 (클릭 가능) */}
            <div className="space-y-1">
              {weeks.map((week) => {
                const wkKey = ymd(week[0]);
                const term = termForWeek(wkKey, terms);
                const isSelected = activeWeek === wkKey;
                const palette = term ? TERM_PALETTE[termColorIndex[term.id]] : null;
                return (
                  <button
                    key={wkKey}
                    onClick={() => setSelectedWeek(wkKey)}
                    className={`w-full grid grid-cols-[64px_repeat(7,1fr)] gap-1 items-stretch rounded-lg transition-colors text-left ${
                      isSelected ? 'ring-2 ring-primary-400' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* 기간 라벨 */}
                    <div className="flex items-center pl-1">
                      {term ? (
                        <span className="flex items-center gap-1 min-w-0">
                          <span className={`w-1.5 h-8 rounded-full shrink-0 ${palette!.bar}`} />
                          <span className="text-[10px] leading-tight text-gray-500 truncate">{term.name}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300 pl-2">미설정</span>
                      )}
                    </div>
                    {week.map((d) => {
                      const inMonth = d.getMonth() === viewMonth;
                      const dStr = ymd(d);
                      const dow = (d.getDay() + 6) % 7;
                      const dayTerm = termForDateStr(dStr, terms);
                      const dayPalette = dayTerm ? TERM_PALETTE[termColorIndex[dayTerm.id]] : null;
                      return (
                        <div
                          key={dStr}
                          className={`h-12 rounded-md flex items-start justify-end p-1.5 text-xs ${
                            dayPalette ? dayPalette.soft : 'bg-gray-50/60'
                          } ${!inMonth ? 'opacity-30' : ''}`}
                        >
                          <span className={`${dStr === todayStr ? 'bg-primary-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : dow === 6 ? 'text-red-400' : dow === 5 ? 'text-blue-400' : 'text-gray-500'}`}>
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 선택한 주의 시간표 */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">
                {weekLabel(parseYmd(activeWeek))}
              </h3>
              {selectedTerm ? (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${TERM_PALETTE[termColorIndex[selectedTerm.id]].chip}`}>
                  {selectedTerm.name}
                </span>
              ) : (
                <span className="text-xs text-gray-400">이 주에 설정된 기간이 없습니다</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>시간표</button>
                <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>목록</button>
              </div>
              <button
                onClick={openNewSlot}
                disabled={!selectedTerm}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={selectedTerm ? '' : '먼저 이 주가 속한 기간을 만들어주세요'}
              >
                <Plus size={18} />
                시간 추가
              </button>
            </div>
          </div>

          {scheduleLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
          ) : !selectedTerm ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <CalendarRange size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm mb-3">선택한 주에 운영 기간이 없습니다.</p>
              <button onClick={openNewTerm} className="text-sm font-medium text-primary-600 hover:underline">기간 추가하기</button>
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <div className="min-w-[680px]">
                {/* 요일 헤더 */}
                <div className="grid grid-cols-[48px_repeat(6,1fr)] border-b border-gray-100">
                  <div />
                  {DAYS.map((day) => (
                    <div key={day} className="text-center py-2.5 text-sm font-semibold text-gray-700 border-l border-gray-50">{day}</div>
                  ))}
                </div>
                {/* 시간 본문 (블록을 시간대만큼 세로로 채움) */}
                <div
                  className="grid grid-cols-[48px_repeat(6,1fr)]"
                  style={{ height: (gridWindow.end - gridWindow.start) * PX_PER_MIN }}
                >
                  {/* 시간 눈금 */}
                  <div className="relative">
                    {Array.from({ length: (gridWindow.end - gridWindow.start) / 60 + 1 }, (_, i) => gridWindow.start / 60 + i).map((h) => (
                      <div key={h} className="absolute right-1 -translate-y-1/2 text-[10px] text-gray-400" style={{ top: (h * 60 - gridWindow.start) * PX_PER_MIN }}>
                        {String(h).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                  {/* 요일별 칼럼 */}
                  {DAYS.map((day) => {
                    const dayEvents = layoutDay(selectedSchedules.filter((s) => s.day_of_week === day));
                    return (
                      <div key={day} className="relative border-l border-gray-50">
                        {/* 정시 가로선 */}
                        {Array.from({ length: (gridWindow.end - gridWindow.start) / 60 + 1 }, (_, i) => i).map((i) => (
                          <div key={i} className="absolute left-0 right-0 border-t border-gray-50" style={{ top: i * 60 * PX_PER_MIN }} />
                        ))}
                        {dayEvents.map(({ ev, s, e2, col, cols }) => {
                          const c = colorOf(ev.color);
                          const h = (e2 - s) * PX_PER_MIN;
                          return (
                            <button
                              key={ev.id}
                              onClick={() => openEditSlot(ev)}
                              title="클릭하여 수정·삭제"
                              className={`absolute rounded-md border px-1.5 py-1 text-left overflow-hidden hover:brightness-95 transition ${c.block}`}
                              style={{
                                top: (s - gridWindow.start) * PX_PER_MIN + 1,
                                height: h - 2,
                                left: `calc(${(col * 100) / cols}% + 1px)`,
                                width: `calc(${100 / cols}% - 2px)`,
                              }}
                            >
                              <p className="text-[11px] font-semibold leading-tight truncate">{ev.subject_name}</p>
                              {h >= 34 && (
                                <p className="text-[10px] opacity-80 leading-tight truncate">{ev.time_start.slice(0, 5)}~{ev.time_end.slice(0, 5)}</p>
                              )}
                              {h >= 50 && (ev.teacher || ev.room) && (
                                <p className="text-[10px] opacity-70 leading-tight truncate">{[ev.teacher, ev.room].filter(Boolean).join(' · ')}</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSchedules.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                  <p className="text-gray-400 text-sm">등록된 시간표가 없습니다.</p>
                </div>
              ) : (
                [...selectedSchedules]
                  .sort((a, b) => {
                    const o = DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week);
                    return o !== 0 ? o : a.time_start.localeCompare(b.time_start);
                  })
                  .map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => openEditSlot(slot)}
                      className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between cursor-pointer hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${DAY_COLORS[slot.day_of_week]}`}>{slot.day_of_week}</span>
                        <div>
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorOf(slot.color).dot}`} />
                            {slot.subject_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                            <Clock size={14} />
                            {slot.time_start.slice(0, 5)}~{slot.time_end.slice(0, 5)}
                            <span className="text-gray-300">|</span>{slot.teacher}
                            <span className="text-gray-300">|</span>{slot.room}
                          </div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('이 주의 이 수업을 삭제하시겠습니까?')) handleDeleteSlot(slot.id, 'one'); }} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" aria-label="삭제">
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
              onClick={() => { setTrialForm(emptyTrialForm); setShowTrialModal(true); }}
              className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              <Plus size={18} />
              체험수업 슬롯 추가
            </button>
          </div>

          {isDemo ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400 text-sm">Supabase 연동 후 체험수업 슬롯을 관리할 수 있습니다.</p>
            </div>
          ) : trialLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
          ) : trialSlots.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400 text-sm">등록된 체험수업 슬롯이 없습니다. 슬롯을 추가해주세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trialSlots.map((slot) => (
                <div key={slot.id} className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center">
                      <CalendarDays size={18} className="text-accent-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{slot.subjects?.name || '과목 미정'}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                        <Clock size={14} />
                        {slot.date} {slot.time_start}~{slot.time_end}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${slot.is_available ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {slot.is_available ? '예약 가능' : '예약 완료'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteTrialSlot(slot.id)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" aria-label="삭제">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 기간 추가/수정 모달 */}
      {showTermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowTermModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{termForm.id ? '기간 수정' : '기간 추가'}</h2>
              <button onClick={() => setShowTermModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveTerm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">기간 이름 <span className="text-red-400">*</span></label>
                <input type="text" required value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} placeholder="예: 1학기 정규, 여름방학 특강" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작일 <span className="text-red-400">*</span></label>
                  <input type="date" required value={termForm.start_date} onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일 <span className="text-red-400">*</span></label>
                  <input type="date" required value={termForm.end_date} onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                {termForm.id ? (
                  <button type="button" onClick={() => { const t = terms.find((x) => x.id === termForm.id); if (t) { setShowTermModal(false); handleDeleteTerm(t); } }} className="text-sm font-medium text-red-500 hover:text-red-600">삭제</button>
                ) : <span />}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowTermModal(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
                  <button type="submit" disabled={termSaving} className="h-10 px-6 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50">
                    {termSaving ? <Loader2 size={16} className="animate-spin" /> : '저장'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 정규 시간표 추가 모달 */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSlotModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">{slotForm.id ? '시간 수정' : '시간 추가'}</h2>
              <button onClick={() => setShowSlotModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {selectedTerm && (
              <p className="text-xs text-gray-400 mb-4">
                {slotForm.id
                  ? `${selectedTerm.name} · ${weekLabel(parseYmd(activeWeek))} 수업 수정`
                  : `${selectedTerm.name} 기간 전체(매주)에 추가됩니다`}
              </p>
            )}
            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">과목 <span className="text-red-400">*</span></label>
                <select required value={slotForm.subject} onChange={(e) => setSlotForm({ ...slotForm, subject: e.target.value })} className={inputClass}>
                  <option value="">과목을 선택하세요</option>
                  {subjectNames.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">요일 <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  {DAYS.map((day) => (
                    <button key={day} type="button" onClick={() => setSlotForm({ ...slotForm, day })} className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${slotForm.day === day ? 'bg-primary-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{day}</button>
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
              {/* 색상 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">색상</label>
                <div className="flex gap-2 flex-wrap">
                  {CLASS_COLOR_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSlotForm({ ...slotForm, color: key })}
                      title={CLASS_COLORS[key].label}
                      className={`w-8 h-8 rounded-full ${CLASS_COLORS[key].dot} transition-transform ${slotForm.color === key ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>
              {/* 수정 범위 선택 (이후 주 occurrence가 있을 때만) */}
              {slotForm.id && editingHasFuture && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">적용 범위</label>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button type="button" onClick={() => setEditScope('one')} className={`flex-1 py-2 text-sm font-medium transition-colors ${editScope === 'one' ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>이 주만</button>
                    <button type="button" onClick={() => setEditScope('future')} className={`flex-1 py-2 text-sm font-medium transition-colors ${editScope === 'future' ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>이번 주 + 이후 전체</button>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                {slotForm.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      const id = slotForm.id!;
                      const scopeMsg = editingHasFuture && editScope === 'future' ? '이번 주와 이후 모든 주의' : '이 주의';
                      if (!confirm(`${scopeMsg} 이 수업을 삭제하시겠습니까?`)) return;
                      setShowSlotModal(false);
                      handleDeleteSlot(id, editingHasFuture ? editScope : 'one');
                    }}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={15} /> 삭제
                  </button>
                ) : <span />}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowSlotModal(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
                  <button type="submit" className="h-10 px-6 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">{slotForm.id ? '저장' : '추가하기'}</button>
                </div>
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
              <button onClick={() => setShowTrialModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTrialSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">과목 <span className="text-red-400">*</span></label>
                <select required value={trialForm.subject_id} onChange={(e) => setTrialForm({ ...trialForm, subject_id: e.target.value })} className={inputClass}>
                  <option value="">과목을 선택하세요</option>
                  {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜 <span className="text-red-400">*</span></label>
                <input type="date" required value={trialForm.date} onChange={(e) => setTrialForm({ ...trialForm, date: e.target.value })} className={inputClass} />
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
                <button type="button" onClick={() => setShowTrialModal(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
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
