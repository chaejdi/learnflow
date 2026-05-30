import {
  Bot,
  CalendarDays,
  BarChart3,
  Bell,
  Smartphone,
  Shield,
} from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: '24시간 AI 자동 상담',
    description:
      '수업 중, 밤, 주말에도 카카오톡 문의를 AI가 즉시 응대합니다. 학원 정보에 맞춰 정확하게 답변해요.',
  },
  {
    icon: CalendarDays,
    title: '체험수업 자동 예약',
    description:
      '학부모가 대화 중 체험수업을 원하면 AI가 빈 시간을 안내하고 바로 예약을 잡아드립니다.',
  },
  {
    icon: Bell,
    title: '실시간 알림톡',
    description:
      '새 문의, 예약 확정, 원장님 확인 필요 건 등 중요 알림을 카카오 알림톡으로 즉시 전달합니다.',
  },
  {
    icon: BarChart3,
    title: '문의 → 등록 전환 분석',
    description:
      '문의 수, 예약 수, 등록 전환율을 한눈에 파악하세요. 어디서 학부모가 이탈하는지 보입니다.',
  },
  {
    icon: Smartphone,
    title: '모바일 최적화 대시보드',
    description:
      '수업 사이사이 스마트폰으로 문의 현황과 예약을 확인하고 관리할 수 있습니다.',
  },
  {
    icon: Shield,
    title: '원장님이 직접 개입 가능',
    description:
      'AI가 답변하기 어려운 질문은 원장님에게 바로 전달. 직접 답변을 입력하면 카카오톡으로 전송됩니다.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            원장님이 수업에 집중할 수 있도록
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            신규 학생 모집의 모든 과정을 런플로우가 자동으로 처리합니다
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                <feature.icon size={24} className="text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
