import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://learnflow-orcin.vercel.app'),
  title: {
    default: '런플로우 - 학원 AI 상담 & 체험수업 예약 | 카카오톡 챗봇',
    template: '%s | 런플로우',
  },
  description:
    '카카오톡으로 학부모 문의를 24시간 AI 자동 응대하고, 체험수업 예약까지 한번에. 학원 원장님의 신규 학생 모집을 도와드립니다. 14일 무료 체험.',
  keywords: [
    '학원 AI 상담',
    '학원 자동 응답',
    '카카오톡 학원 챗봇',
    '학원 문의 자동화',
    '체험수업 예약',
    '학원 관리',
    '학원 마케팅',
    '신규 학생 모집',
    '학원 CRM',
    '런플로우',
  ],
  openGraph: {
    title: '런플로우 - 학원 AI 상담 & 체험수업 예약',
    description:
      '카카오톡으로 학부모 문의를 24시간 AI 자동 응대. 체험수업 예약까지 자동으로. 14일 무료 체험.',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://learnflow-orcin.vercel.app',
    siteName: '런플로우',
  },
  twitter: {
    card: 'summary_large_image',
    title: '런플로우 - 학원 AI 상담 & 체험수업 예약',
    description:
      '카카오톡으로 학부모 문의를 24시간 AI 자동 응대. 14일 무료 체험.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: 'https://learnflow-orcin.vercel.app',
  },
  verification: {
    other: {
      'naver-site-verification': 'NAVER_VERIFICATION_CODE',
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '런플로우',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    '카카오톡으로 학부모 문의를 24시간 AI 자동 응대하고, 체험수업 예약까지 한번에 처리하는 학원 전용 AI 상담 서비스',
  offers: [
    {
      '@type': 'Offer',
      name: '무료 체험',
      price: '0',
      priceCurrency: 'KRW',
      description: '14일 무료 체험',
    },
    {
      '@type': 'Offer',
      name: '기본',
      price: '19900',
      priceCurrency: 'KRW',
      billingDuration: 'P1M',
    },
    {
      '@type': 'Offer',
      name: '프로',
      price: '39900',
      priceCurrency: 'KRW',
      billingDuration: 'P1M',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '127',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
