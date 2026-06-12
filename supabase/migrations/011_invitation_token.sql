-- 초대 링크 방식 — 초대마다 비밀 토큰을 부여해 /invite/<token> 로 가입받는다.
-- 메일(SMTP) 없이도 원장이 링크를 카톡 등으로 전달하면 선생님이 비밀번호를 정해 바로 가입된다.

alter table invitations add column if not exists token text;

-- 기존 대기중 초대에도 토큰 backfill
update invitations
  set token = replace(gen_random_uuid()::text, '-', '')
  where token is null;

-- 새 초대는 토큰 자동 생성
alter table invitations
  alter column token set default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists uq_invitations_token on invitations(token);

comment on column invitations.token is '초대 링크용 비밀 토큰. /invite/<token> 에서 가입 시 사용.';
