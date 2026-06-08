'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

function isSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function useAcademy() {
  const [academyId, setAcademyId] = useState<string>('');
  const [academyName, setAcademyName] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const resolveAcademyId = useCallback(async (): Promise<string> => {
    if (!isSupabaseConfigured()) {
      setIsDemo(true);
      return '';
    }

    // 세션 토큰 가져오기
    try {
      const { getBrowserClient } = await import('@/lib/supabase');
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setToken(session.access_token);
      }
    } catch { /* ignore */ }

    // 로그인한 원장님 본인의 학원만 조회 (owner_id = 로그인 유저)
    try {
      const res = await apiFetch('/api/academies/me');
      const json = await res.json();
      if (res.ok && json.data?.id) {
        localStorage.setItem('academy_id', json.data.id);
        setAcademyName(json.data.name || '');
        return json.data.id;
      }
      // 로그인했지만 학원이 없으면 stale 캐시 제거
      localStorage.removeItem('academy_id');
    } catch (error) {
      console.error('Failed to resolve academy:', error);
    }
    return '';
  }, []);

  useEffect(() => {
    resolveAcademyId().then((id) => {
      setAcademyId(id);
      setLoading(false);
    });
  }, [resolveAcademyId]);

  return { academyId, academyName, token, isDemo, loading };
}
