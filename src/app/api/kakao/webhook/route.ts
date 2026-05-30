import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from '@/lib/supabase';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildKakaoTextResponse } from '@/lib/kakao';
import type { KakaoWebhookPayload, ChatMessage, Academy, Subject } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const payload: KakaoWebhookPayload = await request.json();
    const userMessage = payload.userRequest.utterance;
    const kakaoUserId = payload.userRequest.user.id;

    const supabase = getServiceClient();

    // Find academy by bot ID (for now, use first academy)
    const { data: academy } = await supabase
      .from('academies')
      .select('*')
      .limit(1)
      .single<Academy>();

    if (!academy) {
      return Response.json(
        buildKakaoTextResponse(
          '죄송합니다. 현재 서비스 연결이 되지 않았습니다. 잠시 후 다시 시도해주세요.'
        )
      );
    }

    // Get subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('academy_id', academy.id)
      .returns<Subject[]>();

    // Get or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('academy_id', academy.id)
      .eq('kakao_user_id', kakaoUserId)
      .eq('status', 'active')
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          academy_id: academy.id,
          kakao_user_id: kakaoUserId,
          messages: [],
          status: 'active',
          needs_owner_reply: false,
        })
        .select()
        .single();
      conversation = newConv;
    }

    if (!conversation) {
      return Response.json(
        buildKakaoTextResponse('죄송합니다. 일시적 오류가 발생했습니다.')
      );
    }

    // Build message history
    const messages: ChatMessage[] = [
      ...conversation.messages,
      { role: 'parent', content: userMessage, timestamp: new Date().toISOString() },
    ];

    // Call Claude API
    const anthropic = new Anthropic();
    const systemPrompt = buildSystemPrompt(academy, subjects || []);

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === 'parent' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
    });

    const aiText =
      aiResponse.content[0].type === 'text'
        ? aiResponse.content[0].text
        : '죄송합니다. 답변을 생성하지 못했습니다.';

    // Check if escalation needed
    const needsEscalation =
      aiText.includes('원장님') && aiText.includes('안내드리겠습니다');

    // Update conversation
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

    return Response.json(buildKakaoTextResponse(aiText));
  } catch (error) {
    console.error('Kakao webhook error:', error);
    return Response.json(
      buildKakaoTextResponse(
        '죄송합니다. 일시적 오류가 발생했습니다. 잠시 후 다시 문의해주세요.'
      )
    );
  }
}
