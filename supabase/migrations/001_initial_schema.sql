-- LearnFlow (런플로우) Initial Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Academies (학원)
create table academies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null,
  phone text not null,
  owner_id uuid not null,
  kakao_channel_id text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Users (원장님/관리자)
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  phone text,
  academy_id uuid references academies(id),
  role text not null default 'owner' check (role in ('owner', 'staff', 'admin')),
  created_at timestamptz default now()
);

-- Add foreign key for academies.owner_id
alter table academies
  add constraint fk_academy_owner foreign key (owner_id) references users(id);

-- Subjects (수업 과목)
create table subjects (
  id uuid primary key default uuid_generate_v4(),
  academy_id uuid not null references academies(id) on delete cascade,
  name text not null,
  target_grade text not null,
  schedule text not null,
  monthly_fee integer not null default 0,
  material_fee integer not null default 0,
  capacity integer not null default 20,
  enrolled_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trial Slots (체험수업 시간대)
create table trial_slots (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references subjects(id) on delete cascade,
  date date not null,
  time_start time not null,
  time_end time not null,
  is_available boolean not null default true,
  created_at timestamptz default now()
);

-- Reservations (예약)
create table reservations (
  id uuid primary key default uuid_generate_v4(),
  trial_slot_id uuid not null references trial_slots(id),
  academy_id uuid not null references academies(id),
  parent_name text not null,
  parent_phone text,
  child_grade text,
  child_name text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversations (상담 대화)
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  academy_id uuid not null references academies(id),
  kakao_user_id text not null,
  messages jsonb not null default '[]'::jsonb,
  reservation_id uuid references reservations(id),
  status text not null default 'active' check (status in ('active', 'resolved', 'escalated')),
  needs_owner_reply boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_conversations_academy on conversations(academy_id);
create index idx_conversations_kakao_user on conversations(kakao_user_id);
create index idx_conversations_status on conversations(status);
create index idx_reservations_academy on reservations(academy_id);
create index idx_reservations_status on reservations(status);
create index idx_subjects_academy on subjects(academy_id);
create index idx_trial_slots_subject on trial_slots(subject_id);
create index idx_trial_slots_date on trial_slots(date);

-- Row Level Security
alter table academies enable row level security;
alter table users enable row level security;
alter table subjects enable row level security;
alter table trial_slots enable row level security;
alter table reservations enable row level security;
alter table conversations enable row level security;

-- RLS Policies: users can only access their own academy's data
create policy "Users can view own academy"
  on academies for select
  using (owner_id = auth.uid());

create policy "Users can update own academy"
  on academies for update
  using (owner_id = auth.uid());

create policy "Users can view own profile"
  on users for select
  using (id = auth.uid());

create policy "Academy members can view subjects"
  on subjects for select
  using (academy_id in (select academy_id from users where id = auth.uid()));

create policy "Academy members can manage subjects"
  on subjects for all
  using (academy_id in (select academy_id from users where id = auth.uid()));

create policy "Academy members can view trial_slots"
  on trial_slots for select
  using (subject_id in (
    select id from subjects where academy_id in (
      select academy_id from users where id = auth.uid()
    )
  ));

create policy "Academy members can view reservations"
  on reservations for select
  using (academy_id in (select academy_id from users where id = auth.uid()));

create policy "Academy members can update reservations"
  on reservations for update
  using (academy_id in (select academy_id from users where id = auth.uid()));

create policy "Academy members can view conversations"
  on conversations for select
  using (academy_id in (select academy_id from users where id = auth.uid()));

create policy "Academy members can update conversations"
  on conversations for update
  using (academy_id in (select academy_id from users where id = auth.uid()));

-- Service role can insert (for webhook API)
create policy "Service can insert reservations"
  on reservations for insert
  with check (true);

create policy "Service can insert conversations"
  on conversations for insert
  with check (true);

create policy "Service can update conversations"
  on conversations for update
  using (true);
