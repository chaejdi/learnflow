-- 상담 인테이크에 연락처(전화번호) 추가.
-- 예약 확정 시 연락처로 사용한다(예약 생성 프리필).
alter table conversations add column if not exists phone text;
comment on column conversations.phone is '연락처(전화번호) — 사전 양식 또는 대화에서 확보';
