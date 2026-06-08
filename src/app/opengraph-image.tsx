import { ImageResponse } from 'next/og';

export const alt = '런플로우 - 학원 AI 상담 & 체험수업 예약';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4FD7 50%, #1A3FA8 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 700,
              color: '#2563EB',
            }}
          >
            LF
          </div>
          <div
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: 'white',
            }}
          >
            런플로우
          </div>
        </div>

        <div
          style={{
            fontSize: '48px',
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.3,
            marginBottom: '24px',
          }}
        >
          학부모 문의, AI가 24시간 응대합니다
        </div>

        <div
          style={{
            fontSize: '24px',
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          카카오톡 AI 자동 상담 + 체험수업 예약
        </div>

        <div
          style={{
            display: 'flex',
            gap: '32px',
            marginTop: '48px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '18px',
            }}
          >
            14일 무료 체험
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '18px',
            }}
          >
            카드등록 불필요
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '18px',
            }}
          >
            3분만에 시작
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
