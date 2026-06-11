import type { SupabaseClient } from '@supabase/supabase-js';

// 이번 주 월요일(YYYY-MM-DD, 로컬)
function thisMondayStr(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7; // 월=0
  d.setDate(d.getDate() - dow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

const hhmm = (t: string) => (t ? t.slice(0, 5) : '');

/**
 * AI 가 "실제 빈 시간"을 안내할 수 있도록, 학원의 정규 시간표(이번 주)와
 * 이미 잡힌 체험 예약을 텍스트로 만들어 반환한다.
 */
export async function getAvailabilityContext(
  supabase: SupabaseClient,
  academyId: string
): Promise<{ scheduleText: string; bookedText: string }> {
  // 정규 시간표 (이번 주 기준 — 매주 반복되는 수업 시간)
  const { data: schedules } = await supabase
    .from('schedules')
    .select('day_of_week, time_start, time_end, subject_name')
    .eq('academy_id', academyId)
    .eq('week_start', thisMondayStr())
    .order('day_of_week')
    .order('time_start');

  const scheduleLines = (schedules ?? []).map(
    (s) => `- ${s.day_of_week} ${hhmm(s.time_start)}~${hhmm(s.time_end)} ${s.subject_name}`
  );

  // 이미 잡힌 체험 예약 (오늘 이후, 취소 제외) — 중복 예약 방지용
  const { data: reservations } = await supabase
    .from('reservations')
    .select('status, trial_slots(date, time_start, time_end)')
    .eq('academy_id', academyId)
    .in('status', ['pending', 'confirmed']);

  type Slot = { date: string; time_start: string; time_end: string };
  const today = todayStr();
  const bookedLines = (reservations ?? [])
    .map((r) => {
      // 조인 결과가 객체 또는 배열로 올 수 있어 정규화
      const ts = (r as { trial_slots?: Slot | Slot[] }).trial_slots;
      return Array.isArray(ts) ? ts[0] : ts;
    })
    .filter((s): s is Slot => !!s && s.date >= today)
    .sort((a, b) => (a.date + a.time_start).localeCompare(b.date + b.time_start))
    .map((s) => `- ${s.date} ${hhmm(s.time_start)}~${hhmm(s.time_end)} (예약됨)`);

  return {
    scheduleText: scheduleLines.join('\n'),
    bookedText: bookedLines.join('\n'),
  };
}
