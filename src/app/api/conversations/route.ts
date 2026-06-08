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
      .from('conversations')
      .select('*')
      .eq('academy_id', academyId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('GET conversations error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 원장님이 직접 답변 보내기
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { conversation_id, message } = await request.json();

    if (!conversation_id || !message) {
      return Response.json(
        { error: 'conversation_id와 message는 필수입니다.' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (fetchError || !conversation) {
      return Response.json({ error: '대화를 찾을 수 없습니다.' }, { status: 404 });
    }

    const updatedMessages = [
      ...conversation.messages,
      { role: 'owner', content: message, timestamp: new Date().toISOString() },
    ];

    const { data, error } = await supabase
      .from('conversations')
      .update({
        messages: updatedMessages,
        needs_owner_reply: false,
        status: 'resolved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('POST conversation reply error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
