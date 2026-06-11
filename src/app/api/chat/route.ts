import { NextRequest } from 'next/server';
// [Claude] import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from '@/lib/supabase';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { getAvailabilityContext } from '@/lib/ai/context';
import { generateAIResponse } from '@/lib/ai/client';
import type { ChatRequest, ChatMessage, Academy, Subject } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { academy_id, kakao_user_id, message, intake } = body;

    // 빈 문자열은 저장하지 않도록 정리
    const cleanIntake = intake
      ? {
          parent_name: intake.parent_name?.trim() || null,
          child_name: intake.child_name?.trim() || null,
          relationship: intake.relationship?.trim() || null,
          child_age: intake.child_age?.trim() || null,
          inquiry_topic: intake.inquiry_topic?.trim() || null,
          phone: intake.phone?.trim() || null,
        }
      : null;

    const supabase = getServiceClient();

    const { data: academy } = await supabase
      .from('academies')
      .select('*')
      .eq('id', academy_id)
      .single<Academy>();

    if (!academy) {
      return Response.json({ error: 'Academy not found' }, { status: 404 });
    }

    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('academy_id', academy_id)
      .returns<Subject[]>();

    // Get or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('academy_id', academy_id)
      .eq('kakao_user_id', kakao_user_id)
      .eq('status', 'active')
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          academy_id,
          kakao_user_id,
          messages: [],
          status: 'active',
          needs_owner_reply: false,
          ...(cleanIntake ?? {}),
        })
        .select()
        .single();
      conversation = newConv;
    } else if (cleanIntake) {
      // 기존 대화에 인테이크가 비어 있던 항목만 채운다(원장이 수정한 값은 덮어쓰지 않음).
      const patch: Record<string, string> = {};
      for (const [k, v] of Object.entries(cleanIntake)) {
        if (v && !conversation[k]) patch[k] = v;
      }
      if (Object.keys(patch).length > 0) {
        await supabase.from('conversations').update(patch).eq('id', conversation.id);
        conversation = { ...conversation, ...patch };
      }
    }

    if (!conversation) {
      return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    const messages: ChatMessage[] = [
      ...conversation.messages,
      { role: 'parent', content: message, timestamp: new Date().toISOString() },
    ];

    // AI 응답 생성 (Gemini 또는 Claude — src/lib/ai/client.ts 에서 전환)
    const availability = await getAvailabilityContext(supabase, academy_id);
    const systemPrompt = buildSystemPrompt(academy, subjects || [], availability);
    const aiText = await generateAIResponse(
      systemPrompt,
      messages.map((m) => ({
        role: m.role === 'parent' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }))
    );

    const needsEscalation =
      aiText.includes('원장님') && aiText.includes('안내드리겠습니다');

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: 'ai', content: aiText, timestamp: new Date().toISOString() },
    ];

    await supabase
      .from('conversations')
      .update({
        messages: updatedMessages,
        needs_owner_reply: needsEscalation,
        status: needsEscalation ? 'escalated' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);

    return Response.json({
      reply: aiText,
      conversation_id: conversation.id,
      needs_reservation: aiText.includes('체험수업') && aiText.includes('예약'),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
