'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, RefreshCw, Loader2, FlaskConical } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import type { Conversation, ConversationStatus } from '@/types';

// Supabase 미설정 시 데모 데이터
const mockConversations: Conversation[] = [
  {
    id: '1',
    academy_id: 'demo',
    kakao_user_id: 'user1',
    status: 'active',
    needs_owner_reply: false,
    reservation_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    messages: [
      { role: 'parent', content: '초등 3학년 수학 수업 문의드려요', timestamp: '2025-06-01T17:30:00Z' },
      {
        role: 'ai',
        content: '안녕하세요! 문의 감사합니다. 초등 3학년 수학반은 화·목 3:30~5:00 수업이 운영 중이에요. 체험수업도 가능한데, 예약해드릴까요?',
        timestamp: '2025-06-01T17:30:05Z',
      },
      { role: 'parent', content: '체험수업 예약해주세요', timestamp: '2025-06-01T17:32:00Z' },
    ],
  },
  {
    id: '2',
    academy_id: 'demo',
    kakao_user_id: 'user2',
    status: 'resolved',
    needs_owner_reply: false,
    reservation_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    messages: [
      { role: 'parent', content: '중등 영어 시간표 알려주세요', timestamp: '2025-06-01T16:00:00Z' },
      {
        role: 'ai',
        content: '중등 영어반은 월·수·금 5:00~6:30에 운영됩니다. 현재 2자리 남아있어요!',
        timestamp: '2025-06-01T16:00:05Z',
      },
      { role: 'parent', content: '감사합니다!', timestamp: '2025-06-01T16:05:00Z' },
    ],
  },
  {
    id: '3',
    academy_id: 'demo',
    kakao_user_id: 'user3',
    status: 'escalated',
    needs_owner_reply: true,
    reservation_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    messages: [
      { role: 'parent', content: '수강료 할인 가능한가요?', timestamp: '2025-06-01T14:00:00Z' },
      {
        role: 'ai',
        content: '수강료 관련 문의는 원장님께서 직접 안내드리겠습니다. 잠시만 기다려주세요!',
        timestamp: '2025-06-01T14:00:05Z',
      },
    ],
  },
];

const statusMap: Record<ConversationStatus, { label: string; cls: string }> = {
  active: { label: '진행 중', cls: 'bg-blue-50 text-blue-600' },
  resolved: { label: '완료', cls: 'bg-green-50 text-green-600' },
  escalated: { label: '확인 필요', cls: 'bg-orange-50 text-orange-600' },
};

function isSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(timestamp: string) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

// 카카오 유저 ID를 익명화된 이름으로 표시
function displayName(kakaoUserId: string) {
  const hash = kakaoUserId.slice(-4).toUpperCase();
  return `학부모 ${hash}`;
}

