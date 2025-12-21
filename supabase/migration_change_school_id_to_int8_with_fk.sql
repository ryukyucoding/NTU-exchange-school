-- ============================================
-- 遷移腳本：將 schools.id 從 TEXT 改為 INT8
-- 包含處理外鍵約束（PostSchool, Board, SchoolRating）
-- ============================================

BEGIN;

-- 步驟 1: 檢查 id 欄位是否都是數字格式
-- 如果 id 中有非數字值，這個遷移會失敗
SELECT id, name_zh 
FROM schools 
WHERE id !~ '^[0-9]+$';
-- 如果有結果，需要先處理這些資料

-- 步驟 2: 檢查相關表的 schoolId 欄位類型
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('PostSchool', 'Board', 'SchoolRating')
AND column_name LIKE '%schoolId%';

-- 步驟 3: 刪除外鍵約束（必須先刪除）
ALTER TABLE "PostSchool" DROP CONSTRAINT IF EXISTS "PostSchool_schoolId_fkey";
ALTER TABLE "Board" DROP CONSTRAINT IF EXISTS "Board_schoolId_fkey";
ALTER TABLE "SchoolRating" DROP CONSTRAINT IF EXISTS "SchoolRating_schoolId_fkey";

-- 步驟 4: 刪除主鍵約束
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_pkey;

-- 步驟 5: 修改 schools.id 欄位類型
-- 方法：新增臨時欄位，轉換資料，刪除舊欄位，改名

-- 5.1 新增臨時欄位
ALTER TABLE schools ADD COLUMN id_new INT8;

-- 5.2 轉換資料
UPDATE schools SET id_new = id::INT8 WHERE id ~ '^[0-9]+$';

-- 5.3 檢查轉換結果
-- SELECT COUNT(*) as total, COUNT(id_new) as converted FROM schools;
-- 如果 converted < total，表示有資料轉換失敗

-- 5.4 刪除舊欄位
ALTER TABLE schools DROP COLUMN id;

-- 5.5 改名
ALTER TABLE schools RENAME COLUMN id_new TO id;

-- 5.6 設定為 NOT NULL
ALTER TABLE schools ALTER COLUMN id SET NOT NULL;

-- 步驟 6: 重新建立主鍵約束
ALTER TABLE schools ADD PRIMARY KEY (id);

-- 步驟 7: 處理相關表的 schoolId 欄位類型（如果需要）
-- 如果 PostSchool, Board, SchoolRating 的 schoolId 還是 TEXT，需要先轉換

-- 7.1 PostSchool
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
  END IF;
END $$;

-- 7.2 Board
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
  END IF;
END $$;

-- 7.3 SchoolRating
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
  END IF;
END $$;

-- 步驟 8: 重新建立外鍵約束
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
  'schools' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'schools'
AND column_name = 'id'

UNION ALL

SELECT 
  'PostSchool' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'PostSchool'
AND column_name = 'schoolId'

UNION ALL

SELECT 
  'Board' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'Board'
AND column_name = 'schoolId'

UNION ALL

SELECT 
  'SchoolRating' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'SchoolRating'
AND column_name = 'schoolId';

