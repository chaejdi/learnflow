-- 멀티테넌트 카카오 라우팅 (B안)
-- 들어온 카카오 봇 ID(payload.bot.id)를 academies.kakao_channel_id 와 매칭해
-- 어느 학원으로 온 상담인지 식별한다.

-- 1. 한 봇 ID는 한 학원에만 연결될 수 있도록 보장 (null 은 제외 — 아직 미연결 학원 허용)
create unique index if not exists uq_academies_kakao_channel
  on academies(kakao_channel_id)
  where kakao_channel_id is not null;

-- 2. 봇 ID 로 학원을 조회하는 웹훅 경로 최적화
create index if not exists idx_academies_kakao_channel
  on academies(kakao_channel_id);
