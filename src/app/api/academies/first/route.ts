import { getServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('academies')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('GET first academy error:', error);
    return Response.json({ error: 'No academy found' }, { status: 404 });
  }
}
