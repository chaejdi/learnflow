'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: '카카오톡 채널이 없어도 사용할 수 있나요?',
    a: '카카오톡 채널은 무료로 개설할 수 있습니다. 채널 개설 후 런플로우에 연결하면 바로 AI 상담이 시작됩니다. 채널 개설 방법도 안내해드려요.',
  },
  {
    q: 'AI가 잘못된 답변을 하면 어떡하나요?',
    a: '원장님이 등록한 학원 정보만을 기반으로 답변하기 때문에 엉뚱한 답변을 하지 않습니다. 또한 AI가 판단하기 어려운 질문은 자동으로 원장님에게 전달되어 직접 답변하실 수 있습니다.',
  },
  {
    q: '기존에 사용하는 학원 관리 프로그램과 충돌하나요?',
    a: '런플로우는 기존 학생 관리가 아닌 "신규 학생 모집"에 집중합니다. 학원조아, 클래스업 등 기존 프로그램과 역할이 다르기 때문에 함께 사용하셔도 전혀 문제없습니다.',
  },
  {
    q: '학부모도 앱을 설치해야 하나요?',
    a: '아니요. 학부모는 이미 사용하고 계신 카카오톡에서 메시지만 보내면 됩니다. 별도 앱 설치나 회원가입이 전혀 필요 없습니다.',
  },
  {
    q: '도입하는 데 얼마나 걸리나요?',
    a: '학원 정보 등록과 카카오톡 채널 연결까지 약 5~10분이면 됩니다. 가입 당일부터 AI 상담을 시작할 수 있습니다.',
  },
  {
    q: '해지는 자유롭게 할 수 있나요?',
    a: '네, 언제든 자유롭게 해지할 수 있습니다. 위약금이나 최소 이용 기간이 없습니다.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            자주 묻는 질문
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="text-sm font-medium text-gray-900 pr-4">
                  {faq.q}
                </span>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 flex-shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
