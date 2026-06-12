'use client';

import { useRouter } from 'next/navigation';
import { Loader2, Building2, LogOut } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAcademy } from '@/hooks/useAcademy';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { academyId, loading, isDemo, role } = useAcademy();

  async function handleLogout() {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const { getBrowserClient } = await import('@/lib/supabase');
        await getBrowserClient().auth.signOut();
      }
    } catch {
      /* ignore */
    }
    localStorage.removeItem('academy_id');
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  // 로그인은 됐지만 소속 학원이 없는 경우(예: 원장이 선생님을 내보냄, 초대 취소 등).
  // 빈 대시보드 대신 안내 화면을 보여준다. (데모 모드는 제외)
  if (!isDemo && !academyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
            <Building2 size={24} className="text-amber-500" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-gray-900">소속된 학원이 없습니다</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {role === 'staff'
                ? '현재 연결된 학원이 없어요. 원장님께 다시 초대를 요청해 주세요. 초대 링크로 다시 가입하면 바로 연결됩니다.'
                : '등록된 학원이 없습니다. 회원가입 시 학원이 만들어지지 않았다면 다시 가입하거나 문의해 주세요.'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full h-10 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
    </div>
  );
}
