# LearnFlow 개발 진행 상황 (단일 진실 소스 / SSOT)

> 마지막 업데이트: 2026-06-12 · 실제 코드 기준으로 작성됨
> 제품 스펙은 [PROJECT_SPEC.md](./PROJECT_SPEC.md) 참고. (구버전 PROJECT_STATUS.md는 이 문서로 통합·삭제됨)
>
> **⚠️ 인프라 핵심 2가지 (꼭 기억)**
> 1. **개발·운영이 같은 Supabase**(`lorpaqfwkatavuzxayan`)를 씀. dev/운영 DB 분리 안 됨 → 로컬에서 `supabase db push`·시드·삭제 돌리면 **운영에 즉시 반영**. 파괴적 작업 주의.
> 2. **GitHub 푸시로 자동배포 안 됨.** 프로덕션 반영하려면 `vercel --prod --yes` 수동 실행 필요.

## ✅ 오늘 한 일 — 2026-06-12 (선생님 계정 기능 — 전부 완료·배포·검증)

> 어제 할 일 1·2 완료 + 선생님 초대 UX 끝까지 마감. **커밋·푸시·운영 배포·E2E 검증까지 완료.**
> 커밋: `feat 선생님 계정`(1b33871) → `초대 링크`(d1c56f7) → `소속없음 안내`(d9504b6). 마이그레이션 010·011 운영 DB 반영됨.

1. **관리자 페이지 운영 배포 완료** — `/admin` 운영 반영. `chaejdi2245@gmail.com` 로그인 시 사이드바 "관리자" 노출.
2. **선생님(staff) 계정 기능 구현 완료**
   - **데이터/권한 헬퍼**(`lib/auth.ts`): `getMembership`(소속·역할 해석+초대 자동수락) / `requireMember`(학원 멤버) / `requireOwnerRole`(staff 차단). `invitations` 테이블(010).
   - **권한 차등**(확정): 선생님 ✅ 상담·예약·과목·시간표(수정 포함) / ❌ 전환율 분석·결제·설정.
   - **소유권 검증 전면 적용**: 기존엔 `reservations`만 검증됐고 `subjects·conversations·schedule-terms·trial-slots·schedules`는 **소유권 검사 없음(멀티테넌트 누수)**이었음 → 전부 `requireMember`로 막음. `schedules`는 아예 인증조차 없었음.
   - **UI**: 사이드바 staff 탭 숨김, 설정에 **직원 관리** 섹션, analytics·billing·settings 페이지 staff 가드. `useAcademy`가 `role` 노출.
3. **선생님 초대 링크 방식 완성**(010·011) — 메일(SMTP) 의존 제거.
   - 원장이 이메일 초대 → **초대 링크 생성**(`invitations.token`) → 설정에서 **링크 복사** → 카톡 등으로 선생님에게 전달.
   - 선생님이 `/invite/<token>` 열어 **이름+비밀번호만 정하면** 즉시 가입(`admin.createUser`+`email_confirm`)→staff 연결→자동 로그인. `/api/invite`(GET 조회·POST 수락) 신설.
   - 이미 가입된 이메일이면 "기존 비번으로 로그인하면 자동연결" 안내. 토큰 재사용은 410 차단.
4. **소속 학원 없는 사용자 안내 화면**(`DashboardShell`) — 원장이 선생님을 내보내면 빈 대시보드가 보이던 문제 수정. 로그인됐지만 `academy_id` 없으면 **"소속된 학원이 없습니다" + 로그아웃** 안내(데모 제외).

### 검증(실제 토큰 E2E, 테스트 데이터 전부 삭제)
- 선생님 계정 기본 흐름: **10/10**(운영). 초대 링크 가입: **9/9**(로컬). 내보내기→소속없음: **3/3**(로컬).
- 확인된 것: 초대 자동수락, 권한 차등(billing 403 등), 멀티테넌트 격리(타 학원 403), 토큰 재사용 차단, 내보낸 뒤 `/me`가 `data:null,role:staff`.

---

## 🔜 내일 할 일 (다음 세션 시작점) — 2026-06-13

> 선생님 계정 기능은 코드·배포·자동검증 끝. **남은 건 ① 사람이 직접 눈으로 한 번 확인 ② 실론칭 준비물(PRELAUNCH)**.

1. **(권장) 브라우저로 선생님 초대 한 번 실사용** — 자동 E2E는 통과했지만 실제 화면 확인 안 함.
   - 원장 로그인 → 설정 → 직원 관리 → 선생님 이메일 초대 → **링크 복사** → 그 링크 새 시크릿창에서 열어 가입 → 선생님 화면에 전환율·결제·설정 **안 보이는지**, 내보낸 뒤 **"소속 학원 없음"** 뜨는지 눈으로 확인.
