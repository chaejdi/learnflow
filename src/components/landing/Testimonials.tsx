const testimonials = [
  {
    name: '김서연 원장님',
    academy: '서연영어학원',
    location: '강남구',
    quote: '밤 10시에 오는 문의도 AI가 바로 응대해주니까 다음 날 출근하면 예약이 잡혀있어요. 월 신규 등록이 40% 늘었습니다.',
    metric: '신규 등록 40%↑',
  },
  {
    name: '박준혁 원장님',
    academy: '매쓰플러스 수학학원',
    location: '분당구',
    quote: '매일 같은 질문에 답하느라 수업 준비할 시간이 부족했는데, 런플로우 도입 후 하루 2시간을 아끼고 있습니다.',
    metric: '하루 2시간 절약',
  },
  {
    name: '이지은 원장님',
    academy: '지은미술교습소',
    location: '인천 남동구',
    quote: '카카오톡으로 문의가 오면 수업 중이라 답을 못했는데, 이제 AI가 정확하게 안내해주니 학부모님 만족도가 확 올라갔어요.',
    metric: '응답률 100%',
  },
  {
    name: '최동현 원장님',
    academy: '코드랩 코딩학원',
    location: '대전 유성구',
    quote: '체험수업 예약까지 자동으로 되니까 정말 편합니다. 3개월 만에 체험 전환율이 2배가 됐어요.',
    metric: '전환율 2배↑',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">
            원장님들의 실제 후기
          </h2>
          <p className="text-gray-500 mt-3">
            런플로우를 도입한 학원의 변화를 확인하세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.academy} · {t.location}</p>
                </div>
                <span className="bg-primary-50 text-primary-600 text-xs font-semibold px-3 py-1 rounded-full">
                  {t.metric}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
