-- LearnFlow DB 개선 마이그레이션

-- 1. updated_at 자동 업데이트 트리거
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_academies_updated_at before update on academies
  for each row execute function update_updated_at_column();

create trigger set_subjects_updated_at before update on subjects
  for each row execute function update_updated_at_column();

create trigger set_reservations_updated_at before update on reservations
  for each row execute function update_updated_at_column();

create trigger set_conversations_updated_at before update on conversations
  for each row execute function update_updated_at_column();

-- 2. users 테이블에 updated_at 추가
alter table users add column if not exists updated_at timestamptz default now();

create trigger set_users_updated_at before update on users
  for each row execute function update_updated_at_column();

-- 3. 추가 인덱스
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_academy on users(academy_id);
create index if not exists idx_trial_slots_available on trial_slots(subject_id, date) where is_available = true;
create index if not exists idx_reservations_created on reservations(academy_id, created_at desc);
create index if not exists idx_conversations_needs_reply on conversations(academy_id) where needs_owner_reply = true;

-- 4. 체험수업 슬롯 중복 방지
alter table trial_slots
  add constraint uq_trial_slot unique (subject_id, date, time_start);

-- 5. 시간 유효성 제약
alter table trial_slots
  add constraint chk_time_order check (time_end > time_start);

-- 6. 수업료 양수 제약
alter table subjects
  add constraint chk_monthly_fee_positive check (monthly_fee >= 0);

alter table subjects
  add constraint chk_material_fee_positive check (material_fee >= 0);

alter table subjects
  add constraint chk_capacity_positive check (capacity >= 1);
