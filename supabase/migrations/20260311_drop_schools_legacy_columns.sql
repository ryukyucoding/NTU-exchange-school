-- 刪除 schools 表中已被 sections JSONB 和新結構化欄位取代的舊文字欄位
-- application_group → 由 language_group 取代
-- gpa_requirement, language_requirement → 由 gpa_min, toefl_ibt, ielts, toeic 等結構化欄位取代
-- academic_calendar, registration_fee, accommodation_info, notes → 由 sections[] 取代
-- semester → 不再使用

ALTER TABLE public.schools
  DROP COLUMN IF EXISTS application_group,
  DROP COLUMN IF EXISTS gpa_requirement,
  DROP COLUMN IF EXISTS language_requirement,
  DROP COLUMN IF EXISTS academic_calendar,
  DROP COLUMN IF EXISTS registration_fee,
  DROP COLUMN IF EXISTS accommodation_info,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS semester;
