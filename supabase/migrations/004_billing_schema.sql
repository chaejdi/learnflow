-- 결제/구독 시스템 스키마

-- 1. 플랜 정의
create table plans (
  id text primary key,
  name text not null,
  price integer not null default 0,
  ai_chat_limit integer, -- null = 무제한
  features jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- 기본 플랜 데이터
insert into plans (id, name, price, ai_chat_limit, features) values
  ('trial', '무료 체험', 0, 100, '["AI 상담 월 100건", "체험수업 예약", "기본 대시보드", "카카오톡 채널 1개"]'),
  ('basic', '기본', 19900, 200, '["AI 상담 200건/월", "체험수업 예약", "전환율 분석 대시보드", "카카오 알림톡", "원장님 직접 답변", "이메일 지원"]'),
  ('pro', '프로', 39900, null, '["AI 상담 무제한", "다중 지점 관리", "AI 응답 커스터마이징", "우선 지원", "전담 매니저"]');

-- 2. 구독 (학원별 1개)
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  academy_id uuid not null references academies(id) on delete cascade,
  plan_id text not null references plans(id),
  status text not null default 'trialing',
  -- status: trialing, active, past_due, cancelled, expired
  trial_starts_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  billing_key text, -- 토스페이먼츠 빌링키
  customer_key text, -- 토스 고객 식별키
  card_last4 text,
  card_company text,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index uq_subscriptions_academy on subscriptions(academy_id);

-- 3. 결제 내역
create table payments (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references subscriptions(id),
  academy_id uuid not null references academies(id),
  amount integer not null,
  status text not null default 'pending',
  -- status: pending, paid, failed, refunded
  payment_key text, -- 토스 결제키
  order_id text not null,
  paid_at timestamptz,
  failed_reason text,
  created_at timestamptz default now()
);

create index idx_payments_academy on payments(academy_id);
create index idx_payments_subscription on payments(subscription_id);

-- 4. AI 상담 사용량 (월별)
create table usage_logs (
  id uuid primary key default uuid_generate_v4(),
  academy_id uuid not null references academies(id),
  year_month text not null, -- '2026-06'
  ai_chat_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index uq_usage_academy_month on usage_logs(academy_id, year_month);
