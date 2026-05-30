import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import type { CreateSubjectRequest } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const academyId = request.nextUrl.searchParams.get('academy_id');

    if (!academyId) {
      return Response.json({ error: 'academy_id required' }, { status: 400 });
    }

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
