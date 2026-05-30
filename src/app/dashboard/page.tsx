import { MessageSquare, CalendarDays, Users, TrendingUp } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';

const mockStats = [
  { title: '이번 달 문의', value: 47, change: 23, icon: MessageSquare },
  { title: '체험수업 예약', value: 18, change: 12, icon: CalendarDays },
  { title: '신규 등록', value: 8, change: 33, icon: Users },
  { title: '전환율', value: '17%', change: 5, icon: TrendingUp },
];

const recentInquiries = [
  {
    id: '1',
    parent: '김○○ 학부모',
    message: '초등 3학년 수학 수업 문의드려요',
    time: '10분 전',
    status: 'active',
  },
  {
    id: '2',
    parent: '이○○ 학부모',
    message: '중등 영어 시간표 알려주세요',
    time: '1시간 전',
    status: 'resolved',
  },
  {
    id: '3',
    parent: '박○○ 학부모',
    message: '수강료 할인 가능한가요?',
    time: '3시간 전',
    status: 'escalated',
  },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-blue-50 text-blue-600',
    resolved: 'bg-green-50 text-green-600',
    escalated: 'bg-orange-50 text-orange-600',
  };
  const labels: Record<string, string> = {
    active: '진행 중',
    resolved: '완료',
    escalated: '확인 필요',
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mockStats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            최근 문의
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {recentInquiries.map((item) => (
            <div
              key={item.id}
              className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-gray-900">
                    {item.parent}
                  </span>
                  {statusBadge(item.status)}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {item.message}
                </p>
              </div>
              <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
