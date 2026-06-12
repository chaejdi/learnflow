import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireMember, isAuthError } from '@/lib/auth';

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

// 원장/선생님이 직접 답변 보내기
export async function POST(request: NextRequest) {
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

    const m = await requireMember(request, conversation.academy_id);
    if (isAuthError(m)) return m;

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

// 원장/선생님이 상담 인테이크(이름 등)를 수정
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, parent_name, child_name, relationship, child_age, inquiry_topic, phone } = body;

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id는 필수입니다.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 멤버십 검증: 대화가 속한 학원의 멤버인지 확인
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, academy_id')
      .eq('id', conversation_id)
      .single();

    if (fetchError || !conversation) {
      return Response.json({ error: '대화를 찾을 수 없습니다.' }, { status: 404 });
    }
    const m = await requireMember(request, conversation.academy_id);
    if (isAuthError(m)) return m;

    // 전달된 필드만 갱신(빈 문자열은 null 로 저장 → 익명 표시로 되돌릴 수 있음)
    const norm = (v: unknown) => (typeof v === 'string' ? v.trim() || null : undefined);
    const updates = {
      ...(parent_name !== undefined && { parent_name: norm(parent_name) }),
      ...(child_name !== undefined && { child_name: norm(child_name) }),
      ...(relationship !== undefined && { relationship: norm(relationship) }),
      ...(child_age !== undefined && { child_age: norm(child_age) }),
      ...(inquiry_topic !== undefined && { inquiry_topic: norm(inquiry_topic) }),
      ...(phone !== undefined && { phone: norm(phone) }),
    };

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: '수정할 항목이 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversation_id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('PATCH conversation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
