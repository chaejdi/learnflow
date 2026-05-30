import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import type { UpdateAcademyRequest } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const academyId = request.nextUrl.searchParams.get('id');

    if (!academyId) {
      return Response.json({ error: 'id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('academies')
      .select('*')
      .eq('id', academyId)
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('GET academy error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateAcademyRequest & { id: string } = await request.json();
    const { id, ...updates } = body;

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('academies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('PATCH academy error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
