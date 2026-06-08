# LearnFlow 개발 진행 상황

## 프로젝트 개요
- **서비스**: 런플로우 (LearnFlow) — AI 기반 학원 학부모 상담 자동화 플랫폼
- **스택**: Next.js 16 + Supabase (PostgreSQL) + Claude API + 카카오톡 연동
- **목표**: 학부모 카톡 문의 → AI 자동 응답 → 체험수업 예약 → 원장 대시보드 관리
- **모델**: 학원별 구독 SaaS (멀티테넌트). 한 계정 = 한 학원(현재 1:1).

---

## 완료된 작업

### Phase 1~6 (기반 구축)
- **Phase 1 공통 유틸**: `useAcademy` 훅, `apiFetch`(인증 토큰 자동 첨부)
- **Phase 2 카카오 웹훅 검증**: GET 핸들러(오픈빌더 콜백 등록용)
- **Phase 3 대시보드 API 연동**: 과목/예약/설정/메인 대시보드 mock → 실제 Supabase
- **Phase 4 체험수업 슬롯**: `/api/trial-slots` + 시간표 관리 탭
- **Phase 5 인증**: 로그인 폼 + 미들웨어(비활성) + signOut
- **Phase 6 알림톡**: `sendAlimtalk()` + 예약 확정 시 자동 발송

### Phase 7: 멀티테넌트 전환 + UI 다듬기 (2026-06-05 세션)

#### A. 사이드바 레이아웃 버그 수정
대시보드에서 사이드바가 가로로 찌그러져 글자가 세로로 쪼개지던 문제.
- **원인**: flex 레이아웃에서 `<main>`에 `min-w-0`이 없어 긴 메시지(`truncate`의 nowrap)가 main을 밀어내고, 사이드바엔 `flex-shrink-0`이 없어 찌그러짐.
- **수정**:
  - `src/app/dashboard/layout.tsx` — `<main>`에 `min-w-0` 추가
  - `src/components/dashboard/Sidebar.tsx` — 데스크탑 `<aside>`에 `flex-shrink-0` 추가

#### B. 카카오 라우팅 멀티테넌트화 (B안: bot.id 매칭)
모든 학원이 **동일한 웹훅 URL**(`/api/kakao/webhook`)을 쓰고, 카카오가 보내는 `bot.id`를
`academies.kakao_channel_id`와 매칭해 어느 학원인지 식별.
- `src/app/api/kakao/webhook/route.ts` — `bot.id`로 학원 조회. **위험한 "첫 학원" fallback 제거.**
  미연결 채널엔 봇 ID를 안내 메시지로 돌려줌(원장이 설정에 입력하도록). `?academy_id=`는 테스트 override로 유지.
- `src/app/dashboard/settings/page.tsx` — 웹훅 URL을 학원 공통으로, "카카오톡 채널 ID" → **"카카오 봇 ID"** 라벨/안내로 변경.
- (코드) `PATCH /api/academies` — 봇 ID 중복 연결 방지(다른 학원이 이미 쓰면 409).
- (DB, **미적용**) `supabase/migrations/003_multitenant_kakao_routing.sql` — `kakao_channel_id` 부분 unique 인덱스 + 조회 인덱스.

#### C. 온보딩 (회원가입 → 학원 자동 생성)
- `src/app/signup/page.tsx` — 계정 + 학원을 한 폼에서 생성. (NEW)
- `POST /api/academies` — 로그인 유저 명의로 학원 생성. 순환 FK(`academies.owner_id`↔`users.id`) 때문에
  `users` 행 보장 → 학원 생성 → `users.academy_id` 연결 순서로 처리. 1계정=1학원(중복 생성 차단).
- `src/lib/onboarding.ts` — `PENDING_ACADEMY_KEY`. 이메일 인증 ON이어도 동작하도록 학원정보 임시 보관. (NEW)
- `src/app/login/page.tsx` — 로그인 직후 보관된 학원정보로 생성(인증 후 첫 로그인) + "회원가입" 링크.

#### D. 대시보드 학원별 격리 (로그인 계정 기준)
- `GET /api/academies/me` — `owner_id = 로그인 유저`인 학원만 반환(없으면 `data:null`). uuid 가드로 미로그인/데모 안전 처리. (NEW)
- `src/hooks/useAcademy.ts` — `/api/academies/first`(첫 학원) → `/api/academies/me`(내 학원)로 전환. `academyName`도 반환.
- `src/app/dashboard/inquiries/page.tsx` — 동일하게 `/me`로 전환(토큰 포함).
- `src/app/dashboard/page.tsx` — 학원 없을 때 **무한 로딩 스피너 버그 수정**(`setLoading(false)`).
- `GET/PATCH /api/academies` — **소유권 검사 추가**(남의 학원 조회·수정 차단).

