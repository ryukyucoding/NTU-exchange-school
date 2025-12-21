-- 修改 Board 表，使 schoolId 和 country_id 可以為 NULL
-- 這樣國家板可以設置 schoolId = NULL，學校板可以設置 country_id = NULL

-- 如果 schoolId 列存在且有 NOT NULL 約束，移除它
ALTER TABLE "Board" 
  ALTER COLUMN "schoolId" DROP NOT NULL;

-- 如果 country_id 列存在且有 NOT NULL 約束，移除它
ALTER TABLE "Board" 
  ALTER COLUMN "country_id" DROP NOT NULL;

-- 驗證修改（可選，用於檢查）
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'Board' 
--   AND column_name IN ('schoolId', 'country_id');

