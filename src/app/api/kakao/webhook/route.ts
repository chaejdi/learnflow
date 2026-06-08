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

    // 구독 상태 & 사용량 체크
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*, plans(ai_chat_limit)')
      .eq('academy_id', academy.id)
      .single();

    if (subscription) {
      const isExpired = subscription.status === 'trialing'
        && new Date(subscription.trial_ends_at) < new Date();
      const isCancelled = subscription.status === 'cancelled' || subscription.status === 'expired';

      if (isExpired || isCancelled) {
        return Response.json(
          buildKakaoTextResponse(
            '현재 구독이 만료되었습니다. 원장님께서 런플로우 대시보드에서 플랜을 갱신해주시면 다시 상담이 가능합니다.'
          )
        );
      }

      const chatLimit = subscription.plans?.ai_chat_limit;
      if (chatLimit) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const { data: usage } = await supabase
          .from('usage_logs')
          .select('ai_chat_count')
          .eq('academy_id', academy.id)
          .eq('year_month', yearMonth)
          .single();

        if (usage && usage.ai_chat_count >= chatLimit) {
          return Response.json(
            buildKakaoTextResponse(
              '이번 달 AI 상담 횟수가 모두 소진되었습니다. 원장님께서 플랜을 업그레이드하시면 더 많은 상담이 가능합니다. 직접 상담을 원하시면 잠시 기다려주세요!'
            )
          );
        }
      }
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

    // AI 상담 사용량 증가
    // AI 상담 사용량 증가 (실패해도 응답에 영향 없도록)
    try {
      const now2 = new Date();
      const ym = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}`;
      await supabase.rpc('increment_usage', {
        p_academy_id: academy.id,
        p_year_month: ym,
      });
    } catch { /* ignore */ }

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
