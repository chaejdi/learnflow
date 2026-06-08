import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-primary-500 text-sm font-medium mb-8 block">&larr; 홈으로</Link>

      <h1 className="text-3xl font-bold mb-8">개인정보처리방침</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. 수집하는 개인정보 항목</h2>
          <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>원장(이용자)</strong>: 이메일, 비밀번호, 학원명, 학원 주소, 전화번호</li>
            <li><strong>학부모</strong>: 카카오톡 사용자 ID(암호화), 상담 대화 내용, 이름, 연락처(체험수업 예약 시)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. 개인정보 수집 및 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>서비스 회원 관리 및 인증</li>
            <li>AI 상담 서비스 제공 (학부모 문의 자동 응답)</li>
            <li>체험수업 예약 접수 및 관리</li>
            <li>카카오 알림톡 발송</li>
            <li>서비스 이용 통계 및 분석</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. 개인정보 보유 및 이용 기간</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
            <li>단, 관련 법령에 의한 보존 의무가 있는 경우 해당 기간까지 보관</li>
            <li>전자상거래법에 의한 거래 기록: 5년</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. 개인정보 제3자 제공</h2>
          <p>회사는 원칙적으로 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우 예외로 합니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 의해 요구되는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. 개인정보 처리 위탁</h2>
          <table className="w-full border-collapse border border-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left">수탁 업체</th>
                <th className="border border-gray-200 px-3 py-2 text-left">위탁 업무 내용</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-3 py-2">Supabase</td>
                <td className="border border-gray-200 px-3 py-2">데이터베이스 호스팅 및 인증 서비스</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">Anthropic</td>
                <td className="border border-gray-200 px-3 py-2">AI 상담 응답 생성</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">토스페이먼츠</td>
                <td className="border border-gray-200 px-3 py-2">결제 처리</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-3 py-2">Vercel</td>
                <td className="border border-gray-200 px-3 py-2">웹 서비스 호스팅</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. 이용자의 권리</h2>
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>개인정보 열람 요청</li>
            <li>개인정보 수정 요청</li>
            <li>개인정보 삭제 요청 (회원 탈퇴)</li>
            <li>개인정보 처리 정지 요청</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. 개인정보 보호책임자</h2>
          <ul className="list-none space-y-1">
            <li>담당자: 런플로우 운영팀</li>
            <li>이메일: support@learnflow.kr</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">8. 개인정보의 안전성 확보 조치</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>비밀번호 암호화 저장</li>
            <li>SSL/TLS 통신 암호화</li>
            <li>접근 권한 제한 및 관리</li>
            <li>정기적인 보안 점검</li>
          </ul>
        </section>

        <p className="text-gray-400 mt-8">시행일: 2026년 6월 8일</p>
      </div>
    </div>
  );
}
