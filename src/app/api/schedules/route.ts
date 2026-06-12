import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase';
import { requireMember, isAuthError } from '@/lib/auth';

// 시간표 row 가 속한 학원 id 조회(멤버십 검증용)
async function academyOfSchedule(
  supabase: SupabaseClient,
  scheduleId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('schedules')
    .select('academy_id')
    .eq('id', scheduleId)
    .single();
  return (data?.academy_id as string) ?? null;
}

// ===== 날짜 유틸 =====
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
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
function mondaysInRange(startStr: string, endStr: string): string[] {
  const end = parseYmd(endStr);
  let cur = mondayOf(parseYmd(startStr));
  const out: string[] = [];
  while (cur <= end) { out.push(ymd(cur)); cur = addDays(cur, 7); }
  return out;
}

export async function GET(request: NextRequest) {
  const academyId = request.nextUrl.searchParams.get('academy_id');
  if (!academyId) {
    return NextResponse.json({ error: 'academy_id required' }, { status: 400 });
  }

  const m = await requireMember(request, academyId);
  if (isAuthError(m)) return m;

  const termId = request.nextUrl.searchParams.get('term_id');
  const weekStart = request.nextUrl.searchParams.get('week_start');

  const supabase = getServiceClient();
  let query = supabase.from('schedules').select('*').eq('academy_id', academyId);
  if (termId) query = query.eq('term_id', termId);
  if (weekStart) query = query.eq('week_start', weekStart);

  const { data, error } = await query.order('day_of_week').order('time_start');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// 수업 추가:
//   scope='term'(기본) — 기간 전체 주에 동일 수업을 깐다 (series_id 로 묶음)
//   scope='one'         — 지정한 주(week_start)에만 1건 추가 (하루짜리 특강 등)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { academy_id, term_id, subject_id, subject_name, day_of_week, time_start, time_end, teacher, room, color, scope, week_start } = body;

  if (!academy_id || !term_id || !subject_name || !day_of_week || !time_start || !time_end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const m = await requireMember(request, academy_id);
  if (isAuthError(m)) return m;

  const supabase = getServiceClient();
  const seriesId = crypto.randomUUID();

  // 이 주만 추가
  if (scope === 'one') {
    if (!week_start) {
      return NextResponse.json({ error: 'week_start required for scope=one' }, { status: 400 });
    }
    const monday = ymd(mondayOf(parseYmd(week_start)));
    const oneRow = {
      academy_id, term_id, series_id: seriesId, week_start: monday,
      subject_id: subject_id ?? null, subject_name, day_of_week, time_start, time_end,
      teacher: teacher ?? null, room: room ?? null, color: color ?? 'blue',
    };
    const { data, error } = await supabase.from('schedules').insert([oneRow]).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, count: data.length }, { status: 201 });
  }

  // 기간 전체에 추가 (기본)
  // 기간 날짜 범위 조회
  const { data: term, error: termErr } = await supabase
    .from('schedule_terms')
    .select('start_date, end_date')
    .eq('id', term_id)
    .single();
  if (termErr || !term) {
    return NextResponse.json({ error: '기간을 찾을 수 없습니다.' }, { status: 400 });
  }

  const weeks = mondaysInRange(term.start_date, term.end_date);
  const rows = weeks.map((week_start) => ({
    academy_id, term_id, series_id: seriesId, week_start,
    subject_id: subject_id ?? null, subject_name, day_of_week, time_start, time_end,
    teacher: teacher ?? null, room: room ?? null, color: color ?? 'blue',
  }));

  const { data, error } = await supabase.from('schedules').insert(rows).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count: data.length }, { status: 201 });
}

// 수업 수정: scope='one'(이 주만) | 'future'(이 주 + 이후 모든 주)
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, scope, subject_id, subject_name, day_of_week, time_start, time_end, teacher, room, color } = body;

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const academyId = await academyOfSchedule(supabase, id);
  if (!academyId) {
    return NextResponse.json({ error: '수업을 찾을 수 없습니다.' }, { status: 404 });
  }
  const m = await requireMember(request, academyId);
  if (isAuthError(m)) return m;

  const updates = {
    ...(subject_id !== undefined && { subject_id }),
    ...(subject_name !== undefined && { subject_name }),
    ...(day_of_week !== undefined && { day_of_week }),
    ...(time_start !== undefined && { time_start }),
    ...(time_end !== undefined && { time_end }),
    ...(teacher !== undefined && { teacher }),
    ...(room !== undefined && { room }),
    ...(color !== undefined && { color }),
  };

  if (scope === 'future') {
    // 기준 row 의 series_id / week_start 조회 후, 같은 series 의 이 주 이후 전부 수정
    const { data: base, error: baseErr } = await supabase
      .from('schedules')
      .select('series_id, week_start')
      .eq('id', id)
      .single();
    if (baseErr || !base) {
      return NextResponse.json({ error: '수업을 찾을 수 없습니다.' }, { status: 400 });
    }
    if (!base.series_id || !base.week_start) {
      // series 정보가 없으면 단일 수정으로 처리
      const { data, error } = await supabase.from('schedules').update(updates).eq('id', id).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('series_id', base.series_id)
      .gte('week_start', base.week_start)
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // scope='one' (기본)
  const { data, error } = await supabase.from('schedules').update(updates).eq('id', id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// 수업 삭제: scope='one'(이 주만) | 'future'(이 주 + 이후 모든 주)
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const scope = request.nextUrl.searchParams.get('scope');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const academyId = await academyOfSchedule(supabase, id);
  if (!academyId) {
    return NextResponse.json({ error: '수업을 찾을 수 없습니다.' }, { status: 404 });
  }
  const m = await requireMember(request, academyId);
  if (isAuthError(m)) return m;

  if (scope === 'future') {
    const { data: base } = await supabase
      .from('schedules')
      .select('series_id, week_start')
      .eq('id', id)
      .single();
    if (base?.series_id && base.week_start) {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('series_id', base.series_id)
        .gte('week_start', base.week_start);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }
  }

  const { error } = await supabase.from('schedules').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
