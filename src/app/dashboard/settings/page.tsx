'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [academy, setAcademy] = useState({
    name: '우리동네 수학학원',
    address: '서울시 강남구 역삼동 123-45',
    phone: '02-1234-5678',
    description: '초등·중등 수학 전문 학원. 개별 맞춤 수업으로 아이의 수학 자신감을 키워드립니다.',
    kakaoChannelId: '',
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // TODO: API call
    alert('저장되었습니다.');
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
            value={academy.name}
            onChange={(e) => setAcademy({ ...academy, name: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            주소
          </label>
          <input
            type="text"
            value={academy.address}
            onChange={(e) =>
              setAcademy({ ...academy, address: e.target.value })
            }
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            전화번호
          </label>
          <input
            type="tel"
            value={academy.phone}
            onChange={(e) =>
              setAcademy({ ...academy, phone: e.target.value })
            }
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            학원 소개
          </label>
          <textarea
            value={academy.description}
            onChange={(e) =>
              setAcademy({ ...academy, description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            AI 상담봇이 학부모에게 안내할 때 이 내용을 참고합니다
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            카카오톡 채널 ID
          </label>
          <input
            type="text"
            value={academy.kakaoChannelId}
            onChange={(e) =>
              setAcademy({ ...academy, kakaoChannelId: e.target.value })
            }
            placeholder="@학원채널"
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="submit"
          className="h-10 px-6 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          저장하기
        </button>
      </form>
    </div>
  );
}
