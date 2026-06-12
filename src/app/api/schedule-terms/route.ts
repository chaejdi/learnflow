import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase';
import { requireMember, isAuthError } from '@/lib/auth';

// 기간이 속한 학원 id 조회(멤버십 검증용)
async function getTermAcademy(
  supabase: SupabaseClient,
  termId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('schedule_terms')
    .select('academy_id')
    .eq('id', termId)
    .single();
  return (data?.academy_id as string) ?? null;
}

export async function GET(request: NextRequest) {
  const academyId = request.nextUrl.searchParams.get('academy_id');
  if (!academyId) {
    return Response.json({ error: 'academy_id required' }, { status: 400 });
  }

  const m = await requireMember(request, academyId);
  if (isAuthError(m)) return m;

  try {
    const supabase = getServiceClient();

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

    const m = await requireMember(request, academy_id);
    if (isAuthError(m)) return m;

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

    const academyId = await getTermAcademy(supabase, id);
    if (!academyId) {
      return Response.json({ error: '기간을 찾을 수 없습니다.' }, { status: 404 });
    }
    const m = await requireMember(request, academyId);
    if (isAuthError(m)) return m;

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
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return Response.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const academyId = await getTermAcademy(supabase, id);
    if (!academyId) {
      return Response.json({ error: '기간을 찾을 수 없습니다.' }, { status: 404 });
    }
    const m = await requireMember(request, academyId);
    if (isAuthError(m)) return m;

    // schedules.term_id 는 on delete cascade 이므로 해당 기간의 시간표도 함께 삭제됨
    const { error } = await supabase.from('schedule_terms').delete().eq('id', id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE schedule-term error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
