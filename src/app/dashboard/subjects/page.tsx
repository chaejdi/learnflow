'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { useAcademy } from '@/hooks/useAcademy';
import { apiFetch } from '@/lib/api-client';
import type { Subject } from '@/types';

interface SubjectForm {
  name: string;
  target_grade: string;
  schedule: string;
  monthly_fee: number;
  material_fee: number;
  capacity: number;
}

const emptyForm: SubjectForm = {
  name: '',
  target_grade: '',
  schedule: '',
  monthly_fee: 0,
  material_fee: 0,
  capacity: 10,
};

const mockSubjects: Subject[] = [
  {
    id: '1',
    academy_id: 'demo',
    name: '초등 수학 기초반',
    target_grade: '초등 1~3학년',
    schedule: '월·수·금 15:00~16:00',
    monthly_fee: 200000,
    material_fee: 30000,
    capacity: 12,
    enrolled_count: 8,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    academy_id: 'demo',
    name: '중등 수학 심화반',
    target_grade: '중등 1~2학년',
    schedule: '화·목 17:00~19:00',
    monthly_fee: 300000,
    material_fee: 20000,
    capacity: 10,
    enrolled_count: 10,
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    academy_id: 'demo',
    name: '초등 영어 회화반',
    target_grade: '초등 4~6학년',
    schedule: '월·수 16:30~17:30',
    monthly_fee: 250000,
    material_fee: 15000,
    capacity: 8,
    enrolled_count: 5,
    created_at: '',
    updated_at: '',
  },
];

export default function SubjectsPage() {
  const { academyId, isDemo, loading: academyLoading } = useAcademy();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubjectForm>(emptyForm);

  const fetchSubjects = useCallback(async () => {
    if (isDemo) {
      setSubjects(mockSubjects);
      setLoading(false);
      return;
    }
    if (!academyId) return;

    try {
      setLoading(true);
      const res = await apiFetch(`/api/subjects?academy_id=${academyId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setSubjects(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setLoading(false);
    }
  }, [academyId, isDemo]);

  useEffect(() => {
    if (!academyLoading) fetchSubjects();
  }, [academyLoading, fetchSubjects]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(subject: Subject) {
    setForm({
      name: subject.name,
      target_grade: subject.target_grade,
      schedule: subject.schedule,
      monthly_fee: subject.monthly_fee,
      material_fee: subject.material_fee,
      capacity: subject.capacity,
    });
    setEditingId(subject.id);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (isDemo) {
      if (editingId) {
        setSubjects((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, ...form } : s))
        );
      } else {
        const newSubject: Subject = {
          ...form,
          id: Date.now().toString(),
          academy_id: 'demo',
          enrolled_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setSubjects((prev) => [...prev, newSubject]);
      }
      setShowModal(false);
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        const res = await apiFetch('/api/subjects', {
          method: 'PUT',
          body: JSON.stringify({ id: editingId, ...form }),
        });
        if (res.ok) await fetchSubjects();
      } else {
        const res = await apiFetch('/api/subjects', {
          method: 'POST',
          body: JSON.stringify({ academy_id: academyId, ...form }),
        });
        if (res.ok) await fetchSubjects();
      }
    } catch (error) {
      console.error('Failed to save subject:', error);
    } finally {
      setSaving(false);
      setShowModal(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 과목을 삭제하시겠습니까?')) return;

    if (isDemo) {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      return;
    }

    try {
      const res = await apiFetch(`/api/subjects?id=${id}`, { method: 'DELETE' });
      if (res.ok) await fetchSubjects();
    } catch (error) {
      console.error('Failed to delete subject:', error);
    }
  }

  function formatWon(value: number) {
    return value.toLocaleString('ko-KR') + '원';
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">과목 관리</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Plus size={18} />
          과목 추가
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">
            등록된 과목이 없습니다. 과목을 추가해주세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white rounded-xl border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {subject.target_grade}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(subject)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                    aria-label="수정"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    aria-label="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">수업 시간</span>
                  <p className="text-gray-700 font-medium mt-0.5">
                    {subject.schedule}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">수강료</span>
                  <p className="text-gray-700 font-medium mt-0.5">
                    {formatWon(subject.monthly_fee)}/월
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">교재비</span>
                  <p className="text-gray-700 font-medium mt-0.5">
                    {formatWon(subject.material_fee)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">정원</span>
                  <p className="text-gray-700 font-medium mt-0.5">
                    {subject.enrolled_count}/{subject.capacity}명
                    {subject.enrolled_count >= subject.capacity && (
                      <span className="ml-1.5 text-xs text-red-500 font-medium">
                        마감
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? '과목 수정' : '과목 추가'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  과목명 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="예: 초등 수학 기초반"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대상 학년
                </label>
                <input
                  type="text"
                  value={form.target_grade}
                  onChange={(e) =>
                    setForm({ ...form, target_grade: e.target.value })
                  }
                  placeholder="예: 초등 1~3학년"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수업 시간
                </label>
                <input
                  type="text"
                  value={form.schedule}
                  onChange={(e) =>
                    setForm({ ...form, schedule: e.target.value })
                  }
                  placeholder="예: 월·수·금 15:00~16:00"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    월 수강료 (원)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={form.monthly_fee}
                    onChange={(e) =>
                      setForm({ ...form, monthly_fee: Number(e.target.value) })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    교재비 (원)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={form.material_fee}
                    onChange={(e) =>
                      setForm({ ...form, material_fee: Number(e.target.value) })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정원
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-6 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : editingId ? (
                    '수정하기'
                  ) : (
                    '추가하기'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
