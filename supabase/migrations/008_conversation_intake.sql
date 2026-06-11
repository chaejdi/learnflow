-- 상담 인테이크(사전 양식) + 원장 이름 수정용 컬럼
-- 학부모가 상담 전 양식을 작성하면 conversations 에 저장한다.
-- 표시 규칙: parent_name 과 child_name 이 모두 있으면 "성함(자녀이름)" 으로 표시,
--           하나라도 없으면 기존처럼 "학부모 XXXX"(kakao_user_id 끝 4자리).
-- 원장은 상담내역에서 parent_name / child_name 을 직접 수정할 수 있다.

alter table conversations add column if not exists parent_name text;
alter table conversations add column if not exists child_name text;
alter table conversations add column if not exists relationship text;
alter table conversations add column if not exists child_age text;
alter table conversations add column if not exists inquiry_topic text;

comment on column conversations.parent_name is '연락주신 분 성함 (사전 양식)';
comment on column conversations.child_name is '자녀 이름 (사전 양식)';
comment on column conversations.relationship is '자녀와의 관계 (예: 엄마/아빠)';
comment on column conversations.child_age is '자녀 나이/학년 (자유 입력)';
comment on column conversations.inquiry_topic is '상담 받을 내용 (사전 양식)';
