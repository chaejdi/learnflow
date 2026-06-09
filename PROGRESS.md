# LearnFlow 개발 진행 상황 (단일 진실 소스 / SSOT)

> 마지막 업데이트: 2026-06-09 · 실제 코드 기준으로 작성됨
> 제품 스펙은 [PROJECT_SPEC.md](./PROJECT_SPEC.md) 참고. (구버전 PROJECT_STATUS.md는 이 문서로 통합·삭제됨)
>
> **⚠️ 인프라 핵심 2가지 (꼭 기억)**
> 1. **개발·운영이 같은 Supabase**(`lorpaqfwkatavuzxayan`)를 씀. dev/운영 DB 분리 안 됨 → 로컬에서 `supabase db push`·시드·삭제 돌리면 **운영에 즉시 반영**. 파괴적 작업 주의.
> 2. **GitHub 푸시로 자동배포 안 됨.** 프로덕션 반영하려면 `vercel --prod --yes` 수동 실행 필요.

## 📅 2026-06-09 세션 로그 (오늘 한 일)
- **시간표 = 달력 + 기간(학기/방학) 단위로 개편** (신규 기능)
  - 마이그레이션 `006_schedule_terms.sql`: `schedule_terms` 테이블(학기/방학 기간) 신설 + `schedules.term_id` 추가. **원격 적용 완료** (CLI 마이그레이션 히스토리 드리프트 `migration repair`로 정리 후 `db push`)
  - API: `/api/schedule-terms`(GET/POST/PATCH/DELETE, 소유권 검사) 신설, `/api/schedules`에 `term_id` 필터·저장 추가
  - 화면(`/dashboard/schedule` 정규 시간표 탭): **월 달력 → 주 클릭 → 그 주가 속한 기간의 주간 시간표** 표시. 기간 칩(색상)·기간 추가/수정/삭제 모달. 기간 없는 주는 "미설정"
  - 데모 시드: '1학기 정규'(3/2~7/17, 9수업) + '여름방학 특강'(7/20~8/21, 15수업 오전반). 7/20부터 시간표가 바뀌고 8/24부터 미설정으로 보임(검증 완료)
  - **달력 색칠을 날짜(일) 단위로 수정** — 기존엔 주의 '월요일' 기준이라 학기/방학이 주 중간에 시작하면(예: 겨울방학 12/17 목요일) 그 주가 통째로 빠지는 버그. 이제 각 날짜가 자기 기간 색으로 칠해지고, 주의 시간표는 그 주에 가장 많이 걸친 기간으로 선택(`termForWeek`)
  - **시간표 수정/삭제** — 시간표 그리드 칸·목록 행 클릭 → 수정 모달(삭제 버튼 포함). `PATCH /api/schedules` 추가
  - **달력 연/월 이동 2년씩 점프 버그 수정** — `setViewMonth` 업데이터 안에서 `setViewYear`를 중첩 호출 → Strict Mode 이중 실행으로 연도 2배 변경. 중첩 제거
- **시간표 주 단위 occurrence + 색상 + 시각화 개편** (마이그레이션 `007_schedule_weekly.sql`)
  - `schedules`에 `week_start`(속한 주 월요일)·`series_id`(반복 묶음)·`color` 추가. 시간표를 주별로 실체화(materialize)
  - 추가: 기간 전체 주에 동일 수업 깔림(POST가 term 범위의 모든 월요일에 행 생성, series_id로 묶음)
  - 수정/삭제: **이 주만 / 이번 주+이후 전체** 선택(`scope=one|future`, series_id+week_start 기준). API 검증 완료
  - 시각화: 시간표 그리드를 절대배치로 바꿔 **블록이 수업 시간만큼 세로로 꽉 참**, 같은 시간 겹치는 수업은 **나란히(lane 분할)** 표시
  - **수업별 색상 선택** → 이후 hex 기반(프리셋 16색 + `input[type=color]` 직접 선택, 무제한)으로 교체. 구버전 팔레트 키는 `resolveColor`로 호환. 과목별 기본색 시드
  - 재시드: 1학기 200행·여름방학 75행·겨울방학 80행(총 355 occurrence). 월 17:30 겹침 수업 데모 포함
  - 시간 입력을 네이티브 피커→**드롭다운(오전/오후·시1~12·분0~59)** 으로 교체(`src/components/TimeSelect.tsx` 공용). 시작≥종료 시 저장 차단+안내. 모든 팝업 ESC 닫기
