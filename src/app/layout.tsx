import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '런플로우 - 학원 AI 상담 & 체험수업 예약',
  description:
    '카카오톡으로 학부모 문의를 24시간 자동 응대하고, 체험수업 예약까지 한번에. 학원 원장님의 신규 학생 모집을 도와드립니다.',
  keywords: ['학원', 'AI 상담', '체험수업', '예약', '카카오톡', '학원 관리'],
  openGraph: {
    title: '런플로우 - 학원 AI 상담 & 체험수업 예약',
    description:
      '카카오톡으로 학부모 문의를 24시간 자동 응대하고, 체험수업 예약까지 한번에.',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
