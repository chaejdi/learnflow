// [Claude] Anthropic SDK — 크레딧 충전 후 다시 활성화 가능
// import Anthropic from '@anthropic-ai/sdk';

// [Gemini] Google AI SDK — 무료 할당량 문제로 비활성화
// import { GoogleGenerativeAI } from '@google/generative-ai';

type Message = { role: 'user' | 'assistant'; content: string };

// 한자(CJK) 코드포인트 범위: Ext-A, 통합, 호환 한자.
// 한글(0xAC00–0xD7A3)은 이 범위에 포함되지 않는다.
// 리터럴 문자/\u 이스케이프는 편집 과정에서 깨질 수 있어 숫자 코드포인트로만 판별한다.
const CJK_RANGES: [number, number][] = [
  [0x3400, 0x4dbf], // CJK 확장 A
  [0x4e00, 0x9fff], // CJK 통합 한자
  [0xf900, 0xfaff], // CJK 호환 한자
];

function isHanja(codePoint: number): boolean {
  return CJK_RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi);
}

function hasHanja(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && isHanja(cp)) return true;
  }
  return false;
}

function stripHanja(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined || !isHanja(cp)) out += ch;
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  messages: Message[],
  temperature: number
): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 500,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Groq API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * AI 응답 생성
 * 현재: Groq (Llama 3.3 70B, 무료)
 * Llama는 한국어 응답에 가끔 한자를 섞는 결함이 있어("자세한"이 한자로 깨지는 등),
 * 한자가 감지되면 더 강한 지시로 1회 재생성하고, 그래도 남으면 제거한다.
 * 나중에 Claude로 전환하려면 아래 주석 참고.
 */
export async function generateAIResponse(
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  // ──────────────────────────────────────────────
  // [Groq] Llama 3.3 70B — 무료 플랜
  // ──────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  // 1차: 낮은 temperature로 누출 빈도를 줄인다.
  let text = await callGroq(apiKey, systemPrompt, messages, 0.3);

  // 2차: 한자가 섞였으면 강화 지시 + temperature 0으로 재생성.
  if (hasHanja(text)) {
    const reinforced =
      systemPrompt +
      '\n\n[매우 중요] 한자를 절대 사용하지 마세요. 모든 단어를 순수 한글로만 작성하세요. ' +
      '한자가 하나라도 들어가면 안 됩니다.';
    text = await callGroq(apiKey, reinforced, messages, 0);
  }

  // 최후 방어: 그래도 한자가 남으면 제거한다.
  if (hasHanja(text)) {
    text = stripHanja(text);
  }

  return text || '죄송합니다. 답변을 생성하지 못했습니다.';

  // ──────────────────────────────────────────────
  // [Gemini] 무료 할당량 문제로 비활성화
  // ──────────────────────────────────────────────
  // const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  // const model = genAI.getGenerativeModel({
  //   model: 'gemini-2.0-flash',
  //   systemInstruction: systemPrompt,
  // });
  // const chat = model.startChat({
  //   history: messages.slice(0, -1).map((m) => ({
  //     role: m.role === 'user' ? 'user' : 'model',
  //     parts: [{ text: m.content }],
  //   })),
  // });
  // const lastMessage = messages[messages.length - 1];
  // const result = await chat.sendMessage(lastMessage.content);
  // return result.response.text();

  // ──────────────────────────────────────────────
  // [Claude] 크레딧 충전 후 아래 코드로 교체
  // ──────────────────────────────────────────────
  // const anthropic = new Anthropic();
  // const aiResponse = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-6',
  //   max_tokens: 500,
  //   system: systemPrompt,
  //   messages: messages.map((m) => ({
  //     role: m.role,
  //     content: m.content,
  //   })),
  // });
  //
  // return aiResponse.content[0].type === 'text'
  //   ? aiResponse.content[0].text
  //   : '죄송합니다. 답변을 생성하지 못했습니다.';
}
