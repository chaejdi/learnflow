import { MessageSquare, CalendarCheck } from 'lucide-react';

export default function Hero() {
  return (
    <section className="pt-28 pb-20 px-4 bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-50 text-accent-600 text-sm font-medium mb-6">
          <MessageSquare size={16} />
          카카오톡 AI 자동 상담
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
          수업 중 놓치는 학부모 문의,
          <br />
          <span className="text-primary-500">AI가 24시간</span> 대신
          응대합니다
        </h1>

        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
          카카오톡으로 들어오는 학부모 상담을 AI가 자동으로 처리하고, 체험수업
          예약까지 잡아드립니다. 원장님은 수업에만 집중하세요.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#pricing"
            className="inline-flex h-12 items-center px-8 rounded-lg bg-primary-500 text-white font-semibold text-base hover:bg-primary-600 transition-colors shadow-md"
          >
            1개월 무료 체험 시작
          </a>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center px-8 rounded-lg border border-gray-200 text-gray-700 font-medium text-base hover:bg-gray-50 transition-colors"
          >
            어떻게 동작하나요?
          </a>
        </div>

        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#FEE500] flex items-center justify-center">
              <span className="text-lg font-bold text-[#3C1E1E]">K</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                카카오톡 상담 미리보기
              </p>
              <p className="text-xs text-gray-400">런플로우 AI 상담봇</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="bg-[#FEE500] text-gray-900 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-xs">
                초등 3학년 수학 수업 문의드려요
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm max-w-sm">
                안녕하세요! 문의 감사합니다 😊 초등 3학년 수학반은 현재 화·목
                3:30~5:00 수업이 운영 중이에요. 체험수업도 가능한데,
                예약해드릴까요?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-[#FEE500] text-gray-900 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-xs">
                네 이번주 목요일 가능할까요?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm max-w-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarCheck size={14} className="text-primary-500" />
                  <span className="font-medium text-primary-500">예약 확정</span>
                </div>
                목요일(5/29) 3:30 체험수업 예약 완료되었습니다! 준비물은 따로
                없고, 5분 전까지 와주시면 됩니다. 궁금한 점 있으시면 편하게
                물어보세요!
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
