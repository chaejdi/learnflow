import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireAuth, isAuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const supabase = getServiceClient();
    const academyId = request.nextUrl.searchParams.get('academy_id');
    const subjectId = request.nextUrl.searchParams.get('subject_id');

    if (!academyId && !subjectId) {
      return Response.json({ error: 'academy_id 또는 subject_id가 필요합니다.' }, { status: 400 });
    }

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
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

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
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }

    const supabase = getServiceClient();

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