2. ~~**(선택) 마스터 이메일 이중잠금**~~ → ✅ 2026-06-15 완료. `requireMaster`가 role=admin **+ 이메일 허용목록** 둘 다 만족해야 통과. 허용목록은 env `MASTER_EMAILS`(쉼표구분), 미설정 시 `chaejdi2245@gmail.com` 폴백. role이 실수/악의로 admin이 돼도 이메일 다르면 차단. `/api/admin/check`·`/api/admin/academies` 둘 다 적용(사이드바 노출 포함).
3. **(선택) 직원 권한 미세조정** — 지금 staff는 과목·시간표 *수정*까지 허용. 운영하며 "선생님은 보기만" 원하면 읽기전용 모드 추가.
4. **실론칭 준비물 착수** = [PRELAUNCH.md](./PRELAUNCH.md)의 핵심 차단요소들:
   - **카카오**: 채널·오픈빌더 웹훅 등록 + 봇 ID 입력(현재 실 카톡 미도달, 시뮬레이터만 동작)
   - **결제**: Vercel에 토스 키 등록(현재 결제 불가)
   - **알림톡**: 카카오 발신키 + 템플릿 승인
   - **운영 위생**: dev/운영 DB 분리 검토, 데모데이터 삭제

---

## 🧭 현황 요약 (되는 것 / 해야 할 것) — 2026-06-11 기준

> 한눈에 보는 출시 준비도. 상세는 아래 세션 로그 + [PRELAUNCH.md](./PRELAUNCH.md) 참고.

### ✅ 작동 + 검증 완료
- **핵심 파이프라인(시뮬레이터 E2E 검증)**: ① 사전양식→실명표시 `성함(자녀이름)`/`학부모 XXXX` ② AI 실제 시간표만 안내(지어내기 방지, 버그 수정·재검증) ③ 원클릭 예약 생성→예약관리 등록
- **대시보드**: 로그인·회원가입·비번재설정, 멀티테넌트 격리, 문의내역(직접답변·이름수정), 예약관리(추가/수정/삭제·캘린더), 시간표(달력+학기/방학·주단위·색상), 과목 CRUD, 전환율 분석, 설정, 시뮬레이터, AI 커스텀 프롬프트
- **보안**: 전 API에 **멤버십 기반 소유권 검증**(`requireMember`/`requireOwnerRole`) — 예약·상담·과목·시간표·체험슬롯·기간 전부 교차테넌트 403. 결제는 원장 전용.
- **선생님(staff) 계정**: 초대 링크로 가입(메일 불필요)→학원 staff 연결. 권한 차등(전환율·결제·설정 차단), 소속 없으면 안내 화면. E2E 검증 완료.
- **관리자(마스터) 페이지**: `/admin` 전체 고객사 목록·요약(MRR·AI사용량)·학원별 상세 대시보드. `role='admin'`만 접근(읽기전용 모니터링)
- **인프라**: 프로덕션 라이브(`learnflow-orcin.vercel.app`), AI 챗(Gemini)·Supabase 동작

### ⚠️ 코드는 완성 — 외부 키/연동 있어야 실제 작동
- **실제 카톡 자동응답**: 웹훅 ✅ / 카카오 채널·오픈빌더 웹훅 등록·봇 ID 입력 필요 → **현재 실 카톡 미도달(시뮬레이터만)**
- **결제/구독**: 토스 빌링 플로우 ✅ / **Vercel에 토스 키 없음** → 결제 불가
- **알림톡**: 발송 코드 ✅ / 카카오 어드민·발신키 + 템플릿 승인 필요

### ❌ 실 운영 전 해야 할 것 (= PRELAUNCH.md)
- 🔴 **돈/연동**: 토스 라이브키 / 카카오 채널·웹훅·봇ID / 알림톡 템플릿·키 / Gemini 빌링(429 발생)
- 🟠 **인프라**: dev·운영 Supabase 분리 / 운영 DB 데모데이터 삭제(학원1+대화93+예약17+시간표392 등) / Auth URL 실도메인 / (선택)자동배포
- 🟡 **하드닝**: conversations·subjects·trial-slots 소유권 검증 확대 / RLS 점검 / 결제실패·구독만료 처리
- 🟢 **후속**: extract 날짜·시간 정밀도 / **실 학원 1곳 무료적용→성과데이터**(매출의 열쇠)

