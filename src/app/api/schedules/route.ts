import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const academyId = request.nextUrl.searchParams.get('academy_id');
  if (!academyId) {
    return NextResponse.json({ error: 'academy_id required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('academy_id', academyId)
    .order('day_of_week')
    .order('time_start');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { academy_id, subject_id, subject_name, day_of_week, time_start, time_end, teacher, room } = body;

  if (!academy_id || !subject_name || !day_of_week || !time_start || !time_end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('schedules')
    .insert({ academy_id, subject_id, subject_name, day_of_week, time_start, time_end, teacher, room })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from('schedules').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
