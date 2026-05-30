import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from '@/lib/supabase';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import type { ChatRequest, ChatMessage, Academy, Subject } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { academy_id, kakao_user_id, message } = body;

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
        })
        .select()
        .single();
      conversation = newConv;
    }

    if (!conversation) {
      return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    const messages: ChatMessage[] = [
      ...conversation.messages,
      { role: 'parent', content: message, timestamp: new Date().toISOString() },
    ];

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
        : '답변을 생성하지 못했습니다.';

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
