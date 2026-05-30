'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: '기능', href: '#features' },
  { label: '이용방법', href: '#how-it-works' },
  { label: '요금', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="text-xl font-bold text-primary-500">
          런플로우
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
          >
            로그인
          </a>
          <a
            href="#pricing"
            className="inline-flex h-10 items-center px-5 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            무료로 시작하기
          </a>
        </nav>

        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="메뉴"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-gray-600 py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="block text-sm font-medium text-primary-500 py-2"
          >
            로그인
          </a>
          <a
            href="#pricing"
            className="block text-center h-10 leading-10 rounded-lg bg-primary-500 text-white text-sm font-semibold"
          >
            무료로 시작하기
          </a>
        </div>
      )}
    </header>
  );
}
