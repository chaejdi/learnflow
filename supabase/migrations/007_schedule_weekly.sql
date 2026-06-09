-- 정규 시간표를 "주 단위 occurrence"로 관리
-- 한 수업을 기간 전체에 깔되, 주마다 개별 수정/삭제가 가능하도록 한다.
--   week_start : 이 수업이 속한 주(월요일 날짜)
--   series_id  : 같은 반복 수업을 묶는 키 ("이후 모든 주 변경"용)
--   color      : 수업별 색상 (팔레트 키)

alter table schedules add column if not exists week_start date;
alter table schedules add column if not exists series_id uuid;
alter table schedules add column if not exists color text;

create index if not exists idx_schedules_week on schedules(academy_id, week_start);
create index if not exists idx_schedules_series on schedules(series_id);

comment on column schedules.week_start is '이 수업이 속한 주의 월요일 날짜 (주 단위 occurrence)';
comment on column schedules.series_id is '같은 반복 수업을 묶는 키 (이후 모든 주 일괄 변경용)';
comment on column schedules.color is '수업 색상 팔레트 키 (blue/emerald/amber 등)';
