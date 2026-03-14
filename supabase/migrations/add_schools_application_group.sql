-- 若 /api/schools 曾報錯：column schools.application_group does not exist
-- 在 Supabase SQL Editor 執行本檔一次即可與 schema.sql 對齊。
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS application_group text;

COMMENT ON COLUMN public.schools.application_group IS '申請組別（篩選、地圖標記用）';
