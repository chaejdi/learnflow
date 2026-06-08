import { GoogleGenerativeAI } from '@google/generative-ai';

// [Claude] Anthropic SDK — 크레딧 충전 후 다시 활성화 가능
// import Anthropic from '@anthropic-ai/sdk';

type Message = { role: 'user' | 'assistant'; content: string };

// 한자(CJK) 코드포인트 범위: Ext-A, 통합, 호환 한자.
// 한글(0xAC00–0xD7A3)은 이 범위에 포함되지 않는다. (Gemini는 거의 한자를 안 섞지만
// 안전망으로 유지한다.) 리터럴/유니코드 이스케이프 깨짐을 피해 숫자 코드포인트로만 판별.
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

let _genAI: GoogleGenerativeAI | null = null;

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: Message[],
  temperature: number
): Promise<string> {
  if (!_genAI) _genAI = new GoogleGenerativeAI(apiKey);

  const model = _genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });

  // 마지막 사용자 메시지를 sendMessage로 보내고, 그 이전은 history로 전달한다.
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' : ('model' as const),
    parts: [{ text: m.content }],
  }));
  const last = messages[messages.length - 1];

  const chat = model.startChat({
    history,
    generationConfig: { temperature, maxOutputTokens: 500 },
  });

  const result = await chat.sendMessage(last?.content ?? '');
  return result.response.text();
}

/**
 * AI 응답 생성
 * 현재: Gemini 2.5 Flash (저렴 + 한국어 우수 + 한자 문제 없음)
 * 필요 환경변수: GOOGLE_GEMINI_API_KEY (Google AI Studio에서 발급)
 * 한자 가드는 안전망으로만 유지(Gemini에선 거의 발동하지 않음).
 */
export async function generateAIResponse(
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  let text = await callGemini(apiKey, systemPrompt, messages, 0.5);

  // 안전망: 만에 하나 한자가 섞이면 제거(한글 보존).
  if (hasHanja(text)) {
    text = stripHanja(text);
  }

  return text || '죄송합니다. 답변을 생성하지 못했습니다.';

  // ──────────────────────────────────────────────
  // [Groq] Llama 3.3 70B — 무료 폴백 (한국어에 가끔 한자 섞임)
  // ──────────────────────────────────────────────
  // const apiKey = process.env.GROQ_API_KEY;
  // const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     model: 'llama-3.3-70b-versatile',
  //     messages: [{ role: 'system', content: systemPrompt }, ...messages],
  //     max_tokens: 500,
  //     temperature: 0.3,
  //   }),
  // });
  // const data = await response.json();
  // return data.choices?.[0]?.message?.content || '죄송합니다. 답변을 생성하지 못했습니다.';

  // ──────────────────────────────────────────────
  // [Claude] 크레딧 충전 후 아래 코드로 교체
  // ──────────────────────────────────────────────
  // const anthropic = new Anthropic();
  // const aiResponse = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-6',
  //   max_tokens: 500,
  //   system: systemPrompt,
  //   messages: messages.map((m) => ({ role: m.role, content: m.content })),
  // });
  // return aiResponse.content[0].type === 'text'
  //   ? aiResponse.content[0].text
  //   : '죄송합니다. 답변을 생성하지 못했습니다.';
}