### 한 줄
제품·핵심흐름은 거의 완성·검증 끝. 남은 건 대부분 **코드가 아니라 외부 계약·키·연동(토스·카카오) + 운영 DB 청소**. 출시 3대 관문: **실 카톡 연동 · 결제 키 · 레퍼런스 학원 1곳**.

---

## 📅 2026-06-11 세션 로그 (오늘 한 일)
- **관리자(마스터) 페이지 신설** — 런플로우 운영자가 전체 고객사(학원)를 관리
  - 권한: `users.role='admin'`(스키마 기존 지원). `requireMaster`(lib/auth) 가드. proxy matcher에 `/admin` 추가. **마스터 계정 = `chaejdi2245@gmail.com`(role=admin 설정 완료, 공유DB라 운영에도 반영됨)**
  - API: `GET /api/admin/academies`(전체 목록+요약: 총 고객사·유료·MRR·이번달 AI), `?id=`(단일 상세: 구독·사용량·통계·최근 문의/예약), `GET /api/admin/check`(사이드바 링크 노출용)
  - 화면: `/admin`(요약 카드 + 학원 테이블: 요금제·상태·이번달 AI사용량/한도·문의·예약·활성도·최근활동), `/admin/[id]`(학원별 상세 대시보드). 대시보드 사이드바에 마스터에게만 "관리자" 링크
  - 검증: owner권한 403 / 마스터 200, 목록·상세 데이터·proxy 리다이렉트·tsc 통과. **읽기전용 모니터링**(요금제 변경·정지 등 액션은 미포함 — 후속)
- **어제 만든 "카톡→예약" 파이프라인 검증 완료** (브라우저/HTTP 표면 직접 구동, 짱짱맨 학원 기준)
  - **① 실명 표시 OK** — 시뮬레이터 사전양식 → conversations에 intake 저장 확인, `displayName`이 `성함(자녀이름)`/없으면 `학부모 XXXX` 렌더(코드+데이터 검증)
  - **② AI 실제 일정 — 버그 발견 후 수정**: AI가 중등 심화를 "화·목 17:00~19:00"로 **날조**(실제 월·수 17:30~19:00). 원인은 `system-prompt.ts`의 "운영 과목" 블록에 남은 `subjects.schedule`(옛 freeform 시간)이 신규 materialized 시간표와 충돌 → 모델이 과목별 텍스트를 신뢰. **수정**: 과목 블록에서 시간 제거 + "정규 수업 시간표를 수업 시간의 유일 권위로" 명시 + 규칙4에 "이름만 보고 시간 추측 금지" 강화. **재검증**: 중등 심화 월·수 17:30~19:00, 고등 정규 화·목 19:00~21:00 모두 시간표 일치 확인
  - **③ 원클릭 예약 OK** — `extract`(intake 우선 추출)→폼→`POST /api/reservations`(slot 자동생성)→예약관리 목록 노출까지 확인(테스트행 정리 완료)
- **후속 결함 2건 수정 완료**:
  - **#2 예약 API 멀티테넌트 격리**: `/api/reservations` GET/POST/PATCH/DELETE에 학원 소유권 검증 추가(`ownsAcademy`/`getReservationWithOwner`). 임시 2번째 원장·학원·예약을 만들어 교차 테넌트 GET/POST/PATCH/DELETE 전부 **403**, 없는 예약 **404**, 본인 학원은 201/200/success 확인 후 정리
  - **#1 extract 과목 추출 보강**: 학부모가 언급·관심 보인 과목이면 예약 미확정이라도 `subject_name` 채우도록 프롬프트 수정. 엔드포인트 e2e로 `중등 수학 심화`+subject_id 매칭 확인
  - **추가**: `extractReservationInfo`가 429/503을 조용히 삼키고 전부 null 반환하던 것 → 채팅과 동일한 재시도(0.8/1.6s 백오프) 추가. (검증 중 Gemini 무료 분당쿼터 초과로 발견 — 실서비스 빌링 활성화 권장)

## 📅 2026-06-10 세션 로그 (오늘 한 일)
- **브라우저 직접 검증 완료(이월 1순위)** — 로그인 E2E·시간표 화면·예약 화면 전부 눈으로 확인 OK
  - 로그인: `Invalid Refresh Token` 콘솔 에러는 **이전 세션 낡은 쿠키 잔재**(비차단). 새로고침 시 로그인 유지+에러 없음 → 리프레시 토큰 정상 저장 확인. 코드 수정 불필요(거슬리면 Clear site data 1회)
