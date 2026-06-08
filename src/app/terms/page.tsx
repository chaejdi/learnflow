import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-primary-500 text-sm font-medium mb-8 block">&larr; 홈으로</Link>

      <h1 className="text-3xl font-bold mb-8">이용약관</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">제1조 (목적)</h2>
          <p>이 약관은 런플로우(이하 &quot;회사&quot;)가 제공하는 AI 기반 학원 상담 자동화 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">제2조 (용어의 정의)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>&quot;서비스&quot;란 회사가 제공하는 카카오톡 AI 자동 상담, 체험수업 예약 관리, 대시보드 등 관련 서비스를 말합니다.</li>
            <li>&quot;이용자&quot;란 이 약관에 동의하고 서비스를 이용하는 학원 운영자(원장)를 말합니다.</li>
            <li>&quot;학부모&quot;란 카카오톡 채널을 통해 학원에 문의하는 사람을 말합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">제3조 (약관의 효력 및 변경)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 적용됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">제4조 (서비스의 제공 및 변경)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 다음과 같은 서비스를 제공합니다: AI 자동 상담, 체험수업 예약 관리, 상담 내역 관리, 알림톡 발송.</li>
            <li>회사는 서비스의 내용을 변경할 수 있으며, 이 경우 사전에 공지합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">제5조 (이용 요금)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>서비스 이용 요금은 서비스 내 안내된 요금표에 따릅니다.</li>
            <li>무료 체험 기간은 가입일로부터 14일이며, 이후 유료 플랜으로 전환됩니다.</li>
            <li>요금은 매월 자동 결제되며, 해지 시 다음 결제일부터 적용됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">제6조 (이용자의 의무)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>이용자는 서비스를 통해 수집된 학부모 정보를 개인정보보호법에 따라 관리해야 합니다.</li>
            <li>이용자는 서비스를 불법적인 목적으로 사용할 수 없습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">제7조 (서비스 이용 제한)</h2>
          <p>회사는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해하는 경우 서비스 이용을 제한할 수 있습니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">제8조 (면책)</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>AI 상담봇의 응답은 참고 정보이며, 회사는 AI 응답의 정확성을 보장하지 않습니다.</li>
            <li>천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">제9조 (분쟁 해결)</h2>
          <p>본 약관과 관련된 분쟁은 대한민국 법률에 따르며, 관할 법원은 회사 소재지 관할 법원으로 합니다.</p>
        </section>

        <p className="text-gray-400 mt-8">시행일: 2026년 6월 8일</p>
      </div>
    </div>
  );
}
