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

export async function sendAlimtalk(phone: string, templateId: string, variables: Record<string, string>) {
  const adminKey = process.env.KAKAO_ADMIN_KEY;
  if (!adminKey) {
    console.error('KAKAO_ADMIN_KEY not configured');
    return;
  }

  // TODO: Implement actual Kakao 알림톡 API call
  console.log('알림톡 전송:', { phone, templateId, variables });
}
