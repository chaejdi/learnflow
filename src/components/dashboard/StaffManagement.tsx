'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, UserPlus, Mail, Trash2, Check, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface Member {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff' | 'admin';
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const roleLabel: Record<string, string> = {
  owner: '원장',
  staff: '선생님',
  admin: '관리자',
};

export default function StaffManagement({ isDemo }: { isDemo: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  const fetchStaff = useCallback(async () => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch('/api/staff');
      const json = await res.json();
      if (res.ok) {
        setMembers(json.members || []);
        setInvitations(json.invitations || []);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) return;

    if (isDemo) {
      setError('데모 모드에서는 초대할 수 없습니다.');
      return;
    }

    try {
      setInviting(true);
      const res = await apiFetch('/api/staff', {
        method: 'POST',
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || '초대에 실패했습니다.');
        return;
      }
      setEmail('');
      await fetchStaff();
    } catch {
      setError('초대 중 오류가 발생했습니다.');
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!confirm('이 초대를 취소할까요?')) return;
    await apiFetch(`/api/staff?invite_id=${inviteId}`, { method: 'DELETE' });
    await fetchStaff();
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`${name} 선생님을 학원에서 내보낼까요?`)) return;
    await apiFetch(`/api/staff?user_id=${userId}`, { method: 'DELETE' });
    await fetchStaff();
  }

  return (
    <div className="max-w-xl mt-8 bg-white rounded-xl border border-gray-100 p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">직원(선생님) 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          선생님을 이메일로 초대하세요. 초대한 이메일로 회원가입하면 자동으로 학원에 연결됩니다.
          선생님은 상담·예약·과목·시간표를 보고 관리할 수 있으며, 전환율 분석·결제·설정은 볼 수 없습니다.
        </p>
      </div>

      {/* 초대 폼 */}
      <form onSubmit={handleInvite} className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="선생님 이메일 주소"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="h-10 px-4 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
          >
            {inviting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            초대
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={22} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* 멤버 목록 */}
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.name || m.email.split('@')[0]}
                    <span className="ml-2 text-xs font-normal text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                      {roleLabel[m.role] || m.role}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
                {m.role === 'staff' && (
                  <button
                    onClick={() => handleRemove(m.id, m.name || '선생님')}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="내보내기"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 대기중 초대 */}
          {invitations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400">대기중인 초대</p>
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <Clock size={14} className="text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600 truncate">{inv.email}</span>
                    <span className="text-xs text-amber-600 flex-shrink-0">가입 대기</span>
                  </div>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="초대 취소"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {members.length <= 1 && invitations.length === 0 && (
            <p className="flex items-center gap-1.5 text-sm text-gray-400 py-2">
              <Check size={15} /> 아직 초대한 선생님이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
