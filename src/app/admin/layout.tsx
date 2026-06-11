'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, LayoutDashboard, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const { getBrowserClient } = await import('@/lib/supabase');
        await getBrowserClient().auth.signOut();
      }
    } catch { /* ignore */ }
    localStorage.removeItem('academy_id');
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-14 bg-[#1e1b2e] text-white flex items-center px-5 gap-4 sticky top-0 z-30">
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <Shield size={18} className="text-primary-300" />
          런플로우 <span className="text-white/50 font-medium">관리자</span>
        </Link>
        <div className="flex-1" />
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
          <LayoutDashboard size={16} /> 내 학원 대시보드
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
          <LogOut size={16} /> 로그아웃
        </button>
      </header>
      <main className="p-6 md:p-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
