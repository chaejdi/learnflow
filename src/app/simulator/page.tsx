'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Message {
  role: 'parent' | 'ai';
  content: string;
  time: string;
}

function formatTime() {
  return new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SimulatorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [academyId, setAcademyId] = useState('');
  const [userId] = useState(
    () => `sim_parent_${Math.random().toString(36).slice(2, 8)}`
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const resolveAcademyId = useCallback(async () => {
    try {
      const res = await fetch('/api/academies/first');
      const json = await res.json();
      if (res.ok && json.data?.id) {
        setAcademyId(json.data.id);
      }
    } catch (error) {
      console.error('Failed to resolve academy:', error);
    }
  }, []);

  useEffect(() => {
    resolveAcademyId();
  }, [resolveAcademyId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !academyId) return;

    const parentMsg: Message = {
      role: 'parent',
      content: text,
      time: formatTime(),
    };
    setMessages((prev) => [...prev, parentMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academy_id: academyId,
          kakao_user_id: userId,
          message: text,
        }),
      });

      const json = await res.json();

      if (res.ok && json.reply) {
        const aiMsg: Message = {
          role: 'ai',
          content: json.reply,
          time: formatTime(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: `오류: ${json.error || '응답을 받지 못했습니다'}`,
            time: formatTime(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: '네트워크 오류가 발생했습니다.',
          time: formatTime(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col h-[700px] rounded-2xl overflow-hidden shadow-xl">
        {/* 헤더 */}
        <div className="bg-[#3B1E54] px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard/inquiries"
            className="text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            학
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">
              우리동네 수학학원
            </p>
            <p className="text-white/60 text-xs">AI 상담봇 응답 중</p>
          </div>
          <span className="text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
            시뮬레이터
          </span>
        </div>

        {/* 채팅 영역 */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-[#B2C7D9] p-4 space-y-3"
        >
          {/* 안내 메시지 */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-block bg-white/80 rounded-xl px-4 py-3 text-sm text-gray-600">
                <p className="font-medium text-gray-800 mb-1">
                  학부모 채팅 시뮬레이터
                </p>
                <p>학부모 입장에서 메시지를 보내보세요.</p>
                <p>AI가 답변하고, 대시보드 상담 내역에 저장됩니다.</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'parent' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-[#3B1E54] mr-2 flex-shrink-0 mt-0.5">
                  AI
                </div>
              )}
              <div className="flex flex-col">
                <div
                  className={`max-w-[260px] px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'parent'
                      ? 'bg-[#FEE500] text-gray-900 rounded-xl rounded-tr-sm'
                      : 'bg-white text-gray-900 rounded-xl rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span
                  className={`text-[10px] text-gray-500 mt-1 ${
                    msg.role === 'parent' ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-[#3B1E54] mr-2 flex-shrink-0">
                AI
              </div>
              <div className="bg-white px-4 py-3 rounded-xl rounded-tl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <form
          onSubmit={handleSend}
          className="bg-white px-3 py-2 flex items-center gap-2 border-t border-gray-200"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              academyId
                ? '학부모로서 메시지를 보내보세요...'
                : '학원 데이터를 불러오는 중...'
            }
            disabled={sending || !academyId}
            className="flex-1 h-10 px-3 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEE500] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || !academyId}
            className="w-10 h-10 rounded-full bg-[#FEE500] flex items-center justify-center hover:bg-[#F0D800] transition-colors disabled:opacity-30"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin text-gray-700" />
            ) : (
              <Send size={18} className="text-gray-700" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