- **예약 관리 대시보드 추가/수정/삭제** (신규)
  - 기존엔 확정/취소(상태)만 가능, 예약 생성 경로가 앱에 아예 없었음(카톡/AI는 예약 자동생성 안 함 — `needs_reservation` 플래그만). 화면 데이터는 시드 더미였음
  - `/api/reservations`: POST가 `trial_slot_id` 없이 과목·날짜·시간 받으면 trial_slot 자동 생성 후 예약 연결. PATCH로 학부모/학생/슬롯(날짜·시간·과목)·상태 수정, DELETE 추가(연결 슬롯도 정리). 전부 `requireAuth`
  - 화면: "예약 추가" 버튼 + 행 수정(연필) 모달(학부모·연락처·학생·학년·과목·날짜·시간·상태). DB `trial_slots.chk_time_order`(start<end) 제약 있어 모달에서 검증
- **짱짱맨 학원 데모 데이터 시드** — 대시보드/전환율 화면 점검용
  - 정규 시간표 9건: 초등 사고력(월수금 15:00), 중등 기본(화목 16:00), 중등 심화(월수 17:30), 고등 정규(화목 19:00)
  - 과거 2~5월 백필: 대화 89건 + 예약 13건. 전환율 2월 8.3% → 6월 25.0% 우상향. 6월은 기존 3/3에 문의 9건 더해 12/3=25%로 현실화
  - 멱등 처리: `kakao_user_id LIKE 'seedhist_%'`, `reservations.notes='[seedhist]'` 마커 → 재실행 시 중복 없이 갱신
- **예약 캘린더 보기 추가** — 예약관리에 `목록 | 캘린더` 토글. 캘린더는 상태별 색칠 칩으로 날짜 배치, 빈 날 클릭→그 날짜로 추가, 칩 클릭→수정. 날짜 유틸 인라인
- **프로덕션 재배포** — `vercel --prod`로 위 전부 라이브 반영 완료(learnflow-orcin). 새 라우트 401·시드 데이터 일치로 검증
- **발견: 개발=운영 같은 Supabase** — 프로덕션 `/api/schedules`가 로컬에서 심은 시드(week_start·color)를 그대로 반환 → 동일 DB 확정. 자동배포도 안 걸려있음(수동 `vercel --prod`)
- **커밋·푸시 완료**: `52af2f1`(시간표 개편), `487152a`(예약·색상·시간입력). origin/main 반영
- 남은 1순위: 로그인 E2E·상담저장 + 오늘 만든 시간표/예약 UI **브라우저 직접 확인** 필요(아래 TODO)

## 📅 2026-06-08 세션 로그 (오늘 한 일)
- 문서 통합(SSOT화), 마이그레이션 003~005 실 DB 적용 검증(전부 OK)
- E2E 검증 + 하드닝: 비인증 API 401 반환(`requireAuth`)
- middleware → proxy 마이그레이션(Next.js 16 deprecation 해소)
- **로그인 후 대시보드 진입 불가** 수정 — `@supabase/ssr` 쿠키 세션(proxy가 쿠키 인식)
- **카톡 AI 모델 교체**: Groq Llama → **Gemini 2.5 Flash** (한자 문제 해결, 한국어 품질↑)
  - `thinkingBudget=0`으로 thinking 끔(빈 응답 버그 해결), 503 재시도
- **상담내역 미저장 버그** 수정 — AI 실패가 대화 저장을 스킵하던 문제. `generateAIResponse`는 이제 throw 안 하고 안내문 반환 → 항상 저장
- **프로덕션 배포 라이브**: https://learnflow-orcin.vercel.app (커밋 f4c3521~d2dea1e)

