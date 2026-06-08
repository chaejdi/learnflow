import { NextRequest } from 'next/server';
// [Claude] import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from '@/lib/supabase';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { generateAIResponse } from '@/lib/ai/client';
import { buildKakaoTextResponse } from '@/lib/kakao';
import type { KakaoWebhookPayload, ChatMessage, Academy, Subject } from '@/types';

// 카카오 i 오픈빌더 콜백 URL 검증용
export async function GET() {
  return Response.json({}, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const payload: KakaoWebhookPayload = await request.json();
    const userMessage = payload.userRequest.utterance;
    const kakaoUserId = payload.userRequest.user.id;

    // B안: 카카오 봇 ID(bot.id)로 학원을 식별한다. 모든 학원이 동일한 웹훅 URL을 사용하고,
    // 들어온 bot.id 를 academies.kakao_channel_id 와 매칭해 어느 학원인지 찾는다.
    // 테스트/디버깅 시에는 ?academy_id=xxx 로 학원을 명시적으로 지정할 수 있다.
    const botId = payload.bot?.id ?? null;
    const academyIdOverride = new URL(request.url).searchParams.get('academy_id');

    const supabase = getServiceClient();

    let academy: Academy | null = null;

    if (academyIdOverride) {
      const { data } = await supabase
        .from('academies')
        .select('*')
        .eq('id', academyIdOverride)
        .single<Academy>();
      academy = data;
    } else if (botId) {
      const { data } = await supabase
        .from('academies')
        .select('*')
        .eq('kakao_channel_id', botId)
        .single<Academy>();
      academy = data;
    }

    if (!academy) {
      // 아직 어떤 학원과도 연결되지 않은 채널.
      // 원장님이 대시보드 설정에 입력할 수 있도록 봇 ID를 그대로 안내한다.
      return Response.json(
        buildKakaoTextResponse(
          botId
            ? `이 채널은 아직 학원과 연결되지 않았어요.\n\n런플로우 대시보드 → 설정 → "카카오 봇 ID"에 아래 값을 입력하면 연결됩니다:\n\n${botId}`
            : '죄송합니다. 현재 서비스 연결이 되지 않았습니다. 잠시 후 다시 시도해주세요.'
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

    // AI 응답 생성 (Gemini 또는 Claude — src/lib/ai/client.ts 에서 전환)
    const systemPrompt = buildSystemPrompt(academy, subjects || []);
    const aiText = await generateAIResponse(
      systemPrompt,
      messages.map((m) => ({
        role: m.role === 'parent' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }))
    );

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
