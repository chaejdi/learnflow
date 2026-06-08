# LearnFlow (런플로우) — 프로젝트 스펙

> 📌 이 문서는 **제품 기획/스펙**(무엇을 만드는가)입니다. 개발 진행 현황·할 일은 [PROGRESS.md](./PROGRESS.md)를 보세요.

## 서비스 정의
학부모가 카카오톡으로 문의하면 AI가 24시간 상담·체험 예약까지 처리해주는 학원 전용 서비스

## 사용자
| 사용자 | 하는 일 |
|--------|---------|
| 학부모 | 카카오톡으로 문의 (앱 설치·회원가입 없음) |
| AI 챗봇 | 24시간 자동 응답, 체험 예약 접수, 복잡한 건 원장님에게 전달 |
| 원장님 | 최초 학원 정보 입력 (20분), 이후 카톡 알림 확인만 |

## 핵심 기능
1. **AI 상담 챗봇** — 학원 정보 기반 자동 응답 (과목, 시간표, 수업료, 잔여석)
2. **체험 수업 예약** — 대화 흐름 안에서 날짜 선택 → 예약 완료
3. **원장님 알림** — 새 문의·예약 발생 시 카톡으로 즉시 알림
4. **대시보드** — 문의 현황, 예약 현황, 전환율 확인

## 기술 스택
- Frontend: Next.js 15 + TypeScript + Tailwind CSS
- Backend: Next.js API Routes
- AI: Claude API (Anthropic)
- DB: Supabase (PostgreSQL)
- Chat: 카카오톡 채널 API
- Notification: 카카오 알림톡 API
- Deploy: Vercel
- Auth: Supabase Auth + 카카오 OAuth

## 페이지 구조
1. **랜딩 페이지** (`/`) — 서비스 소개 + 원장님 가입 유도
2. **로그인** (`/login`) — 카카오 OAuth
3. **대시보드** (`/dashboard`) — 문의·예약 현황 요약
4. **문의 내역** (`/dashboard/inquiries`) — AI 상담 기록 열람
5. **예약 관리** (`/dashboard/reservations`) — 체험 수업 예약 목록
6. **학원 설정** (`/dashboard/settings`) — 과목·시간표·수업료·체험일정 입력
7. **API 엔드포인트** (`/api/kakao/webhook`) — 카카오톡 메시지 수신·응답
8. **API 엔드포인트** (`/api/chat`) — Claude AI 대화 처리
9. **API 엔드포인트** (`/api/reservations`) — 예약 CRUD
10. **API 엔드포인트** (`/api/academies`) — 학원 정보 CRUD

## DB 스키마 (초안)
### academies (학원)
- id, name, address, phone, owner_id, kakao_channel_id, created_at

### subjects (과목/반)
- id, academy_id, name, target_grade, schedule, monthly_fee, material_fee, capacity, enrolled_count

### trial_slots (체험 수업 가능 일정)
- id, subject_id, date, time_start, time_end, is_available

### reservations (체험 예약)
- id, trial_slot_id, parent_name, parent_phone, child_grade, status, created_at

### conversations (상담 기록)
- id, academy_id, kakao_user_id, messages (jsonb), reservation_id, status, created_at

### users (원장님 계정)
- id, email, name, phone, academy_id, role

## 수익 모델
| 플랜 | 가격 | 내용 |
|------|------|------|
| 무료 체험 | 0원 (14일) | 전 기능 |
| 기본 | 19,900원/월 | AI 200건, 예약, 알림 |
| 프로 | 39,900원/월 | 무제한, 대시보드, 리포트 |

## 브랜드 톤
- 부드러우면서 전문적
- 컬러: 교육 친화적 (블루 계열 + 따뜻한 액센트)
- 학부모에게는 따뜻하게, 원장님에게는 신뢰감 있게

## AI 챗봇 동작 규칙
1. 학원 DB의 정보만으로 답변 (hallucination 방지)
2. 모르는 질문은 "원장님께 전달하겠습니다"로 처리
3. 자연스러운 한국어, 존댓말 사용
4. 체험 수업 예약을 자연스럽게 유도
5. 수업료·시간표 등 핵심 정보는 정확하게 전달