---

## 프로젝트 개요
- **서비스**: 런플로우 (LearnFlow) — AI 기반 학원 학부모 상담 자동화 플랫폼
- **스택**: Next.js 16 + Supabase(PostgreSQL) + **Gemini 2.5 Flash** + 토스페이먼츠 + 카카오톡 연동
- **핵심 루프**: 학부모 카톡 문의 → AI 자동 응답 → 체험수업 예약 → 원장 대시보드 관리
- **모델**: 학원별 구독 SaaS(멀티테넌트). 1계정 = 1학원(현재 1:1).

---

## ✅ 완료된 것 (실제 코드/커밋 기준)

### 1. 랜딩 / 디자인
- 랜딩 페이지(`src/app/page.tsx`) + 컴포넌트(Header, Hero, Features, HowItWorks, Pricing, FAQ, Footer)
- 디자인 토큰(`src/styles/design-tokens.ts`), Noto Sans KR, Tailwind v4 커스텀 테마
- 브랜딩: 런플로우 모노그램 마크 + 학원명 사이드바

### 2. 인증 (auth)
- 로그인(`/login`), 회원가입(`/signup`), 비밀번호 재설정(`/reset-password`, `/reset-password/update`)
- **미들웨어 인증 가드 활성화** — `src/middleware.ts`가 `/dashboard/:path*` 보호. Supabase auth 쿠키 없으면 `/login?redirect=`로 리다이렉트.
- `requireAuth` / `isAuthError`(`src/lib/auth.ts`) — API 라우트 인증 가드

### 3. 멀티테넌트 / 온보딩
- 온보딩: 회원가입 폼에서 계정 + 학원 동시 생성. 이메일 인증 ON이어도 동작(`src/lib/onboarding.ts` 임시 보관 → 첫 로그인 시 생성)
- 학원 격리: `GET /api/academies/me`(owner_id = 로그인 유저), 모든 학원 API에 소유권 검사
- `useAcademy` 훅 — 내 학원 id/name/구독상태 제공

### 4. AI 챗봇
- **모델: Gemini 2.5 Flash** (`src/lib/ai/client.ts`) — REST 직접 호출, `thinkingBudget=0`(추론 끔), 503/429 재시도. `generateAIResponse`는 throw 안 함(실패해도 안내문 반환 → 대화 항상 저장). Groq/Claude는 폴백 주석으로 보존. 환경변수 `GOOGLE_GEMINI_API_KEY`(로컬+Vercel 프로덕션 설정됨).
- 카카오 웹훅(`/api/kakao/webhook`) — `payload.bot.id`로 `academies.kakao_channel_id` 매칭해 학원 식별 (위험한 "첫 학원" fallback 제거됨). 미연결 채널엔 봇 ID 안내 응답.
- chat API(`/api/chat`) — 대화 이력 + AI 호출 (시뮬레이터가 사용하는 경로)
- **AI 응답 커스터마이징** — 학원별 `ai_custom_prompt`(migration 005)로 시스템 프롬프트 조정
- 시스템 프롬프트 생성(`src/lib/ai/system-prompt.ts`) — 학원 DB 정보 기반(hallucination 방지)

### 5. 대시보드
- 메인(`/dashboard`) — 통계 4종(이번달 필터링) + 최근 문의
- 문의 내역(`/dashboard/inquiries`) — 대화 목록 + 채팅 뷰 + 원장 직접 답변
- 예약 관리(`/dashboard/reservations`) — 확정/취소
- 시간표(`/dashboard/schedule`) — 정규 시간표 DB 저장
- 과목(`/dashboard/subjects`) — 과목 CRUD
- 설정(`/dashboard/settings`) — 학원 정보 + 카카오 봇 ID + AI 커스텀 프롬프트
- **전환율 분석(`/dashboard/analytics`)** — 월별 문의→예약 퍼널 시각화
- 시뮬레이터(`/simulator`) — AI 응답 테스트 도구(`/api/academies/first` 의도적 사용)

