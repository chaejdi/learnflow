import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireAuth, isAuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const supabase = getServiceClient();
    const academyId = request.nextUrl.searchParams.get('academy_id');

    if (!academyId) {
      return Response.json({ error: 'academy_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('schedule_terms')
      .select('*')
      .eq('academy_id', academyId)
      .order('start_date', { ascending: true });

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('GET schedule-terms error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { academy_id, name, start_date, end_date } = body;

    if (!academy_id || !name || !start_date || !end_date) {
      return Response.json(
        { error: 'academy_id, name, start_date, end_date는 필수입니다.' },
        { status: 400 }
      );
    }
    if (start_date > end_date) {
      return Response.json({ error: '시작일이 종료일보다 늦을 수 없습니다.' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('schedule_terms')
      .insert({ academy_id, name, start_date, end_date })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST schedule-term error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { id, name, start_date, end_date } = body;

    if (!id) {
      return Response.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }
    if (start_date && end_date && start_date > end_date) {
      return Response.json({ error: '시작일이 종료일보다 늦을 수 없습니다.' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('schedule_terms')
      .update({
        ...(name !== undefined && { name }),
        ...(start_date !== undefined && { start_date }),
        ...(end_date !== undefined && { end_date }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('PATCH schedule-term error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return Response.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = getServiceClient();
    // schedules.term_id 는 on delete cascade 이므로 해당 기간의 시간표도 함께 삭제됨
    const { error } = await supabase.from('schedule_terms').delete().eq('id', id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE schedule-term error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
