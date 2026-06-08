-- Add custom AI prompt column to academies table
ALTER TABLE academies ADD COLUMN IF NOT EXISTS ai_custom_prompt text;

COMMENT ON COLUMN academies.ai_custom_prompt IS '학원별 AI 응답 커스터마이징 지시사항';
