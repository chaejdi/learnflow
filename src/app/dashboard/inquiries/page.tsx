'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, RefreshCw, Loader2, FlaskConical, Pencil, X, CalendarPlus } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import TimeSelect from '@/components/TimeSelect';
import type { Conversation, ConversationStatus } from '@/types';

// 시작 시각 +1시간(종료 시각 기본값)
function plusOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

// Supabase 미설정 시 데모 데이터
const mockConversations: Conversation[] = [
  {
    id: '1',
    academy_id: 'demo',
    kakao_user_id: 'user1',
    status: 'active',
    needs_owner_reply: false,
    reservation_id: null,
    parent_name: '김영희',
    child_name: '김민준',
    relationship: '엄마',
    child_age: '초3',
    inquiry_topic: '초등 3학년 수학 수업 문의드려요',
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
    parent_name: null,
    child_name: null,
    relationship: null,
    child_age: null,
    inquiry_topic: null,
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
    parent_name: null,
    child_name: null,
    relationship: null,
    child_age: null,
    inquiry_topic: null,
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

// 이름 폼의 빈 문자열을 null 로 정리(익명 표시로 되돌릴 수 있게)
function normalizeNameForm(f: { parent_name: string; child_name: string; relationship: string; child_age: string; phone: string }) {
  return {
    parent_name: f.parent_name.trim() || null,
    child_name: f.child_name.trim() || null,
    relationship: f.relationship.trim() || null,
    child_age: f.child_age.trim() || null,
    phone: f.phone.trim() || null,
  };
}

// 상담내역 표시 이름.
// - 성함과 자녀 이름이 모두 있으면 "성함(자녀이름)"
// - 하나라도 없으면(양식 미작성 등) 기존처럼 "학부모 XXXX"(kakao_user_id 끝 4자리)
function displayName(conv: Pick<Conversation, 'kakao_user_id' | 'parent_name' | 'child_name'>) {
  if (conv.parent_name && conv.child_name) {
    return `${conv.parent_name}(${conv.child_name})`;
  }
  const hash = conv.kakao_user_id.slice(-4).toUpperCase();
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
  // 이름(인테이크) 수정 모달
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameForm, setNameForm] = useState({ parent_name: '', child_name: '', relationship: '', child_age: '', phone: '' });
  // 예약 생성 모달
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [showResvModal, setShowResvModal] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [creatingResv, setCreatingResv] = useState(false);
  const [resvForm, setResvForm] = useState<{
    parent_name: string; parent_phone: string; child_name: string; child_grade: string;
    subject_id: string; slot_date: string; slot_time_start: string; slot_time_end: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  }>({
    parent_name: '', parent_phone: '', child_name: '', child_grade: '',
    subject_id: '', slot_date: '', slot_time_start: '15:00', slot_time_end: '16:00',
    status: 'pending',
  });

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

      const res = await apiFetch(`/api/conversations?academy_id=${id}`);
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
      const res = await apiFetch('/api/conversations', {
        method: 'POST',
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
      const res = await apiFetch('/api/conversations/seed', { method: 'POST' });

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

  function openNameEdit() {
    if (!selected) return;
    setNameForm({
      parent_name: selected.parent_name || '',
      child_name: selected.child_name || '',
      relationship: selected.relationship || '',
      child_age: selected.child_age || '',
      phone: selected.phone || '',
    });
    setEditingName(true);
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    // 데모 모드: 로컬 상태만 갱신
    if (selected.id === '1' || selected.id === '2' || selected.id === '3') {
      const patched = { ...selected, ...normalizeNameForm(nameForm) };
      setSelected(patched);
      setConversations((prev) => prev.map((c) => (c.id === selected.id ? patched : c)));
      setEditingName(false);
      return;
    }
    try {
      setSavingName(true);
      const res = await apiFetch('/api/conversations', {
        method: 'PATCH',
        body: JSON.stringify({ conversation_id: selected.id, ...nameForm }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setSelected(data);
        setConversations((prev) => prev.map((c) => (c.id === data.id ? data : c)));
        setEditingName(false);
      } else {
        const json = await res.json();
        alert(`수정 실패: ${json.error}`);
      }
    } catch (error) {
      console.error('Failed to update name:', error);
    } finally {
      setSavingName(false);
    }
  }

  // 학원 과목 로드(예약 생성 모달의 과목 선택용)
  useEffect(() => {
    if (!academyId) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/subjects?academy_id=${academyId}`);
        const json = await res.json();
        if (res.ok && json.data) setSubjects(json.data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      } catch {
        /* ignore */
      }
    })();
  }, [academyId]);

  // "예약 생성" — 대화에서 정보 추출해 폼 프리필 후 모달 오픈
  async function openReservation() {
    if (!selected) return;
    const isDemo = selected.id === '1' || selected.id === '2' || selected.id === '3';
    // 기본값: 인테이크에서 가져오기
    const base = {
      parent_name: selected.parent_name || '',
      parent_phone: selected.phone || '',
      child_name: selected.child_name || '',
      child_grade: selected.child_age || '',
      subject_id: subjects[0]?.id || '',
      slot_date: '',
      slot_time_start: '15:00',
      slot_time_end: '16:00',
      status: 'pending' as const,
    };
    if (isDemo) {
      setResvForm(base);
      setShowResvModal(true);
      return;
    }
    try {
      setExtracting(true);
      setShowResvModal(true);
      const res = await apiFetch('/api/conversations/extract', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: selected.id }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const d = json.data;
        setResvForm({
          parent_name: d.parent_name || base.parent_name,
          parent_phone: d.phone || base.parent_phone,
          child_name: d.child_name || base.child_name,
          child_grade: base.child_grade,
          subject_id: d.subject_id || base.subject_id,
          slot_date: d.preferred_date || '',
          slot_time_start: d.preferred_time || '15:00',
          slot_time_end: d.preferred_time ? plusOneHour(d.preferred_time) : '16:00',
          status: 'pending',
        });
      } else {
        setResvForm(base);
      }
    } catch (error) {
      console.error('Failed to extract reservation:', error);
      setResvForm(base);
    } finally {
      setExtracting(false);
    }
  }

  async function handleCreateReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!resvForm.parent_name.trim()) { alert('연락주신 분 성함을 입력해주세요.'); return; }
    if (!resvForm.subject_id) { alert('과목을 선택해주세요.'); return; }
    if (!resvForm.slot_date) { alert('날짜를 입력해주세요.'); return; }
    if (resvForm.slot_time_start >= resvForm.slot_time_end) { alert('종료 시간은 시작 시간보다 늦어야 합니다.'); return; }

    // 데모: 생성 동작만 안내
    if (selected.id === '1' || selected.id === '2' || selected.id === '3') {
      alert('데모 모드에서는 실제 예약이 생성되지 않습니다.');
      setShowResvModal(false);
      return;
    }
    try {
      setCreatingResv(true);
      const res = await apiFetch('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          academy_id: academyId,
          parent_name: resvForm.parent_name,
          parent_phone: resvForm.parent_phone || null,
          child_name: resvForm.child_name || null,
          child_grade: resvForm.child_grade || null,
          subject_id: resvForm.subject_id,
          slot_date: resvForm.slot_date,
          slot_time_start: resvForm.slot_time_start,
          slot_time_end: resvForm.slot_time_end,
          status: resvForm.status,
        }),
      });
      if (res.ok) {
        setShowResvModal(false);
        alert('예약이 생성되었습니다. 예약 관리에서 확인하세요.');
      } else {
        const json = await res.json();
        alert(`예약 생성 실패: ${json.error}`);
      }
    } catch (error) {
      console.error('Failed to create reservation:', error);
    } finally {
      setCreatingResv(false);
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
                      {displayName(conv)}
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
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-primary-500" />
                    <span className="font-medium text-gray-900">
                      {displayName(selected)}
                    </span>
                    <button
                      onClick={openNameEdit}
                      title="이름 수정"
                      className="p-1 text-gray-400 hover:text-primary-500 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMap[selected.status].cls}`}
                    >
                      {statusMap[selected.status].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={openReservation}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-accent-500 text-white text-xs font-semibold hover:bg-accent-600 transition-colors"
                    >
                      <CalendarPlus size={14} /> 예약 생성
                    </button>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      메시지 {selected.messages.length}개
                    </span>
                  </div>
                </div>
                {/* 사전 양식 정보 */}
                {(selected.relationship || selected.child_age || selected.phone || selected.inquiry_topic) && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    {selected.relationship && <span>관계: {selected.relationship}</span>}
                    {selected.child_age && <span>자녀 나이: {selected.child_age}</span>}
                    {selected.phone && <span>연락처: {selected.phone}</span>}
                    {selected.inquiry_topic && <span className="text-gray-600">상담 내용: {selected.inquiry_topic}</span>}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {selected.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'parent' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
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

      {/* 이름(인테이크) 수정 모달 */}
      {editingName && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingName(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">상담자 정보 수정</h2>
              <button onClick={() => setEditingName(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">성함과 자녀 이름이 모두 있어야 목록에 &quot;성함(자녀이름)&quot;으로 표시됩니다. 비우면 익명(학부모 XXXX)으로 돌아갑니다.</p>
            <form onSubmit={handleSaveName} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락주신 분 성함</label>
                <input type="text" value={nameForm.parent_name} onChange={(e) => setNameForm({ ...nameForm, parent_name: e.target.value })} placeholder="예: 김미영" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">자녀 이름</label>
                <input type="text" value={nameForm.child_name} onChange={(e) => setNameForm({ ...nameForm, child_name: e.target.value })} placeholder="예: 김철수" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">관계</label>
                  <input type="text" value={nameForm.relationship} onChange={(e) => setNameForm({ ...nameForm, relationship: e.target.value })} placeholder="예: 엄마" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">자녀 나이</label>
                  <input type="text" value={nameForm.child_age} onChange={(e) => setNameForm({ ...nameForm, child_age: e.target.value })} placeholder="예: 13살 / 초5" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처(전화번호)</label>
                <input type="tel" value={nameForm.phone} onChange={(e) => setNameForm({ ...nameForm, phone: e.target.value })} placeholder="예: 010-1234-5678" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingName(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
                <button type="submit" disabled={savingName} className="h-10 px-6 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50">
                  {savingName ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 예약 생성 모달 */}
      {showResvModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowResvModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">예약 생성</h2>
              <button onClick={() => setShowResvModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {extracting ? 'AI가 대화에서 예약 정보를 불러오는 중...' : '대화에서 추출한 정보입니다. 확인·수정 후 생성하면 예약 관리에 등록됩니다.'}
            </p>
            <form onSubmit={handleCreateReservation} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락주신 분 성함 <span className="text-red-400">*</span></label>
                  <input type="text" value={resvForm.parent_name} onChange={(e) => setResvForm({ ...resvForm, parent_name: e.target.value })} placeholder="예: 김미영" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                  <input type="tel" value={resvForm.parent_phone} onChange={(e) => setResvForm({ ...resvForm, parent_phone: e.target.value })} placeholder="010-1234-5678" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">자녀 이름</label>
                  <input type="text" value={resvForm.child_name} onChange={(e) => setResvForm({ ...resvForm, child_name: e.target.value })} placeholder="예: 김철수" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                  <input type="text" value={resvForm.child_grade} onChange={(e) => setResvForm({ ...resvForm, child_grade: e.target.value })} placeholder="예: 중3" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">과목 <span className="text-red-400">*</span></label>
                <select value={resvForm.subject_id} onChange={(e) => setResvForm({ ...resvForm, subject_id: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">과목을 선택하세요</option>
                  {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜 <span className="text-red-400">*</span></label>
                <input type="date" value={resvForm.slot_date} onChange={(e) => setResvForm({ ...resvForm, slot_date: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                  <TimeSelect value={resvForm.slot_time_start} onChange={(v) => setResvForm({ ...resvForm, slot_time_start: v })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                  <TimeSelect value={resvForm.slot_time_end} onChange={(v) => setResvForm({ ...resvForm, slot_time_end: v })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select value={resvForm.status} onChange={(e) => setResvForm({ ...resvForm, status: e.target.value as typeof resvForm.status })} className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="pending">대기</option>
                  <option value="confirmed">확정</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowResvModal(false)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
                <button type="submit" disabled={creatingResv || extracting} className="h-10 px-6 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition-colors disabled:opacity-50">
                  {creatingResv ? '생성 중...' : '예약 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
