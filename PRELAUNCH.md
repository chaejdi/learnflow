# 실 운영 전 변경 체크리스트 (PRELAUNCH)

> 작성: 2026-06-11 · 실제 코드/DB/Vercel 설정 기준
> 목적: 테스트 기간에 임시로 둔 값 → 실 운영 전 반드시 바꿔야 할 것 모음.
> 관련: [PROGRESS.md](./PROGRESS.md) 1.5순위·3순위.

---

## 0. 지금 상태 한눈에
- ✅ 작동: AI 챗(Gemini), Supabase(인증·DB)
- ❌ 미작동(키 없음): **토스 결제, 카카오 알림톡, 실제 카톡 웹훅 연동**
- ⚠️ dev=운영 같은 Supabase, 운영 DB에 데모 데이터 가득, 수동 배포

---

## 1. 환경변수 (Vercel Production)

현재 Vercel 프로덕션에 설정된 것 **6개뿐**:
`GOOGLE_GEMINI_API_KEY` · `GROQ_API_KEY` · `ANTHROPIC_API_KEY` · `SUPABASE_SERVICE_ROLE_KEY` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `NEXT_PUBLIC_SUPABASE_URL`

| 변수 | 현재(테스트) | 실 운영 시 | 코드 사용처 |
|---|---|---|---|
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | **미설정** | 토스 **라이브** 클라이언트키 | billing/register, billing |
| `TOSS_SECRET_KEY` | **미설정** | 토스 **라이브** 시크릿키 | api/billing/card |
| `KAKAO_ADMIN_KEY` | 로컬 `your_kakao_admin_k…`(더미), prod 미설정 | 실 어드민키 | lib/kakao (알림톡) |
| `KAKAO_SENDER_KEY` | 미설정 | 알림톡 발신프로필키 | lib/kakao (알림톡) |
| `GOOGLE_GEMINI_API_KEY` | 무료 등급 키 | **빌링 활성화**된 키(분당/일 한도 해제) | lib/ai/client |
| `GROQ_API_KEY`·`ANTHROPIC_API_KEY` | 설정됨 | **미사용(폴백 주석)** — 정리 가능 | (주석) |

> 추가 방법: `vercel env add <NAME> production`
> 참고: `.env.local`의 `KAKAO_REST_API_KEY`·`KAKAO_CHANNEL_ID`·`NEXT_PUBLIC_APP_URL`은 **코드에서 안 쓰임**(무시 가능). 채널 식별은 DB `academies.kakao_channel_id`로 함.

---

## 2. Supabase (인프라)

- [ ] **dev/운영 분리** — 현재 로컬·운영 모두 `lorpaqfwkatavuzxayan` 동일 프로젝트. 개발용 새 프로젝트 만들고 `.env.local`만 거기로. (운영 시드·실험 격리)
- [ ] **Auth 설정(호스팅 대시보드)** — `config.toml`은 로컬 CLI용. 실 운영은 Supabase 대시보드에서:
  - Site URL / Redirect URLs → **실 도메인**(비밀번호 재설정·이메일 확인 링크가 localhost로 가지 않도록)
  - 이메일 확인(enable_confirmations) 정책 + SMTP(실 발송) 설정
- [ ] **운영 DB 데모 데이터 삭제** (실 학원 받기 전):

| 테이블 | 현재 행수 | 비고 |
|---|---|---|
| academies | 1 | **짱짱맨 수학학원**(데모) |
| conversations | 93 (seedhist 89) | `kakao_user_id like 'seedhist_%'` |
| reservations | 17 (seedhist 13) | `notes like '%seedhist%'` |
| subjects | 4 | 데모 과목 |
| schedules | 392 | 데모 시간표(materialize) |
| schedule_terms | 3 | 학기/방학 |
| subscriptions | 1 | 데모 구독 |

> 멱등 마커(`seedhist_%`, `[seedhist]`)로 시드분만 깔끔히 지울 수 있음. 단 데모 academy 통째로 새로 시작할 거면 academy_id 기준 전체 삭제.

---

## 3. 결제 (토스페이먼츠)

- [ ] 토스 **실 계약** + 라이브 키 발급 → 위 env 2개 설정
- [ ] 카드 등록 → 정기결제(빌링키) E2E 점검(실 키로)
- [ ] **플랜 가격 확정** (변경 시 `plans` 테이블 — migration 004 시드):
  - `trial` 무료체험 0원 / 14일 / AI 100건
  - `basic` 기본 **19,900원** / AI 200건
  - `pro` 프로 **39,900원** / AI 무제한
- [ ] 결제 실패·구독 만료(past_due/expired) 상태 처리 검증

---

## 4. 카카오톡

- [ ] 비즈니스 채널 + **오픈빌더 웹훅 URL 등록**(실 도메인 `/api/kakao/webhook`)
- [ ] 설정 화면에서 **각 학원 봇 ID 입력** → `academies.kakao_channel_id`
  - 현재 데모 academy엔 임시값(`6a226d…`) 들어가 있음. 실 채널 ID로 교체.
- [ ] **알림톡 템플릿 등록·승인**(`reservation_confirmed` 등) + 발신프로필
- 미연결 시: 웹훅이 봇 ID 안내만 응답(실 카톡 메시지 도달 안 함)

---

## 5. AI (Gemini)

- [ ] **무료 한도 → 빌링 활성화** (검증 중 분당 쿼터 429 실제 발생). 트래픽 늘면 추출/응답이 조용히 비어질 수 있음(재시도는 있으나 한도 자체가 막힘).
- 모델 `gemini-2.5-flash`, `thinkingBudget=0` 유지.

---

## 6. 배포 / 코드상 임시값

- [ ] **GitHub 자동배포 미연동** — 푸시해도 자동배포 안 됨. `vercel --prod --yes` 수동. (연동하면 푸시만으로 배포)
- [ ] **시뮬레이터 `/api/academies/first`** — DB "첫 학원"을 반환. 멀티테넌트 시 시뮬레이터가 로그인 원장 학원을 쓰도록 점검(내부 도구라 우선순위 낮음).
- [ ] **하드코딩 표시값**(실데이터로 덮이나 확인): 시뮬레이터 헤더 "우리동네 수학학원"(정적 라벨), `settings`·`dashboard` 기본 더미.
- 데모 바이패스(`/signup` "데모 대시보드 입장", `DEMO_USER`): **Supabase env 설정되면 자동 비활성**. env만 보장하면 됨.

---

## 7. (이미 처리됨 / 참고)
- 예약 API 멀티테넌트 소유권 검증 ✅ (2026-06-11)
- conversations·subjects·trial-slots API 소유권 검증 일관성은 **남음**(PROGRESS 2순위)
- RLS 정책 자체 점검 — 현재 service role로 우회 중(2순위)
