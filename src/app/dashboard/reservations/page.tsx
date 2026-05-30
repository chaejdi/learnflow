'use client';

import { CalendarDays } from 'lucide-react';

const mockReservations = [
  {
    id: '1',
    parentName: '김○○',
    childName: '김민준',
    childGrade: '초3',
    subject: '수학',
    date: '2026-05-30',
    time: '15:30~17:00',
    status: 'confirmed',
  },
  {
    id: '2',
    parentName: '이○○',
    childName: '이서연',
    childGrade: '중1',
    subject: '영어',
    date: '2026-05-31',
    time: '17:00~18:30',
    status: 'pending',
  },
  {
    id: '3',
    parentName: '박○○',
    childName: '박지호',
    childGrade: '초5',
    subject: '국어',
    date: '2026-06-02',
    time: '15:30~17:00',
    status: 'cancelled',
  },
];

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '대기 중', cls: 'bg-yellow-50 text-yellow-600' },
  confirmed: { label: '확정', cls: 'bg-green-50 text-green-600' },
  cancelled: { label: '취소', cls: 'bg-red-50 text-red-500' },
  completed: { label: '완료', cls: 'bg-gray-50 text-gray-500' },
};

export default function ReservationsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">예약 관리</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                학부모
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                학생
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                과목
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                날짜 / 시간
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                상태
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {mockReservations.map((res) => (
              <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 text-sm text-gray-900 font-medium">
                  {res.parentName}
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">
                  {res.childName} ({res.childGrade})
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">
                  {res.subject}
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-gray-400" />
                    {res.date} {res.time}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMap[res.status].cls}`}
                  >
                    {statusMap[res.status].label}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {res.status === 'pending' && (
                    <div className="flex gap-2">
                      <button className="text-xs px-3 py-1 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors">
                        확정
                      </button>
                      <button className="text-xs px-3 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        취소
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
