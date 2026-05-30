# 런플로우 (LearnFlow) — 프로젝트 진행 현황

> 마지막 업데이트: 2026-05-29

---

## 완료된 작업

### 기획
- 시장 조사 완료 (학원 관리 앱 경쟁 분석: 학원조아, 클래스업, 랠리즈)
- 핵심 차별점 확정: 기존 앱은 "재원생 관리", 런플로우는 "신규 학생 모집" (문의→체험→등록)
- 프로젝트 스펙 작성 (`PROJECT_SPEC.md`)
- 브랜드명 확정: 런플로우 (LearnFlow)

### 디자인 시스템
- `src/styles/design-tokens.ts` — 컬러(primary blue, accent orange), 타이포, 스페이싱, 그림자
- `src/app/globals.css` — Noto Sans KR 폰트, Tailwind v4 커스텀 테마 변수
- 브랜드 톤: 부드러우면서 전문적, 모바일 퍼스트

### 프론트엔드 — 랜딩 페이지 (`/`)
- `src/components/landing/Header.tsx` — 반응형 네비게이션 (모바일 햄버거)
- `src/components/landing/Hero.tsx` — 카카오톡 상담 미리보기 데모 포함
- `src/components/landing/Features.tsx` — 6가지 핵심 기능 카드
- `src/components/landing/HowItWorks.tsx` — 4단계 이용 방법
- `src/components/landing/Pricing.tsx` — 무료/스탠다드(49,000원)/프리미엄(99,000원) 3단 요금제
- `src/components/landing/FAQ.tsx` — 아코디언 FAQ 6개
- `src/components/landing/Footer.tsx`
- `src/app/page.tsx` — 랜딩 페이지 조합

### 프론트엔드 — 로그인 (`/login`)
- `src/app/login/page.tsx` — 이메일/비밀번호 폼 (Supabase Auth 연동 TODO)

### 프론트엔드 — 대시보드
- `src/components/dashboard/Sidebar.tsx` — 사이드바 네비게이션 (활성 상태 표시)
- `src/components/dashboard/StatsCard.tsx` — 통계 카드 컴포넌트
- `src/app/dashboard/layout.tsx` — 사이드바 + 메인 컨텐츠 레이아웃
- `src/app/dashboard/page.tsx` — 통계 4종 + 최근 문의 목록 (mock 데이터)
- `src/app/dashboard/inquiries/page.tsx` — 대화 목록 + 채팅 뷰 + 원장님 직접 답변 UI
- `src/app/dashboard/reservations/page.tsx` — 예약 테이블 + 확정/취소 버튼
- `src/app/dashboard/settings/page.tsx` — 학원 정보 수정 폼

### 백엔드 — API 라우트
- `src/app/api/kakao/webhook/route.ts` — 카카오톡 웹훅 (메시지 수신 → Claude AI 응답 → 카카오 응답)
- `src/app/api/chat/route.ts` — AI 상담 API (대화 이력 관리 + Claude 호출)
- `src/app/api/reservations/route.ts` — GET(목록) + POST(생성, 슬롯 가용성 체크)
- `src/app/api/academies/route.ts` — GET + PATCH
- `src/app/api/subjects/route.ts` — GET + POST

### 백엔드 — 핵심 라이브러리
- `src/lib/supabase.ts` — getSupabase() / getServiceClient() (lazy init)
- `src/lib/ai/system-prompt.ts` — 학원 정보 기반 AI 시스템 프롬프트 생성
- `src/lib/kakao.ts` — 카카오 응답 빌더 + 알림톡 유틸 (알림톡 실제 호출 TODO)
- `src/lib/utils.ts` — cn(), 날짜/가격 포맷, 상태 라벨

### 타입 & 스키마
- `src/types/index.ts` — 전체 TypeScript 인터페이스 (DB 모델, API 타입, 카카오 타입)
- `supabase/migrations/001_initial_schema.sql` — 6개 테이블 + 인덱스 + RLS 정책

