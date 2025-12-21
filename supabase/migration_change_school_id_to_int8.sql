-- ============================================
-- 遷移腳本：將 schools 表的 id 從 TEXT 改為 INT8
-- ============================================

BEGIN;

-- 步驟 1: 備份現有資料（可選，建議先執行）
-- CREATE TABLE schools_backup AS SELECT * FROM schools;

-- 步驟 2: 檢查 id 欄位是否都是數字格式
-- 如果 id 中有非數字值，這個遷移會失敗
-- 可以先執行以下查詢檢查：
-- SELECT id FROM schools WHERE id !~ '^[0-9]+$';

-- 步驟 3: 刪除外鍵約束（必須先刪除外鍵，才能刪除主鍵）
-- 根據錯誤訊息，有以下表引用 schools.id：
-- - PostSchool.schoolId
-- - Board.schoolId  
-- - SchoolRating.schoolId

ALTER TABLE "PostSchool" DROP CONSTRAINT IF EXISTS "PostSchool_schoolId_fkey";
ALTER TABLE "Board" DROP CONSTRAINT IF EXISTS "Board_schoolId_fkey";
ALTER TABLE "SchoolRating" DROP CONSTRAINT IF EXISTS "SchoolRating_schoolId_fkey";

-- 步驟 4: 刪除主鍵約束（現在可以安全刪除）
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_pkey;

-- 步驟 5: 新增臨時欄位 id_new (INT8)
ALTER TABLE schools ADD COLUMN id_new INT8;

-- 步驟 6: 將 id (TEXT) 轉換為 INT8 並填入 id_new
UPDATE schools SET id_new = id::INT8 WHERE id ~ '^[0-9]+$';

-- 步驟 7: 檢查是否有轉換失敗的資料
-- SELECT id, name_zh FROM schools WHERE id_new IS NULL;
-- 如果有結果，需要手動處理這些資料

-- 步驟 8: 刪除舊的 id 欄位
ALTER TABLE schools DROP COLUMN id;

-- 步驟 9: 將 id_new 改名為 id
ALTER TABLE schools RENAME COLUMN id_new TO id;

-- 步驟 10: 設定 id 為 NOT NULL
ALTER TABLE schools ALTER COLUMN id SET NOT NULL;

-- 步驟 11: 重新建立主鍵約束
ALTER TABLE schools ADD PRIMARY KEY (id);

-- 步驟 12: 轉換相關表的 schoolId 欄位類型（如果還是 TEXT）
-- 這些表的 schoolId 必須是 INT8 才能建立外鍵約束

-- 12.1 轉換 PostSchool.schoolId
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'PostSchool' 
    AND column_name = 'schoolId'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "PostSchool" ADD COLUMN schoolId_new INT8;
    UPDATE "PostSchool" SET schoolId_new = "schoolId"::INT8 WHERE "schoolId" ~ '^[0-9]+$';
    ALTER TABLE "PostSchool" DROP COLUMN "schoolId";
    ALTER TABLE "PostSchool" RENAME COLUMN schoolId_new TO "schoolId";
    ALTER TABLE "PostSchool" ALTER COLUMN "schoolId" SET NOT NULL;
    RAISE NOTICE '已轉換 PostSchool.schoolId 為 INT8';
  END IF;
END $$;

-- 12.2 轉換 Board.schoolId
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Board' 
    AND column_name = 'schoolId'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "Board" ADD COLUMN schoolId_new INT8;
    UPDATE "Board" SET schoolId_new = "schoolId"::INT8 WHERE "schoolId" ~ '^[0-9]+$';
    ALTER TABLE "Board" DROP COLUMN "schoolId";
    ALTER TABLE "Board" RENAME COLUMN schoolId_new TO "schoolId";
    ALTER TABLE "Board" ALTER COLUMN "schoolId" SET NOT NULL;
    RAISE NOTICE '已轉換 Board.schoolId 為 INT8';
  END IF;
END $$;

-- 12.3 轉換 SchoolRating.schoolId
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'SchoolRating' 
    AND column_name = 'schoolId'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "SchoolRating" ADD COLUMN schoolId_new INT8;
    UPDATE "SchoolRating" SET schoolId_new = "schoolId"::INT8 WHERE "schoolId" ~ '^[0-9]+$';
    ALTER TABLE "SchoolRating" DROP COLUMN "schoolId";
    ALTER TABLE "SchoolRating" RENAME COLUMN schoolId_new TO "schoolId";
    ALTER TABLE "SchoolRating" ALTER COLUMN "schoolId" SET NOT NULL;
    RAISE NOTICE '已轉換 SchoolRating.schoolId 為 INT8';
  END IF;
END $$;

-- 步驟 13: 重新建立外鍵約束
ALTER TABLE "PostSchool" 
  ADD CONSTRAINT "PostSchool_schoolId_fkey" 
  FOREIGN KEY ("schoolId") 
  REFERENCES schools(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "Board" 
  ADD CONSTRAINT "Board_schoolId_fkey" 
  FOREIGN KEY ("schoolId") 
  REFERENCES schools(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "SchoolRating" 
  ADD CONSTRAINT "SchoolRating_schoolId_fkey" 
  FOREIGN KEY ("schoolId") 
  REFERENCES schools(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

COMMIT;

-- 驗證更改
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'schools'
AND column_name = 'id';

