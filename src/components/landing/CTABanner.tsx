import Link from 'next/link';

const painPoints = [
  { number: '67%', desc: '학부모 문의가 영업시간 외에 발생' },
  { number: '2시간', desc: '매일 반복 질문 응대에 소요' },
  { number: '3배', desc: '즉시 응답 시 체험 전환율 상승' },
];

export default function CTABanner() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {painPoints.map((p, i) => (
            <div key={i} className="text-white/90">
              <p className="text-3xl font-bold text-white mb-1">{p.number}</p>
              <p className="text-sm">{p.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          놓치는 문의, 이제 없앨 수 있습니다
        </h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          런플로우 AI가 24시간 학부모 문의를 응대하고,
          체험수업 예약까지 자동으로 처리합니다.
        </p>

        <Link
          href="/login"
          className="inline-block px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
        >
          14일 무료로 시작하기
        </Link>

        <div className="flex items-center justify-center gap-6 mt-6 text-white/70 text-sm">
          <span>✓ 14일 무료 체험</span>
          <span>✓ 카드등록 불필요</span>
          <span>✓ 3분만에 시작</span>
        </div>
      </div>
    </section>
  );
}
