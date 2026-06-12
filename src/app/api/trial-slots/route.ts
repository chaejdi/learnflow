import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase';
import { requireMember, isAuthError } from '@/lib/auth';

// 과목이 속한 학원 id 조회(멤버십 검증용)
async function academyOfSubject(
  supabase: SupabaseClient,
  subjectId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('subjects')
    .select('academy_id')
    .eq('id', subjectId)
    .single();
  return (data?.academy_id as string) ?? null;
}

// 체험슬롯이 속한 학원 id 조회(슬롯 → 과목 → 학원)
async function academyOfSlot(
  supabase: SupabaseClient,
  slotId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('trial_slots')
    .select('subjects(academy_id)')
    .eq('id', slotId)
    .single();
  const subj = data?.subjects as unknown as { academy_id?: string } | null;
  return subj?.academy_id ?? null;
}

export async function GET(request: NextRequest) {
  const academyId = request.nextUrl.searchParams.get('academy_id');
  const subjectId = request.nextUrl.searchParams.get('subject_id');

  if (!academyId && !subjectId) {
    return Response.json({ error: 'academy_id 또는 subject_id가 필요합니다.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();

    // 멤버십 검증 — academy_id 또는 subject_id 기준
    const targetAcademy = academyId ?? (await academyOfSubject(supabase, subjectId!));
    if (!targetAcademy) {
      return Response.json({ error: '대상을 찾을 수 없습니다.' }, { status: 404 });
    }
    const m = await requireMember(request, targetAcademy);
    if (isAuthError(m)) return m;

    let query = supabase
      .from('trial_slots')
      .select('*, subjects(id, name, academy_id)')
      .order('date', { ascending: true })
      .order('time_start', { ascending: true });

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    } else if (academyId) {
      query = query.eq('subjects.academy_id', academyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // academy_id 필터는 join 후 클라이언트에서 필터
    const filtered = academyId
      ? (data || []).filter((slot: { subjects?: { academy_id?: string } }) => slot.subjects?.academy_id === academyId)
      : data;

    return Response.json({ data: filtered });
  } catch (error) {
    console.error('GET trial-slots error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject_id, date, time_start, time_end } = body;

    if (!subject_id || !date || !time_start || !time_end) {
      return Response.json(
        { error: 'subject_id, date, time_start, time_end는 필수입니다.' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const academyId = await academyOfSubject(supabase, subject_id);
    if (!academyId) {
      return Response.json({ error: '과목을 찾을 수 없습니다.' }, { status: 404 });
    }
    const m = await requireMember(request, academyId);
    if (isAuthError(m)) return m;

    const { data, error } = await supabase
      .from('trial_slots')
      .insert({
        subject_id,
        date,
        time_start,
        time_end,
        is_available: true,
      })
      .select('*, subjects(id, name)')
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST trial-slot error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const academyId = await academyOfSlot(supabase, id);
    if (!academyId) {
      return Response.json({ error: '슬롯을 찾을 수 없습니다.' }, { status: 404 });
    }
    const m = await requireMember(request, academyId);
    if (isAuthError(m)) return m;

    const { error } = await supabase
      .from('trial_slots')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE trial-slot error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