### 인프라
- `vercel.json` — 한국 리전 (icn1)
- `.env.local` — 환경변수 템플릿 (Supabase, Anthropic, Kakao)
- 빌드 성공 확인 (`next build` 통과)

---

## 남은 작업 (TODO)

### 우선순위 높음
1. **Supabase 프로젝트 생성 & 연결**
   - Supabase 프로젝트 만들고 URL/키 .env.local에 입력
   - `001_initial_schema.sql` 마이그레이션 실행
2. **Supabase Auth 연동**
   - 로그인 페이지에 실제 인증 로직 구현
   - 대시보드 페이지에 인증 가드 추가
   - 카카오 OAuth 설정
3. **대시보드 실데이터 연동**
   - mock 데이터 → Supabase API 호출로 교체
   - 상담 내역, 예약 관리, 통계 실시간 조회
4. **카카오톡 채널 연동 테스트**
   - 카카오 비즈니스 채널 생성
   - 웹훅 URL 등록 후 실제 메시지 수신 테스트
5. **Anthropic API 키 설정 & AI 테스트**
   - .env.local에 실제 키 입력
   - 상담 시나리오 테스트 (과목 문의, 체험 예약, 에스컬레이션)

### 우선순위 중간
6. **원장님 직접 답변 기능 구현**
   - 대시보드에서 입력한 답변 → 카카오톡으로 전송
7. **알림톡 구현**
   - 카카오 알림톡 템플릿 등록
   - 새 문의/예약 발생 시 원장님에게 알림
8. **체험수업 슬롯 관리 UI**
   - 설정 페이지에 체험수업 가능 일정 등록/관리 추가
9. **과목 관리 UI**
   - 설정 페이지에 과목 CRUD 추가
10. **모바일 대시보드 반응형 개선**
    - 모바일에서 사이드바 → 하단 탭 네비게이션

### 우선순위 낮음
11. **전환율 분석 대시보드** — 문의→예약→등록 퍼널 시각화
12. **마케팅 콘텐츠** — SEO 메타데이터, 블로그 글
13. **CI/CD** — GitHub Actions 워크플로우
14. **에러 바운더리 & 로딩 UI** — loading.tsx, error.tsx
15. **Vercel 배포** — 도메인 연결, 환경변수 설정

---

## 프로젝트 구조

```
learnflow/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx            # 루트 레이아웃 (한국어, Noto Sans KR)
│   │   ├── page.tsx              # 랜딩 페이지
│   │   ├── login/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx        # 사이드바 레이아웃
│   │   │   ├── page.tsx          # 통계 + 최근 문의
│   │   │   ├── inquiries/page.tsx
│   │   │   ├── reservations/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── kakao/webhook/route.ts
│   │       ├── chat/route.ts
│   │       ├── reservations/route.ts
│   │       ├── academies/route.ts
│   │       └── subjects/route.ts
│   ├── components/
│   │   ├── landing/  (Header, Hero, Features, HowItWorks, Pricing, FAQ, Footer)
│   │   └── dashboard/ (Sidebar, StatsCard)
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── kakao.ts
│   │   ├── utils.ts
│   │   └── ai/system-prompt.ts
│   ├── styles/design-tokens.ts
│   └── types/index.ts
├── supabase/migrations/001_initial_schema.sql
├── vercel.json
├── PROJECT_SPEC.md
└── PROJECT_STATUS.md   ← 이 파일
```

---

## 기술 참고

- **Next.js 16.2.6** (Tailwind CSS v4, Turbopack)
- **Supabase JS v2** — lazy init 패턴 사용 (빌드 시 env 없이도 통과)
- **Claude API** — claude-sonnet-4-20250514 모델 사용
- **카카오 웹훅** — POST 요청 → KakaoWebhookPayload → AI 응답 → KakaoResponse 형식 반환
- **RLS** — 모든 테이블에 Row Level Security 적용, service role은 insert/update 가능
