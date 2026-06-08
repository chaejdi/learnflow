'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, Copy, CheckCheck } from 'lucide-react';
import { useAcademy } from '@/hooks/useAcademy';
import { apiFetch } from '@/lib/api-client';

interface AcademyForm {
  name: string;
  address: string;
  phone: string;
  description: string;
  kakao_channel_id: string;
}

const defaultForm: AcademyForm = {
  name: '우리동네 수학학원',
  address: '서울시 강남구 역삼동 123-45',
  phone: '02-1234-5678',
  description: '초등·중등 수학 전문 학원. 개별 맞춤 수업으로 아이의 수학 자신감을 키워드립니다.',
  kakao_channel_id: '',
};

export default function SettingsPage() {
  const { academyId, isDemo, loading: academyLoading } = useAcademy();
  const [form, setForm] = useState<AcademyForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // B안: 모든 학원이 동일한 웹훅 URL을 사용한다. 학원 구분은 카카오 봇 ID로 한다.
  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/kakao/webhook`
      : '';

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fetchAcademy = useCallback(async () => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    if (!academyId) return;

    try {
      setLoading(true);
      const res = await apiFetch(`/api/academies?id=${academyId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setForm({
          name: json.data.name || '',
          address: json.data.address || '',
          phone: json.data.phone || '',
          description: json.data.description || '',
          kakao_channel_id: json.data.kakao_channel_id || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch academy:', error);
    } finally {
      setLoading(false);
    }
  }, [academyId, isDemo]);

  useEffect(() => {
    if (!academyLoading) fetchAcademy();
  }, [academyLoading, fetchAcademy]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (isDemo) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    try {
      setSaving(true);
      const res = await apiFetch('/api/academies', {
        method: 'PATCH',
        body: JSON.stringify({ id: academyId, ...form }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save academy:', error);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  if (loading || academyLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">학원 설정</h1>

      <form
        onSubmit={handleSave}
        className="max-w-xl bg-white rounded-xl border border-gray-100 p-6 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            학원 이름
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            주소
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            전화번호
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            학원 소개
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            AI 상담봇이 학부모에게 안내할 때 이 내용을 참고합니다
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            카카오 봇 ID
          </label>
          <input
            type="text"
            value={form.kakao_channel_id}
            onChange={(e) =>
              setForm({ ...form, kakao_channel_id: e.target.value })
            }
            placeholder="예: 6634abcd... (오픈빌더 봇 ID)"
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">
            이 학원의 카카오 채널을 식별하는 값입니다. 모르면 아래 웹훅 URL을 먼저 등록한 뒤,
            채널에 아무 메시지나 보내보세요. 봇이 자동으로 봇 ID를 알려줍니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-6 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              '저장하기'
            )}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check size={16} />
              저장되었습니다
            </span>
          )}
        </div>
      </form>

      {/* 카카오 오픈빌더 웹훅 URL */}
      {webhookUrl && (
        <div className="max-w-xl mt-8 bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">카카오 오픈빌더 연동</h2>
          <p className="text-sm text-gray-500">
            아래 URL을 카카오 i 오픈빌더 스킬에 등록하세요. 모든 학원이 같은 URL을 사용하며,
            학원 구분은 위의 &quot;카카오 봇 ID&quot;로 자동 처리됩니다.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 font-mono select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="h-10 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="복사"
            >
              {copied ? (
                <CheckCheck size={16} className="text-green-600" />
              ) : (
                <Copy size={16} className="text-gray-500" />
              )}
            </button>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <p>1. 카카오 i 오픈빌더에서 스킬 생성 → 위 URL 등록 (모든 학원 공통)</p>
            <p>2. 시나리오 → 폴백 블록 → 스킬 연결 후 배포</p>
            <p>3. 채널에 테스트 메시지를 보내면 봇이 &quot;봇 ID&quot;를 알려줍니다</p>
            <p>4. 그 값을 위 &quot;카카오 봇 ID&quot;에 입력하고 저장하면 연결 완료</p>
          </div>
        </div>
      )}
    </div>
  );
}
