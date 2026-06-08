'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, CalendarDays, Users, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import StatsCard from '@/components/dashboard/StatsCard';
import { useAcademy } from '@/hooks/useAcademy';
import { apiFetch } from '@/lib/api-client';
import type { Conversation, ConversationStatus } from '@/types';

const statusMap: Record<ConversationStatus, { label: string; cls: string }> = {
  active: { label: '진행 중', cls: 'bg-blue-50 text-blue-600' },
  resolved: { label: '완료', cls: 'bg-green-50 text-green-600' },
  escalated: { label: '확인 필요', cls: 'bg-orange-50 text-orange-600' },
};

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

function displayName(kakaoUserId: string) {
  const hash = kakaoUserId.slice(-4).toUpperCase();
  return `${hash} 학부모`;
}

const mockStats = [
  { title: '이번 달 문의', value: 47, change: 23, icon: MessageSquare },
  { title: '체험수업 예약', value: 18, change: 12, icon: CalendarDays },
  { title: '신규 등록', value: 8, change: 33, icon: Users },
  { title: '전환율', value: '17%', change: 5, icon: TrendingUp },
];

const mockInquiries: Conversation[] = [
  {
    id: '1', academy_id: 'demo', kakao_user_id: 'user1', status: 'active',
    needs_owner_reply: false, reservation_id: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    messages: [{ role: 'parent', content: '초등 3학년 수학 수업 문의드려요', timestamp: new Date().toISOString() }],
  },
  {
    id: '2', academy_id: 'demo', kakao_user_id: 'user2', status: 'resolved',
    needs_owner_reply: false, reservation_id: null,
    created_at: new Date().toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString(),
    messages: [{ role: 'parent', content: '중등 영어 시간표 알려주세요', timestamp: new Date().toISOString() }],
  },
  {
    id: '3', academy_id: 'demo', kakao_user_id: 'user3', status: 'escalated',
    needs_owner_reply: true, reservation_id: null,
    created_at: new Date().toISOString(), updated_at: new Date(Date.now() - 10800000).toISOString(),
    messages: [{ role: 'parent', content: '수강료 할인 가능한가요?', timestamp: new Date().toISOString() }],
  },
];

export default function DashboardPage() {
  const { academyId, isDemo, loading: academyLoading } = useAcademy();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(mockStats);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (isDemo) {
      setRecentConversations(mockInquiries);
      setLoading(false);
      return;
    }
    if (!academyId) {
      // 로그인했지만 학원이 아직 없음(온보딩 전) — 스피너에 멈추지 않도록 종료
      setRecentConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [convRes, resRes, subRes] = await Promise.all([
        apiFetch(`/api/conversations?academy_id=${academyId}`),
        apiFetch(`/api/reservations?academy_id=${academyId}`),
        apiFetch(`/api/subjects?academy_id=${academyId}`),
      ]);

      const convJson = await convRes.json();
      const resJson = await resRes.json();
      const subJson = await subRes.json();

      const conversations: Conversation[] = convJson.data || [];
      const reservations = resJson.data || [];
      const subjects = subJson.data || [];

      // 이번 달 필터링
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thisMonthConversations = conversations.filter(
        (c) => c.created_at >= monthStart
      );
      const thisMonthReservations = reservations.filter(
        (r: { created_at: string }) => r.created_at >= monthStart
      );

      const totalInquiries = thisMonthConversations.length;
      const totalReservations = thisMonthReservations.length;
      const totalEnrolled = subjects.reduce(
        (sum: number, s: { enrolled_count: number }) => sum + (s.enrolled_count || 0),
        0
      );
      const conversionRate = totalInquiries > 0
        ? Math.round((totalReservations / totalInquiries) * 100)
        : 0;

      setStats([
        { title: '이번 달 문의', value: totalInquiries, change: 0, icon: MessageSquare },
        { title: '체험수업 예약', value: totalReservations, change: 0, icon: CalendarDays },
        { title: '현재 등록 학생', value: totalEnrolled, change: 0, icon: Users },
        { title: '전환율', value: `${conversionRate}%`, change: 0, icon: TrendingUp },
      ]);

      setRecentConversations(conversations.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [academyId, isDemo]);

  useEffect(() => {
    if (!academyLoading) fetchDashboardData();
  }, [academyLoading, fetchDashboardData]);

  if (loading || academyLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">최근 문의</h2>
          <Link
            href="/dashboard/inquiries"
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            전체 보기
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentConversations.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              아직 문의가 없습니다
            </div>
          ) : (
            recentConversations.map((conv) => {
              const lastMsg = conv.messages[conv.messages.length - 1];
              return (
                <Link
                  key={conv.id}
                  href="/dashboard/inquiries"
                  className="block px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900">
                          {displayName(conv.kakao_user_id)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMap[conv.status].cls}`}
                        >
                          {statusMap[conv.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {lastMsg?.content || ''}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                      {formatRelativeTime(conv.updated_at)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
