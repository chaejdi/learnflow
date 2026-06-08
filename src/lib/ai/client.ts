// [Claude] Anthropic SDK — 크레딧 충전 후 다시 활성화 가능
// import Anthropic from '@anthropic-ai/sdk';

// [Gemini] Google AI SDK — 무료 할당량 문제로 비활성화
// import { GoogleGenerativeAI } from '@google/generative-ai';

type Message = { role: 'user' | 'assistant'; content: string };

/**
 * AI 응답 생성
 * 현재: Groq (Llama 3.3 70B, 무료)
 * 나중에 Claude로 전환하려면 아래 주석 참고
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
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Groq API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

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
