// [Claude] Anthropic SDK — 크레딧 충전 후 다시 활성화 가능
// import Anthropic from '@anthropic-ai/sdk';

type Message = { role: 'user' | 'assistant'; content: string };

const FALLBACK = '죄송합니다. 지금 답변을 준비하는 데 문제가 있었어요. 잠시 후 다시 문의해 주세요. 급하신 경우 원장님께 직접 전달하겠습니다.';

// 한자(CJK) 코드포인트 범위: Ext-A, 통합, 호환 한자.
// 한글(0xAC00–0xD7A3)은 포함되지 않는다. 숫자 코드포인트로만 판별(리터럴 깨짐 방지).
const CJK_RANGES: [number, number][] = [
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xf900, 0xfaff],
];

function isHanja(cp: number): boolean {
  return CJK_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gemini 2.5 Flash 호출 (REST 직접 호출).
 * - thinkingBudget=0: 추론 토큰 소모를 꺼서 maxOutputTokens가 답변에 온전히 쓰이게 함.
 *   (켜두면 추론이 토큰을 다 먹어 빈 응답/잘림이 발생한다.)
 * - 503/429(과부하·레이트리밋)는 일시적이므로 짧게 재시도한다.
 */
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: Message[],
  temperature: number
): Promise<string> {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
    encodeURIComponent(apiKey);

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature,
      maxOutputTokens: 500,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 503 || res.status === 429) {
      lastErr = `HTTP ${res.status}`;
      await sleep(800 * (attempt + 1)); // 0.8s, 1.6s 백오프
      continue;
    }

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: { text?: string }) => p.text ?? '').join('').trim();
    if (text) return text;
    lastErr = 'empty response';
    await sleep(500);
  }

  throw new Error(`Gemini 재시도 실패: ${lastErr}`);
}

/**
 * AI 응답 생성 (Gemini 2.5 Flash).
 * 어떤 경우에도 throw하지 않고 문자열을 반환한다 — 호출부(웹훅/chat)가 AI 실패와
 * 무관하게 대화를 항상 저장할 수 있도록 하기 위함. (실패 시 안내문 반환)
 */
export async function generateAIResponse(
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_GEMINI_API_KEY 미설정');
    return FALLBACK;
  }

  try {
    let text = await callGemini(apiKey, systemPrompt, messages, 0.5);
    if (hasHanja(text)) text = stripHanja(text); // 안전망(Gemini에선 거의 발동 안 함)
    return text || FALLBACK;
  } catch (err) {
    console.error('generateAIResponse 실패:', err);
    return FALLBACK;
  }

  // ──────────────────────────────────────────────
  // [Groq] Llama 3.3 70B — 무료 폴백 (한국어에 가끔 한자 섞임)
  // const apiKey = process.env.GROQ_API_KEY;
  // const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ model: 'llama-3.3-70b-versatile',
  //     messages: [{ role: 'system', content: systemPrompt }, ...messages],
  //     max_tokens: 500, temperature: 0.3 }),
  // });
  // return (await r.json()).choices?.[0]?.message?.content || FALLBACK;

  // ──────────────────────────────────────────────
  // [Claude] 크레딧 충전 후
  // const anthropic = new Anthropic();
  // const a = await anthropic.messages.create({ model: 'claude-sonnet-4-6',
  //   max_tokens: 500, system: systemPrompt,
  //   messages: messages.map((m) => ({ role: m.role, content: m.content })) });
  // return a.content[0].type === 'text' ? a.content[0].text : FALLBACK;
}