### 6. 결제 / 구독 (토스페이먼츠)
- 플랜: 무료체험(0, 14일)/기본(19,900, AI 200건)/프로(39,900, 무제한) — migration 004
- 빌링(`/dashboard/billing`) + 카드 등록 플로우(`register`, `success`, `fail`)
- API: `/api/billing`(구독+사용량 조회), `/api/billing/card`, `/api/billing/subscribe` — 정기결제 빌링키 발급

### 7. 법적 고지
- 이용약관(`/terms`), 개인정보처리방침(`/privacy`)

### 8. 인프라
- `vercel.json` 한국 리전(icn1), `next build` 통과, `/api/health` 헬스체크

---

## 🗄️ Supabase

### 프로젝트
- **Project ID**: lorpaqfwkatavuzxayan / **Region**: ap-northeast-2(서울)
- **URL**: https://lorpaqfwkatavuzxayan.supabase.co
- `.env.local`: SUPABASE URL/ANON/SERVICE_ROLE, ANTHROPIC_API_KEY 설정됨

### 마이그레이션 적용 상태 (2026-06-08 service role로 실 DB 검증)
| 파일 | 내용 | 적용 |
|---|---|---|
| `001_initial_schema.sql` | 테이블 6개 + RLS | ✅ |
| `002_improvements.sql` | updated_at 트리거, 인덱스 | ✅ |
| `003_multitenant_kakao_routing.sql` | kakao_channel_id unique/조회 인덱스 | ✅ 컬럼 확인됨 (인덱스 자체는 PostgREST로 미확인, 앱단 중복검사 있음) |
| `004_billing_schema.sql` | plans/subscriptions/payments/usage_logs | ✅ 4개 테이블 + plans 시드 3건(trial/basic/pro) 확인 |
| `005_ai_custom_prompt.sql` | academies.ai_custom_prompt 컬럼 | ✅ 컬럼 확인됨 |
| `006_schedule_terms.sql` | schedule_terms 테이블 + schedules.term_id | ✅ 2026-06-09 `db push` 적용 |
| `007_schedule_weekly.sql` | schedules에 week_start·series_id·color | ✅ 2026-06-09 `db push` 적용 |

> ⚠️ **이 DB는 운영도 같이 씀**(위 인프라 메모 참고). 마이그레이션·시드는 운영에 즉시 반영됨.
> 006 적용 시 CLI 마이그레이션 히스토리 드리프트(`20240101…` 허위 버전)를 `migration repair`로 정리함.

> **결론: 003~007 모두 DB에 반영됨. 런타임 깨질 위험 없음.** 결제·AI커스텀·시간표 코드가 의존하는 테이블/컬럼 전부 존재.
> 유일한 미확인: 003의 unique 인덱스 존재 여부(기능엔 영향 없음 — `PATCH /api/academies`가 앱 레벨에서 봇ID 중복을 막음). 확실히 하려면 Supabase SQL 에디터에서 `\d academies` 또는 `select indexname from pg_indexes where tablename='academies'` 한 번 실행.

---

## 📋 남은 일 (TODO)

> **다음 세션 바로 시작점**: 오늘 시간표·예약 기능을 코드/API/빌드까지 검증했지만 **브라우저로 직접 눈으로 본 건 아직 없음**. 1순위는 화면 확인. (localhost:3000 dev 서버 + 프로덕션 둘 다 최신 코드 반영됨)