- **시간표 "이 주만 추가" 기능** (신규) — 수업 추가 시 기본은 기간 전체(매주), **"이 주만 추가" 버튼** 누르면 그 주에만 1건(특강·보강용). `POST /api/schedules`에 `scope='one'`+`week_start` 추가
- **AI 응답 단락 정리** — 질문(`?`) 뒤 같은 줄에 문장이 붙던 문제. 프롬프트만으론 들쭉날쭉 → **서버 후처리 `formatParagraphs`로 강제**(물음표 뒤 단락 분리, 줄끝 공백·과한 줄바꿈 정리). 렌더링도 `whitespace-pre-wrap` 적용(시뮬레이터+문의내역)
- **상담내역 401 버그 수정** — 문의 내역이 conversations를 **토큰 없는 plain `fetch`**로 불러 401(6/8 requireAuth 하드닝 때 누락). `apiFetch`로 교체(GET/POST/seed 3곳). billing 페이지들은 수동 Bearer라 정상
- **상담자 실명 표시** (마이그레이션 008) — conversations에 `parent_name·child_name·relationship·child_age·inquiry_topic` 추가
  - 시뮬레이터에 **상담 전 사전 양식**(성함·자녀이름·관계·나이·상담내용). 상담내용은 첫 메시지로 자동 전송. "양식 없이 바로 문의"도 가능
  - 표시 규칙: **성함·자녀이름 둘 다 있으면 `성함(자녀이름)`, 아니면 기존 `학부모 XXXX`**(끝 4자리)
  - 원장이 문의내역 상세 **연필 버튼**으로 이름·관계·나이·연락처 수정(`PATCH /api/conversations`, 소유권 검증). 비우면 익명으로 복귀
- **카톡 상담 → 실제 예약 연결 파이프라인** (신규, 핵심)
  - **① AI 실제 일정 반영**: `getAvailabilityContext`가 이번 주 정규 시간표+기존 체험예약을 AI 프롬프트에 주입. chat·웹훅 모두. "시간표 없는 시간 지어내지 말 것" 규칙. (검증: 실제 16:00~17:30 안내 확인)
  - **② 전화번호 인테이크** (마이그레이션 009): conversations.phone + 사전양식/수정모달 필드
  - **③ 예약정보 추출 API**: `POST /api/conversations/extract` — Gemini로 대화에서 자녀이름·전화·과목·희망날짜·시간 JSON 추출(인테이크 우선, 과목명→ID 매칭, 소유권 검증)
  - **④ 원장 원클릭 예약 생성**: 문의내역 상세 "예약 생성" 버튼 → 추출+인테이크로 폼 프리필 → 원장 확인·수정 → `POST /api/reservations` → 예약 관리 등록
- **발견·확인**: 카톡 예약이 예약관리에 안 들어가던 건 **예약 생성 코드가 원래 없었기 때문**(needs_reservation 플래그만 반환). 이름·전화는 대화 JSON에만 저장되던 것 → 위 파이프라인으로 해결
- ⚠️ **오늘 작업 전부 미커밋** (14개 파일). 마이그레이션 008·009는 운영 DB에 이미 적용됨(`db push`)

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
- **실제 일정 반영**(2026-06-10) — `getAvailabilityContext`(`src/lib/ai/context.ts`)가 이번 주 정규 시간표+기존 체험예약을 프롬프트에 주입 → AI가 실제 빈 시간만 안내(지어내기 금지)
- **응답 단락 정리**(2026-06-10) — `formatParagraphs`로 질문(`?`) 뒤 단락 강제 분리
- **예약정보 추출**(2026-06-10) — `extractReservationInfo`(JSON 모드) + `POST /api/conversations/extract`로 대화에서 예약 정보 구조화

### 5. 대시보드
- 메인(`/dashboard`) — 통계 4종(이번달 필터링) + 최근 문의
- 문의 내역(`/dashboard/inquiries`) — 대화 목록 + 채팅 뷰 + 원장 직접 답변. **상담자 실명 표시**(`성함(자녀이름)`, 없으면 `학부모 XXXX`)·**이름 수정**·**원클릭 예약 생성**(2026-06-10)
- 예약 관리(`/dashboard/reservations`) — 추가/수정/삭제·확정/취소·캘린더. 문의내역 "예약 생성"으로도 등록됨
- 시간표(`/dashboard/schedule`) — 정규 시간표 DB 저장
- 과목(`/dashboard/subjects`) — 과목 CRUD
- 설정(`/dashboard/settings`) — 학원 정보 + 카카오 봇 ID + AI 커스텀 프롬프트
- **전환율 분석(`/dashboard/analytics`)** — 월별 문의→예약 퍼널 시각화
- 시뮬레이터(`/simulator`) — AI 응답 테스트 도구(`/api/academies/first` 의도적 사용) + **상담 전 사전 양식**(성함·자녀이름·관계·나이·연락처·상담내용, 2026-06-10)

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
| `008_conversation_intake.sql` | conversations에 parent_name·child_name·relationship·child_age·inquiry_topic | ✅ 2026-06-10 `db push` 적용 |
| `009_conversation_phone.sql` | conversations에 phone | ✅ 2026-06-10 `db push` 적용 |

