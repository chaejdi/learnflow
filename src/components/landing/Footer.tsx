export default function Footer() {
  return (
    <footer className="py-12 px-4 bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <span className="text-lg font-bold text-white">런플로우</span>
            <p className="text-sm mt-2 max-w-xs">
              학원 AI 상담 & 체험수업 예약 서비스.
              <br />
              원장님의 신규 학생 모집을 돕습니다.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-3">
                서비스
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    기능 소개
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    요금제
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-3">
                고객 지원
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:support@learnflow.kr" className="hover:text-white transition-colors">
                    이메일 문의
                  </a>
                </li>
                <li>
                  <span>카카오톡 문의</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-xs text-gray-500">
          &copy; 2026 런플로우. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
