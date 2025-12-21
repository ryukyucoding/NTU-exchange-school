-- ============================================
-- 直接轉換版本：轉換相關表的 schoolId 欄位類型
-- 如果欄位已經是 INT8，會自動跳過
-- ============================================

BEGIN;

-- 步驟 1: 檢查欄位類型
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('PostSchool', 'Board', 'SchoolRating')
AND column_name = 'schoolId';

-- 步驟 2: 轉換 PostSchool.schoolId（只在是 TEXT 時轉換）
DO $$
BEGIN
  -- 檢查欄位類型
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'PostSchool' 
    AND column_name = 'schoolId'
    AND data_type = 'text'
  ) THEN
    -- 新增臨時欄位
    ALTER TABLE "PostSchool" ADD COLUMN schoolId_new INT8;
    
    -- 轉換資料（直接轉換，不檢查正則）
    UPDATE "PostSchool" SET schoolId_new = ("schoolId"::TEXT)::INT8;
    
    -- 刪除舊欄位
    ALTER TABLE "PostSchool" DROP COLUMN "schoolId";
    
    -- 改名
    ALTER TABLE "PostSchool" RENAME COLUMN schoolId_new TO "schoolId";
    
    -- 設定為 NOT NULL
    ALTER TABLE "PostSchool" ALTER COLUMN "schoolId" SET NOT NULL;
    
    RAISE NOTICE '已轉換 PostSchool.schoolId 為 INT8';
  ELSE
    RAISE NOTICE 'PostSchool.schoolId 已經是 INT8 或不存在，跳過';
  END IF;
END $$;

-- 步驟 3: 轉換 Board.schoolId
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
    UPDATE "Board" SET schoolId_new = ("schoolId"::TEXT)::INT8;
    ALTER TABLE "Board" DROP COLUMN "schoolId";
    ALTER TABLE "Board" RENAME COLUMN schoolId_new TO "schoolId";
    ALTER TABLE "Board" ALTER COLUMN "schoolId" SET NOT NULL;
    RAISE NOTICE '已轉換 Board.schoolId 為 INT8';
  ELSE
    RAISE NOTICE 'Board.schoolId 已經是 INT8 或不存在，跳過';
  END IF;
END $$;

-- 步驟 4: 轉換 SchoolRating.schoolId
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
    UPDATE "SchoolRating" SET schoolId_new = ("schoolId"::TEXT)::INT8;
    ALTER TABLE "SchoolRating" DROP COLUMN "schoolId";
    ALTER TABLE "SchoolRating" RENAME COLUMN schoolId_new TO "schoolId";
    ALTER TABLE "SchoolRating" ALTER COLUMN "schoolId" SET NOT NULL;
    RAISE NOTICE '已轉換 SchoolRating.schoolId 為 INT8';
  ELSE
    RAISE NOTICE 'SchoolRating.schoolId 已經是 INT8 或不存在，跳過';
  END IF;
END $$;

COMMIT;

-- 步驟 5: 重新建立外鍵約束（如果不存在）
DO $$
BEGIN
  -- PostSchool
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'PostSchool_schoolId_fkey'
  ) THEN
    ALTER TABLE "PostSchool" 
      ADD CONSTRAINT "PostSchool_schoolId_fkey" 
      FOREIGN KEY ("schoolId") 
      REFERENCES schools(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    RAISE NOTICE '已建立 PostSchool_schoolId_fkey';
  ELSE
    RAISE NOTICE 'PostSchool_schoolId_fkey 已存在，跳過';
  END IF;

  -- Board
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'Board_schoolId_fkey'
  ) THEN
    ALTER TABLE "Board" 
      ADD CONSTRAINT "Board_schoolId_fkey" 
      FOREIGN KEY ("schoolId") 
      REFERENCES schools(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    RAISE NOTICE '已建立 Board_schoolId_fkey';
  ELSE
    RAISE NOTICE 'Board_schoolId_fkey 已存在，跳過';
  END IF;

  -- SchoolRating
  IF NOT EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'SchoolRating_schoolId_fkey'
  ) THEN
    ALTER TABLE "SchoolRating" 
      ADD CONSTRAINT "SchoolRating_schoolId_fkey" 
      FOREIGN KEY ("schoolId") 
      REFERENCES schools(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
    RAISE NOTICE '已建立 SchoolRating_schoolId_fkey';
  ELSE
    RAISE NOTICE 'SchoolRating_schoolId_fkey 已存在，跳過';
  END IF;
END $$;

-- 驗證所有欄位類型
SELECT 
  table_name,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND (
  (table_name = 'schools' AND column_name = 'id')
  OR (table_name = 'PostSchool' AND column_name = 'schoolId')
  OR (table_name = 'Board' AND column_name = 'schoolId')
  OR (table_name = 'SchoolRating' AND column_name = 'schoolId')
)
ORDER BY table_name, column_name;

