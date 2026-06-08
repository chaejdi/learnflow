'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  MessageSquare,
  CalendarDays,
  BookOpen,
  Clock,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAcademy } from '@/hooks/useAcademy';
const navItems = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '상담 내역', href: '/dashboard/inquiries', icon: MessageSquare },
  { label: '예약 관리', href: '/dashboard/reservations', icon: CalendarDays },
  { label: '과목 관리', href: '/dashboard/subjects', icon: BookOpen },
  { label: '시간표 관리', href: '/dashboard/schedule', icon: Clock },
  { label: '결제 관리', href: '/dashboard/billing', icon: CreditCard },
  { label: '설정', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { academyName, isDemo } = useAcademy();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const { getBrowserClient } = await import('@/lib/supabase');
        const supabase = getBrowserClient();
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('academy_id');
    router.push('/login');
  }

  const navContent = (
    <>
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <Link
          href="/dashboard"
          title="런플로우"
          className="flex items-center gap-2.5 min-w-0"
        >
          {/* 런플로우 모노그램 마크 — 브랜드는 마크로 조용히, 메인은 학원명 */}
          <span className="flex-shrink-0 w-9 h-9 rounded-[10px] bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm ring-1 ring-black/5">
            <span className="text-white text-base font-extrabold leading-none">L</span>
          </span>
          <span className="block truncate text-[15px] font-bold text-gray-900 leading-tight">
            {academyName || (isDemo ? '데모 학원' : '대시보드')}
          </span>
        </Link>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors w-full"
        >
          <LogOut size={20} />
          로그아웃
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-gray-100"
        aria-label="메뉴 열기"
      >
        <Menu size={20} className="text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-white flex flex-col shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
              aria-label="메뉴 닫기"
            >
              <X size={20} />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-white border-r border-gray-100 h-screen sticky top-0">
        {navContent}
      </aside>
    </>
  );
}
