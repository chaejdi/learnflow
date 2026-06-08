import type { KakaoResponse } from '@/types';

export function buildKakaoTextResponse(text: string): KakaoResponse {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };
}

export function buildKakaoTextWithQuickReplies(
  text: string,
  replies: { label: string; message: string }[]
): KakaoResponse {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
      quickReplies: replies.map((r) => ({
        label: r.label,
        action: 'message' as const,
        messageText: r.message,
      })),
    },
  };
}

/**
 * 카카오 알림톡 발송
 *
 * 사전 요구사항:
 * 1. 카카오 비즈니스 채널 등록 및 승인
 * 2. 알림톡 메시지 템플릿 등록 및 승인
 * 3. 환경변수 설정: KAKAO_ADMIN_KEY, KAKAO_SENDER_KEY
 *
 * 템플릿 예시:
 * - reservation_confirmed: "#{학원명}에서 체험수업 예약이 확정되었습니다. 일시: #{날짜} #{시간}"
 * - owner_reply: "#{학원명} 원장님 답변: #{내용}"
 */
export async function sendAlimtalk(
  phone: string,
  templateId: string,
  variables: Record<string, string>
): Promise<boolean> {
  const adminKey = process.env.KAKAO_ADMIN_KEY;
  const senderKey = process.env.KAKAO_SENDER_KEY;

  if (!adminKey || !senderKey) {
    console.warn('[알림톡] KAKAO_ADMIN_KEY 또는 KAKAO_SENDER_KEY 미설정 — 발송 스킵');
    return false;
  }

  try {
    // 카카오 알림톡 API
    // https://developers.kakao.com/docs/latest/ko/message/rest-api#send-to-friends-alimtalk
    const response = await fetch(
      'https://kapi.kakao.com/v2/api/talk/memo/default/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `KakaoAK ${adminKey}`,
        },
        body: new URLSearchParams({
          sender_key: senderKey,
          template_id: templateId,
          receiver_uuids: JSON.stringify([phone]),
          template_args: JSON.stringify(variables),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[알림톡] 발송 실패:', errorData);
      return false;
    }

    console.log('[알림톡] 발송 성공:', { phone, templateId });
    return true;
  } catch (error) {
    console.error('[알림톡] 발송 오류:', error);
    return false;
  }
}
