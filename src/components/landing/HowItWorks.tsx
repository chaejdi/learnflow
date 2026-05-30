const steps = [
  {
    step: '01',
    title: '학원 정보 등록',
    who: '원장님',
    description:
      '수업 과목, 시간표, 수강료, 체험수업 가능 일정을 간단히 입력합니다. 5분이면 충분해요.',
  },
  {
    step: '02',
    title: '카카오톡 채널 연결',
    who: '원장님',
    description:
      '기존 카카오톡 채널에 런플로우를 연결하면 바로 AI 상담이 시작됩니다.',
  },
  {
    step: '03',
    title: '학부모가 카톡으로 문의',
    who: '학부모',
    description:
      '별도 앱 설치 없이 카카오톡으로 "수학 수업 문의"만 보내면 대화가 시작됩니다.',
  },
  {
    step: '04',
    title: 'AI가 상담 & 예약 완료',
    who: 'AI',
    description:
      '수업 안내, 비용, 시간표를 알려주고 체험수업까지 자동 예약. 원장님은 알림만 받으세요.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            이렇게 동작합니다
          </h2>
          <p className="text-gray-500">
            설정 5분, 카카오톡만 있으면 바로 시작
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((item, i) => (
            <div
              key={item.step}
              className="flex items-start gap-6 bg-white p-6 rounded-xl border border-gray-100"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center text-lg font-bold">
                {item.step}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 font-medium">
                    {item.who}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