> ⚠️ **이 DB는 운영도 같이 씀**(위 인프라 메모 참고). 마이그레이션·시드는 운영에 즉시 반영됨.
> 006 적용 시 CLI 마이그레이션 히스토리 드리프트(`20240101…` 허위 버전)를 `migration repair`로 정리함.

> **결론: 003~007 모두 DB에 반영됨. 런타임 깨질 위험 없음.** 결제·AI커스텀·시간표 코드가 의존하는 테이블/컬럼 전부 존재.
> 유일한 미확인: 003의 unique 인덱스 존재 여부(기능엔 영향 없음 — `PATCH /api/academies`가 앱 레벨에서 봇ID 중복을 막음). 확실히 하려면 Supabase SQL 에디터에서 `\d academies` 또는 `select indexname from pg_indexes where tablename='academies'` 한 번 실행.

---

## 📋 남은 일 (TODO)

> **다음 세션 바로 시작점**: ⚠️ 오늘 만든 것 **전부 미커밋(14파일)**. 먼저 ① 새 예약 파이프라인 브라우저 확인 → ② **커밋·푸시** → ③ `vercel --prod` 배포. dev 서버는 백그라운드로 떠 있음(localhost:3000).

### 🔴 1순위 — "카톡→예약" 파이프라인 검증 + 커밋/배포 → ✅ 2026-06-11 완료
- [x] **사전 양식 + 실명 표시** — intake 저장 + `성함(자녀이름)`/`학부모 XXXX` 렌더 확인
- [x] **AI 실제 일정 안내** — 버그(시간 날조) 발견→`system-prompt.ts` 수정→재검증 통과
- [x] **원클릭 예약 생성** — extract→폼→`POST /api/reservations`→예약관리 등록 확인
- [x] **커밋·푸시·배포** — 2026-06-11 진행
- [x] (후속) extract `subject_name` 추출 보강 + `/api/reservations` 소유권 검증(#1·#2) — 2026-06-11 완료

### 🟠 1.5순위 — 인프라 정리 (실서비스 전 권장)
- [ ] **dev/운영 Supabase 분리** — 현재 로컬·운영이 같은 DB. 개발용 Supabase 프로젝트 새로 만들고 `.env.local`만 거기로. (운영 시드·실험 격리)
- [ ] **운영 DB 테스트 더미 정리** — `seedhist_%` 대화 89건, `reservations.notes='[seedhist]'` 백필, 짱짱맨 데모. 실서비스 시작 전 삭제 (마커로 깔끔히 제거 가능)
- [ ] (선택) **Vercel↔GitHub 자동배포 연동** — 현재 푸시해도 자동배포 안 됨, `vercel --prod` 수동. 연동하면 푸시만으로 배포

### 🟡 2순위 — 하드닝 / 점검
- [ ] `/api/schedules`에 소유권 검사 없음(requireAuth 미적용) — 다른 라우트와 일관성 맞추기 (오늘 scope='one' 추가했지만 인증은 여전히 없음)
- [ ] conversations(GET/POST)·reservations·subjects·trial-slots API 소유권 검사 일관성 점검 (오늘 `PATCH /api/conversations`·`/api/conversations/extract`엔 owner_id 검증 추가함 — 나머지도 맞추기)
- [ ] 결제 카드 등록 E2E (토스 테스트키) → 구독 상태 변화 확인
- [ ] RLS 정책 자체 점검(현재 service role로 우회 중)
- [ ] 결제 실패/구독 만료(past_due, expired) 상태 처리 검증
- [x] ~~`requireAuth` 401~~ / ~~로그인 쿠키 세션~~ / ~~Gemini 전환·상담저장~~ → **2026-06-08 완료**
- [x] ~~짱짱맨 시드~~ / ~~시간표 달력·주단위 개편~~ / ~~예약 추가수정삭제·캘린더~~ → **2026-06-09 완료**
- [x] ~~로그인·시간표·예약 브라우저 검증~~ / ~~상담내역 401 수정~~ / ~~시간표 '이 주만' 추가~~ / ~~AI 단락 정리~~ / ~~상담자 실명 표시~~ / ~~카톡→예약 파이프라인(AI 일정·추출·원클릭)~~ → **2026-06-10 완료**(새 파이프라인 브라우저 점검·커밋만 남음)

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
