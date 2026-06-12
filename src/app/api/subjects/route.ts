import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase';
import { requireMember, isAuthError } from '@/lib/auth';
import type { CreateSubjectRequest } from '@/types';

// 과목이 속한 학원 id 조회(멤버십 검증용)
async function getSubjectAcademy(
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
      .from('subjects')
      .select('*')
      .eq('academy_id', academyId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('GET subjects error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSubjectRequest & { academy_id: string } =
      await request.json();

    if (!body.academy_id || !body.name) {
      return Response.json({ error: 'academy_id와 name은 필수입니다.' }, { status: 400 });
    }

    const m = await requireMember(request, body.academy_id);
    if (isAuthError(m)) return m;

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        academy_id: body.academy_id,
        name: body.name,
        target_grade: body.target_grade,
        schedule: body.schedule,
        monthly_fee: body.monthly_fee,
        material_fee: body.material_fee,
        capacity: body.capacity,
        enrolled_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST subject error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ error: 'id는 필수입니다.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const academyId = await getSubjectAcademy(supabase, id);
    if (!academyId) {
      return Response.json({ error: '과목을 찾을 수 없습니다.' }, { status: 404 });
    }
    const m = await requireMember(request, academyId);
    if (isAuthError(m)) return m;

    const { data, error } = await supabase
      .from('subjects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('PUT subject error:', error);
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

    const academyId = await getSubjectAcademy(supabase, id);
    if (!academyId) {
      return Response.json({ error: '과목을 찾을 수 없습니다.' }, { status: 404 });
    }
    const m = await requireMember(request, academyId);
    if (isAuthError(m)) return m;

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE subject error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
