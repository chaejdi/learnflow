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

type Intake = {
  parent_name: string;
  child_name: string;
  relationship: string;
  child_age: string;
  phone: string;
  inquiry_topic: string;
};
const emptyIntake: Intake = {
  parent_name: '',
  child_name: '',
  relationship: '',
  child_age: '',
  phone: '',
  inquiry_topic: '',
};

export default function SimulatorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [academyId, setAcademyId] = useState('');
  const [userId] = useState(
    () => `sim_parent_${Math.random().toString(36).slice(2, 8)}`
  );
  // 상담 전 양식(인테이크)
  const [started, setStarted] = useState(false); // 양식 작성/건너뛰기 완료 후 채팅 시작
  const [intake, setIntake] = useState<Intake>(emptyIntake);
  const pendingIntake = useRef<Intake | null>(null); // 첫 메시지에 함께 보낼 인테이크
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

  // 양식 제출/건너뛰기 → 채팅 시작. 상담 내용이 있으면 첫 메시지로 자동 전송.
  function handleStart(withForm: boolean) {
    if (withForm) {
      const cleaned: Intake = {
        parent_name: intake.parent_name.trim(),
        child_name: intake.child_name.trim(),
        relationship: intake.relationship.trim(),
        child_age: intake.child_age.trim(),
        phone: intake.phone.trim(),
        inquiry_topic: intake.inquiry_topic.trim(),
      };
      pendingIntake.current = cleaned;
      setStarted(true);
      if (cleaned.inquiry_topic) {
        sendMessage(cleaned.inquiry_topic);
      }
    } else {
      pendingIntake.current = null;
      setStarted(true);
    }
  }

  async function sendMessage(text: string) {
    if (!text || sending || !academyId) return;

    const parentMsg: Message = {
      role: 'parent',
      content: text,
      time: formatTime(),
    };
    setMessages((prev) => [...prev, parentMsg]);
    setInput('');
    setSending(true);

    // 첫 메시지에만 인테이크를 함께 전송하고 비운다.
    const intakeToSend = pendingIntake.current;
    pendingIntake.current = null;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academy_id: academyId,
          kakao_user_id: userId,
          message: text,
          ...(intakeToSend ? { intake: intakeToSend } : {}),
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

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input.trim());
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

        {!started ? (
          /* 상담 전 사전 양식(인테이크) */
          <div className="flex-1 overflow-y-auto bg-gray-50 p-5 space-y-4">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">상담 전 간단 정보 입력</p>
              <p className="text-xs text-gray-500 mt-1">
                작성하시면 상담내역에 이름으로 표시됩니다.
                <br />건너뛰셔도 바로 문의하실 수 있어요.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">연락주신 분 성함</label>
                <input type="text" value={intake.parent_name} onChange={(e) => setIntake({ ...intake, parent_name: e.target.value })} placeholder="예: 김미영" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEE500]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">자녀 이름</label>
                <input type="text" value={intake.child_name} onChange={(e) => setIntake({ ...intake, child_name: e.target.value })} placeholder="예: 김철수" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEE500]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">자녀와의 관계</label>
                  <input type="text" value={intake.relationship} onChange={(e) => setIntake({ ...intake, relationship: e.target.value })} placeholder="예: 엄마" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEE500]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">자녀 나이</label>
                  <input type="text" value={intake.child_age} onChange={(e) => setIntake({ ...intake, child_age: e.target.value })} placeholder="예: 13살 / 초5" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEE500]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">연락처(전화번호)</label>
                <input type="tel" value={intake.phone} onChange={(e) => setIntake({ ...intake, phone: e.target.value })} placeholder="예: 010-1234-5678" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEE500]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">상담 받을 내용</label>
                <textarea value={intake.inquiry_topic} onChange={(e) => setIntake({ ...intake, inquiry_topic: e.target.value })} placeholder="예: 중3 수학 내신 대비 상담받고 싶어요" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FEE500]" />
                <p className="text-[11px] text-gray-400 mt-1">입력하시면 첫 문의 메시지로 전송됩니다.</p>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleStart(true)}
                disabled={!academyId}
                className="w-full h-11 rounded-lg bg-[#3B1E54] text-white text-sm font-semibold hover:bg-[#2d1740] transition-colors disabled:opacity-40"
              >
                {academyId ? '상담 시작하기' : '학원 데이터를 불러오는 중...'}
              </button>
              <button
                type="button"
                onClick={() => handleStart(false)}
                disabled={!academyId}
                className="w-full h-10 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                양식 없이 바로 문의
              </button>
            </div>
          </div>
        ) : (
        <>
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
                  className={`max-w-[260px] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
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
        </>
        )}
      </div>
    </div>
  );
}