### 🔴 1순위 — 브라우저 직접 검증 (오늘 만든 것 + 이월분)
- [ ] **시간표 화면 점검**(`/dashboard/schedule`) — ①월 달력에서 주 클릭 시 그 주 시간표 표시 ②7~8월 넘기면 여름방학으로 시간표 바뀌는지 ③블록이 시간만큼 세로로 차고 월 17:30 겹침 수업 나란히 ④수업 클릭→색상(직접 선택 포함) 수정, "이 주만/이후 전체" 동작 ⑤시간 드롭다운(오전/오후) ⑥연/월 이동 정상(2년 점프 없음)
- [ ] **예약 화면 점검**(`/dashboard/reservations`) — ①"예약 추가"로 등록→목록에 뜨는지 ②연필로 수정/삭제 ③목록↔캘린더 토글, 캘린더에서 빈 날 클릭→추가·칩 클릭→수정
- [ ] **로그인 E2E 직접 확인** — `chaejdi2245@gmail.com` 로그인 → 대시보드 진입(쿠키 세션 수정 후 첫 실사용). 안 되면 F12→Application→"Clear site data" 후 재시도
- [ ] **상담내역 저장 확인** — 시뮬레이터(`/simulator`)에서 대화 → 대시보드 상담내역에 뜨는지 (코드 수정은 검증됨, UI 확인만 남음)

### 🟠 1.5순위 — 인프라 정리 (오늘 발견, 실서비스 전 권장)
- [ ] **dev/운영 Supabase 분리** — 현재 로컬·운영이 같은 DB. 개발용 Supabase 프로젝트 새로 만들고 `.env.local`만 거기로. (운영 시드·실험 격리)
- [ ] **운영 DB 테스트 더미 정리** — `seedhist_%` 대화 89건, `reservations.notes='[seedhist]'` 백필, 짱짱맨 데모. 실서비스 시작 전 삭제 (마커로 깔끔히 제거 가능)
- [ ] (선택) **Vercel↔GitHub 자동배포 연동** — 현재 푸시해도 자동배포 안 됨, `vercel --prod` 수동. 연동하면 푸시만으로 배포

### 🟡 2순위 — 하드닝 / 점검
- [ ] `/api/schedules`에 소유권 검사 없음(requireAuth 미적용) — 다른 라우트와 일관성 맞추기
- [ ] conversations/reservations/subjects/trial-slots API 소유권 검사 일관성 점검
- [ ] 결제 카드 등록 E2E (토스 테스트키) → 구독 상태 변화 확인
- [ ] RLS 정책 자체 점검(현재 service role로 우회 중)
- [ ] 결제 실패/구독 만료(past_due, expired) 상태 처리 검증
- [x] ~~`requireAuth` 401~~ / ~~로그인 쿠키 세션~~ / ~~Gemini 전환·상담저장~~ → **2026-06-08 완료**
- [x] ~~짱짱맨 시드로 대시보드·전환율 채우기~~ / ~~시간표 달력·주단위 개편~~ / ~~예약 추가수정삭제·캘린더~~ → **2026-06-09 완료**(브라우저 점검만 남음)

### 🟢 3순위 — 프로덕션 외부 작업 (코드 밖, 사람이 직접)
- [ ] **실제 카카오톡 연동** — 비즈니스 채널 + 오픈빌더 웹훅 URL 등록 + 설정에 봇 ID 입력 (이게 돼야 실 카톡 메시지가 웹훅에 도달. 현재 `kakao_channel_id` 비어있어 실 카톡은 미연동)
- [ ] 알림톡 메시지 템플릿 등록/**승인**(KAKAO_ADMIN_KEY, KAKAO_SENDER_KEY)
- [ ] 토스페이먼츠 실 계약/라이브 키 발급
- [ ] Gemini 트래픽 늘면 빌링 활성화(무료 한도 분당10/일250 초과 대비)
- [ ] 실제 학원 1곳 무료 적용 → 성과 데이터(응답시간, 예약 전환율) 수집

---

## 멀티테넌트 라우팅 구조

```
[학부모 — 로그인 안 함]
  학원 카톡 채널 → 오픈빌더 → POST /api/kakao/webhook  (URL 학원 공통)
                                └ payload.bot.id 로 academies.kakao_channel_id 매칭 → 해당 학원

[원장 — 로그인 함]
  /login → 세션 토큰 + 미들웨어 가드 → 대시보드 → GET /api/academies/me
                                          └ owner_id = 로그인 유저 → 본인 학원 데이터만
```
