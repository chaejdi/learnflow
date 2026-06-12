-- 선생님(staff) 초대 — 한 학원에 여러 멤버(원장+선생님)를 둘 수 있게 한다.
-- 흐름: 원장이 이메일로 선생님을 초대(pending) → 그 이메일로 가입/로그인하면
--       getMembership 이 자동수락하여 users.academy_id + role='staff' 로 연결한다.
-- users 테이블(academy_id, role in owner/staff/admin)은 001 에 이미 존재 — 별도 변경 불필요.

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('staff', 'owner')),
  invited_by uuid references users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz default now(),
  accepted_at timestamptz
);

-- 같은 학원에 같은 이메일의 '대기중' 초대는 하나만 (대소문자 무시)
create unique index if not exists uq_invitations_pending
  on invitations(academy_id, lower(email))
  where status = 'pending';

-- 로그인 시 이메일로 대기중 초대를 빠르게 찾기 위함
create index if not exists idx_invitations_email_pending
  on invitations(lower(email))
  where status = 'pending';

-- RLS (다른 테이블과 동일 패턴 — service role 은 우회). 조회/관리는 학원 원장만.
alter table invitations enable row level security;

drop policy if exists "Academy owner can view invitations" on invitations;
create policy "Academy owner can view invitations"
  on invitations for select
  using (academy_id in (select id from academies where owner_id = auth.uid()));

drop policy if exists "Academy owner can manage invitations" on invitations;
create policy "Academy owner can manage invitations"
  on invitations for all
  using (academy_id in (select id from academies where owner_id = auth.uid()));

comment on table invitations is '선생님(staff) 초대 목록. 초대된 이메일로 가입하면 자동으로 학원 멤버가 된다.';