#### E. 데이터 정리 (실제 DB 작업)
- `우리동네 수학학원`(155f…, 유령 owner `demo@learnflow.kr`) + 대화 17건 삭제.
- 결과: `짱짱맨 수학학원`(owner `chaejdi2245@gmail.com`)만 남음. 온보딩 플로우로 실제 생성된 학원.
- `demo@learnflow.kr` users 행은 `academy_id=null`로 정리(무해).

#### F. 사이드바 브랜딩 세련화
- 상단을 **런플로우 모노그램 마크(`L`, 블루 그라데이션 라운드 박스) + 학원명(메인)** 구조로.
  브랜드는 마크로 조용히 드러내고(hover 시 "런플로우" 툴팁), 메인은 학원 이름.
- `src/components/dashboard/Sidebar.tsx` + `useAcademy.academyName` 사용.

---

## 멀티테넌트 라우팅 구조 (현재)

```
[학부모 — 로그인 안 함]
  행복영어학원 카톡 채널 → 오픈빌더 → POST /api/kakao/webhook  (URL 학원 공통)
                                          └ payload.bot.id 로 academies.kakao_channel_id 매칭 → 해당 학원

[원장 — 로그인 함]
  /login → 세션 토큰 → 대시보드 → GET /api/academies/me
                                     └ owner_id = 로그인 유저 → 본인 학원 데이터만
```

---

## Supabase 설정

### 프로젝트
- **Project ID**: lorpaqfwkatavuzxayan / **Region**: ap-northeast-2(서울)
- **URL**: https://lorpaqfwkatavuzxayan.supabase.co
- `.env.local`: SUPABASE URL/ANON/SERVICE_ROLE, ANTHROPIC_API_KEY 설정됨

### 마이그레이션
- ✅ `001_initial_schema.sql` — 테이블 6개 + RLS 정책
- ✅ `002_improvements.sql` — updated_at 트리거, 인덱스, 제약
- ⛔ `003_multitenant_kakao_routing.sql` — **미적용(DDL이라 수동 적용 필요)**. `kakao_channel_id` unique/조회 인덱스.

### 현재 계정/데이터 상태
- auth: `chaejdi2245@gmail.com`(인증됨, 메인) / `learnflow@gmail.com`(미인증, 테스트 흔적)
- 학원: `짱짱맨 수학학원`(chaejdi2245 소유) — 과목/대화 비어 있음(신규)

---

## 다음 할 일

### 즉시 (이어서 하면 좋은 것)
- [ ] **마이그레이션 003 적용** — Supabase SQL 에디터에 붙여넣기 또는 `npx supabase login && link && db push`
- [ ] **로그인 E2E 검증** — `chaejdi2245@gmail.com` 로그인 → 짱짱맨만 보이는지(격리), 사이드바에 학원명 표시 확인
- [ ] **짱짱맨 시드** — 과목/시간표 등록, 상담내역의 "테스트 대화 생성"으로 샘플 채우기
- [ ] **봇 ID 연결 검증** — 설정에 봇 ID 입력 → 그 bot.id로 webhook 호출 시 짱짱맨으로 라우팅되는지

### 멀티테넌트 하드닝 (점검 필요)
- [ ] `middleware.ts` 인증 활성화 (현재 모든 요청 통과 TODO 상태)
- [ ] `requireAuth` — Supabase 설정 상태에서 토큰 없으면 DEMO_USER로 통과하는 부분 재검토(401이 맞을 수 있음)
- [ ] conversations/reservations/subjects/trial-slots API들도 owner 소유권 검사 점검
- [ ] `simulator/page.tsx`는 여전히 `/api/academies/first` 사용(테스트 도구라 의도적) — 필요 시 `/me`로
- [ ] RLS 정책은 현재 service role로 우회 중 — 정책 자체 점검
- [ ] (확장 시) 1계정 다(多)학원 지원 — `/me`·`POST`·학원 선택 UI 변경 필요

### 프로덕션 배포 전
- [ ] 카카오 비즈니스 채널 등록 + 오픈빌더 스킬에 웹훅 URL 등록 + 봇 ID 입력
- [ ] 알림톡 메시지 템플릿 등록/승인 (KAKAO_ADMIN_KEY, KAKAO_SENDER_KEY)
- [ ] Vercel 배포 + 환경변수 세팅

### 사업 측면
- [ ] 실제 학원 1곳 무료 적용 → 성과 데이터(응답시간, 예약 전환율) 수집

---

## 핵심 루프

```
학부모 카톡 문의 → /api/kakao/webhook(POST) → bot.id로 학원 식별
  → AI(Claude) 자동 응답 → conversations 저장
  → 원장 대시보드(/dashboard/inquiries) 확인 → 에스컬레이션 시 직접 답변
  → 체험수업 예약 → 원장 확정 → 알림톡 발송
```
