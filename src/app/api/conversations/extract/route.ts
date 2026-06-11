import { NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { requireAuth, isAuthError } from '@/lib/auth';
import { extractReservationInfo } from '@/lib/ai/client';
import type { ChatMessage } from '@/types';

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 대화에서 체험수업 예약 정보를 추출(원장의 원클릭 예약 생성 프리필용)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { conversation_id } = await request.json();
    if (!conversation_id) {
      return Response.json({ error: 'conversation_id는 필수입니다.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 소유권 검증 + 인테이크/메시지 조회
    const { data: conv, error } = await supabase
      .from('conversations')
      .select('id, academy_id, messages, parent_name, child_name, phone, academies!inner(owner_id)')
      .eq('id', conversation_id)
      .single();

    if (error || !conv) {
      return Response.json({ error: '대화를 찾을 수 없습니다.' }, { status: 404 });
    }
    const ownerId = (conv.academies as unknown as { owner_id: string }).owner_id;
    if (ownerId !== auth.userId) {
      return Response.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 과목 목록(이름→id 매칭용)
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('academy_id', conv.academy_id);
    const subjectNames = (subjects ?? []).map((s) => s.name);

    // 대화 메시지 → AI 메시지 포맷
    const messages = ((conv.messages as ChatMessage[]) ?? []).map((m) => ({
      role: m.role === 'parent' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));

    const extracted = await extractReservationInfo(messages, todayStr(), subjectNames);

    // 인테이크(사전 양식) 값을 우선 사용
    const parent_name = conv.parent_name || extracted.parent_name;
    const child_name = conv.child_name || extracted.child_name;
    const phone = conv.phone || extracted.phone;

    // 과목 이름 → id 매칭(정확/부분 일치)
    let subject_id: string | null = null;
    if (extracted.subject_name && subjects) {
      const exact = subjects.find((s) => s.name === extracted.subject_name);
      const partial = subjects.find(
        (s) => s.name.includes(extracted.subject_name!) || extracted.subject_name!.includes(s.name)
      );
      subject_id = (exact || partial)?.id ?? null;
    }

    return Response.json({
      data: {
        parent_name,
        child_name,
        phone,
        subject_name: extracted.subject_name,
        subject_id,
        preferred_date: extracted.preferred_date,
        preferred_time: extracted.preferred_time,
      },
    });
  } catch (err) {
    console.error('POST extract reservation error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