export default function InquiriesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<ConversationStatus | 'all'>('all');
  const [seeding, setSeeding] = useState(false);
  const [academyId, setAcademyId] = useState<string>('');

  // academy_id를 resolve: localStorage -> Supabase에서 첫 번째 학원 조회
  const resolveAcademyId = useCallback(async (): Promise<string> => {
    // 로그인한 원장님 본인의 학원만 조회
    try {
      const res = await apiFetch('/api/academies/me');
      const json = await res.json();
      if (res.ok && json.data?.id) {
        localStorage.setItem('academy_id', json.data.id);
        return json.data.id;
      }
      localStorage.removeItem('academy_id');
    } catch (error) {
      console.error('Failed to resolve academy:', error);
    }
    return '';
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setConversations(mockConversations);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const id = await resolveAcademyId();
      setAcademyId(id);

      if (!id) {
        setConversations([]);
        return;
      }

      const res = await fetch(`/api/conversations?academy_id=${id}`);
      const json = await res.json();

      if (res.ok && json.data) {
        setConversations(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [resolveAcademyId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 선택된 대화가 목록 갱신 후에도 최신 상태를 반영하도록
  useEffect(() => {
    if (selected) {
      const updated = conversations.find((c) => c.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [conversations, selected]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;

    if (!isSupabaseConfigured()) {
      // 데모 모드: 로컬 상태만 업데이트
      const newMessage = {
        role: 'owner' as const,
        content: replyText,
        timestamp: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                messages: [...c.messages, newMessage],
                status: 'resolved' as ConversationStatus,
                needs_owner_reply: false,
              }
            : c
        )
      );
      setReplyText('');
      return;
    }

    try {
      setSending(true);
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selected.id,
          message: replyText,
        }),
      });

      if (res.ok) {
        setReplyText('');
        await fetchConversations();
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  }

  async function handleSeedTestData() {
    try {
      setSeeding(true);
      const res = await fetch('/api/conversations/seed', { method: 'POST' });

      if (res.ok) {
        // 시드에서 학원도 생성했을 수 있으므로 academy_id 캐시 초기화
        localStorage.removeItem('academy_id');
        await fetchConversations();
      } else {
        const json = await res.json();
        alert(`생성 실패: ${json.error}`);
      }
    } catch (error) {
      console.error('Failed to seed test data:', error);
      alert('테스트 데이터 생성에 실패했습니다.');
    } finally {
      setSeeding(false);
    }
  }

  const filtered =
    filter === 'all'
      ? conversations
      : conversations.filter((c) => c.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">상담 내역</h1>
        <button
          onClick={fetchConversations}
          disabled={loading}
          className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        {([['all', '전체'], ['active', '진행 중'], ['escalated', '확인 필요'], ['resolved', '완료']] as const).map(
          ([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
              {value !== 'all' && (
                <span className="ml-1.5 text-xs opacity-75">
                  {conversations.filter((c) => c.status === value).length}
                </span>
              )}
            </button>
          )
        )}
      </div>

      <div className="flex gap-4 h-[calc(100vh-14rem)]">
        {/* 대화 목록 */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-100 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm text-gray-400 mb-4">
                상담 내역이 없습니다
              </p>
              {isSupabaseConfigured() && filter === 'all' && (
                <button
                  onClick={handleSeedTestData}
                  disabled={seeding}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {seeding ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FlaskConical size={14} />
                  )}
                  테스트 대화 생성
                </button>
              )}
            </div>
          ) : (
            filtered.map((conv) => {
              const lastMsg = conv.messages[conv.messages.length - 1];
              return (
                <button
                  key={conv.id}
                  className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    selected?.id === conv.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => setSelected(conv)}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-900">
                      {displayName(conv.kakao_user_id)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(conv.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 truncate flex-1">
                      {lastMsg?.content || ''}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${statusMap[conv.status].cls}`}
                    >
                      {statusMap[conv.status].label}
                    </span>
                  </div>
                  {conv.needs_owner_reply && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
                      답변 필요
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* 채팅 영역 */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 flex flex-col">
          {selected ? (
            <>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-primary-500" />
                  <span className="font-medium text-gray-900">
                    {displayName(selected.kakao_user_id)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMap[selected.status].cls}`}
                  >
                    {statusMap[selected.status].label}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  메시지 {selected.messages.length}개
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {selected.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'parent' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'parent'
                          ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                          : msg.role === 'owner'
                            ? 'bg-primary-500 text-white rounded-tr-sm'
                            : 'bg-accent-50 text-gray-800 rounded-tr-sm border border-accent-200'
                      }`}
                    >
                      {msg.role === 'parent' ? (
                        <span className="text-[10px] font-medium text-gray-400 block mb-0.5">
                          학부모
                        </span>
                      ) : (
                        <span className={`text-[10px] font-medium block mb-0.5 ${msg.role === 'owner' ? 'text-white/70' : 'text-gray-400'}`}>
                          {msg.role === 'ai' ? 'AI 상담봇' : '원장님'}
                        </span>
                      )}
                      {msg.content}
                      <span className="block text-[10px] text-right mt-1 opacity-60">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 원장님 답변 입력 - escalated 상태이거나 needs_owner_reply일 때 */}
              {(selected.status === 'escalated' || selected.needs_owner_reply) && (
                <form
                  onSubmit={handleReply}
                  className="px-5 py-3 border-t border-gray-100"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="학부모에게 직접 답변하기..."
                      disabled={sending}
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="h-10 px-4 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </form>
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
