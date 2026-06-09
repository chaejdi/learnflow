-- 시간표 기간(학기/방학) 단위 관리
-- 정규 시간표를 "기간"으로 묶어 학기중/방학마다 다른 주간 시간표를 운영할 수 있게 한다.
-- 달력에서 각 주는 그 날짜가 속한 기간의 시간표를 보여준다.

-- 1) 시간표 기간 테이블
create table if not exists schedule_terms (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  name text not null,                 -- 예: '1학기 정규', '여름방학 특강'
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_schedule_terms_academy on schedule_terms(academy_id);
create index if not exists idx_schedule_terms_range on schedule_terms(academy_id, start_date, end_date);

-- 2) 기존 schedules 테이블에 기간 연결 컬럼 추가
--    (schedules 테이블은 과거 수동 생성되어 마이그레이션 기록이 없으므로 IF NOT EXISTS 로 방어)
alter table schedules add column if not exists term_id uuid references schedule_terms(id) on delete cascade;

create index if not exists idx_schedules_term on schedules(term_id);

-- 3) RLS (다른 테이블과 동일 패턴 — service role 은 우회)
alter table schedule_terms enable row level security;

drop policy if exists "Academy members can view schedule_terms" on schedule_terms;
create policy "Academy members can view schedule_terms"
  on schedule_terms for select
  using (academy_id in (select academy_id from users where id = auth.uid()));

drop policy if exists "Academy members can manage schedule_terms" on schedule_terms;
create policy "Academy members can manage schedule_terms"
  on schedule_terms for all
  using (academy_id in (select academy_id from users where id = auth.uid()));

comment on table schedule_terms is '정규 시간표 운영 기간(학기/방학 등). schedules.term_id 가 이 기간을 참조.';
