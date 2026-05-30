'use client';

import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface MockConversation {
  id: string;
  parent: string;
  lastMessage: string;
  time: string;
  status: 'active' | 'resolved' | 'escalated';
  messages: { role: 'parent' | 'ai' | 'owner'; content: string; time: string }[];
}

const mockConversations: MockConversation[] = [
  {
    id: '1',
    parent: '김○○ 학부모',
    lastMessage: '체험수업 예약해주세요',
    time: '10분 전',
    status: 'active',
    messages: [
      { role: 'parent', content: '초등 3학년 수학 수업 문의드려요', time: '17:30' },
      {
        role: 'ai',
        content:
          '안녕하세요! 문의 감사합니다. 초등 3학년 수학반은 화·목 3:30~5:00 수업이 운영 중이에요. 체험수업도 가능한데, 예약해드릴까요?',
        time: '17:30',
      },
      { role: 'parent', content: '체험수업 예약해주세요', time: '17:32' },
    ],
  },
  {
    id: '2',
    parent: '이○○ 학부모',
    lastMessage: '감사합니다!',
    time: '1시간 전',
    status: 'resolved',
    messages: [
      { role: 'parent', content: '중등 영어 시간표 알려주세요', time: '16:00' },
      {
        role: 'ai',
        content: '중등 영어반은 월·수·금 5:00~6:30에 운영됩니다. 현재 2자리 남아있어요!',
        time: '16:00',
      },
      { role: 'parent', content: '감사합니다!', time: '16:05' },
    ],
  },
  {
    id: '3',
    parent: '박○○ 학부모',
    lastMessage: '수강료 할인 가능한가요?',
    time: '3시간 전',
    status: 'escalated',
    messages: [
      { role: 'parent', content: '수강료 할인 가능한가요?', time: '14:00' },
      {
        role: 'ai',
        content:
          '수강료 관련 문의는 원장님께서 직접 안내드리겠습니다. 잠시만 기다려주세요!',
        time: '14:00',
      },
    ],
  },
];

const statusMap: Record<string, { label: string; cls: string }> = {
  active: { label: '진행 중', cls: 'bg-blue-50 text-blue-600' },
  resolved: { label: '완료', cls: 'bg-green-50 text-green-600' },
  escalated: { label: '확인 필요', cls: 'bg-orange-50 text-orange-600' },
};

export default function InquiriesPage() {
  const [selected, setSelected] = useState<MockConversation | null>(
    mockConversations[0]
  );
  const [replyText, setReplyText] = useState('');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">상담 내역</h1>

      <div className="flex gap-4 h-[calc(100vh-10rem)]">
        {/* List */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-100 overflow-y-auto">
          {mockConversations.map((conv) => (
            <button
              key={conv.id}
              className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                selected?.id === conv.id ? 'bg-primary-50' : ''
              }`}
              onClick={() => setSelected(conv)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-900">
                  {conv.parent}
                </span>
                <span className="text-xs text-gray-400">{conv.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 truncate flex-1">
                  {conv.lastMessage}
                </p>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusMap[conv.status].cls}`}
                >
                  {statusMap[conv.status].label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Chat */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 flex flex-col">
          {selected ? (
            <>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-primary-500" />
                  <span className="font-medium text-gray-900">
                    {selected.parent}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMap[selected.status].cls}`}
                  >
                    {statusMap[selected.status].label}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {selected.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'parent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'parent'
                          ? 'bg-primary-500 text-white rounded-tr-sm'
                          : msg.role === 'owner'
                            ? 'bg-accent-50 text-gray-800 rounded-tl-sm'
                            : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      }`}
                    >
                      {msg.role !== 'parent' && (
                        <span className="text-[10px] font-medium text-gray-400 block mb-0.5">
                          {msg.role === 'ai' ? 'AI' : '원장님'}
                        </span>
                      )}
                      {msg.content}
                      <span className="block text-[10px] text-right mt-1 opacity-60">
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {selected.status === 'escalated' && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="학부모에게 직접 답변하기..."
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button className="h-10 px-4 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              대화를 선택해주세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
