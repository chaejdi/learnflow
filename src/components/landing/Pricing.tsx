import { Check } from 'lucide-react';

const plans = [
  {
    name: '무료 체험',
    price: '0',
    period: '14일',
    description: '런플로우를 먼저 경험해보세요',
    features: [
      'AI 상담 월 100건',
      '체험수업 예약',
      '기본 대시보드',
      '카카오톡 채널 1개',
    ],
    cta: '14일 무료로 시작하기',
    highlighted: false,
  },
  {
    name: '기본',
    price: '19,900',
    period: '월',
    description: '대부분의 학원에 딱 맞는 플랜',
    features: [
      'AI 상담 200건/월',
      '체험수업 예약',
      '전환율 분석 대시보드',
      '카카오 알림톡',
      '원장님 직접 답변',
      '이메일 지원',
    ],
    cta: '14일 무료 체험',
    highlighted: true,
  },
  {
    name: '프로',
    price: '39,900',
    period: '월',
    description: '여러 지점을 운영하는 학원',
    features: [
      '기본 플랜 전체 기능',
      'AI 상담 무제한',
      '다중 지점 관리',
      'AI 응답 커스터마이징',
      '우선 지원',
      '전담 매니저',
    ],
    cta: '14일 무료 체험',
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            합리적인 요금제
          </h2>
          <p className="text-gray-500">
            선생님 한 분 인건비보다 훨씬 저렴하게, 24시간 상담을 시작하세요
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 border-2 flex flex-col ${
                plan.highlighted
                  ? 'border-primary-500 shadow-lg relative'
                  : 'border-gray-100'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                  인기
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {plan.name}
              </h3>
              <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.price}
                </span>
                <span className="text-sm text-gray-400 ml-1">
                  원/{plan.period}
                </span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check
                      size={16}
                      className={
                        plan.highlighted
                          ? 'text-primary-500'
                          : 'text-gray-400'
                      }
                    />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/login"
                className={`block text-center h-11 leading-[2.75rem] rounded-lg text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
