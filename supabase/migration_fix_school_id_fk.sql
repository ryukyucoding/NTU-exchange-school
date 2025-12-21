-- ============================================
-- 修復腳本：轉換相關表的 schoolId 欄位類型
-- 在執行主遷移後，如果外鍵約束失敗，執行此腳本
-- ============================================

BEGIN;

-- 步驟 1: 轉換 PostSchool.schoolId 從 TEXT 到 INT8
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'PostSchool' 
    AND column_name = 'schoolId'
    AND data_type = 'text'
  ) THEN
    -- 新增臨時欄位
    ALTER TABLE "PostSchool" ADD COLUMN schoolId_new INT8;
    
    -- 轉換資料（將 TEXT 轉為 INT8）
    UPDATE "PostSchool" SET schoolId_new = ("schoolId"::TEXT)::INT8 
    WHERE "schoolId"::TEXT ~ '^[0-9]+$';
    
    -- 檢查轉換結果
    -- SELECT COUNT(*) as total, COUNT(schoolId_new) as converted FROM "PostSchool";
    
    -- 刪除舊欄位
    ALTER TABLE "PostSchool" DROP COLUMN "schoolId";
    
    -- 改名
    ALTER TABLE "PostSchool" RENAME COLUMN schoolId_new TO "schoolId";
    
    -- 設定為 NOT NULL（如果需要）
    ALTER TABLE "PostSchool" ALTER COLUMN "schoolId" SET NOT NULL;
    
    RAISE NOTICE '已轉換 PostSchool.schoolId 為 INT8';
  ELSE
    RAISE NOTICE 'PostSchool.schoolId 已經是 INT8 或不存在';
  END IF;
END $$;

-- 步驟 2: 轉換 Board.schoolId 從 TEXT 到 INT8
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
    UPDATE "Board" SET schoolId_new = ("schoolId"::TEXT)::INT8 
    WHERE ("schoolId"::TEXT) ~ '^[0-9]+$';
    ALTER TABLE "Board" DROP COLUMN "schoolId";
    ALTER TABLE "Board" RENAME COLUMN schoolId_new TO "schoolId";
    ALTER TABLE "Board" ALTER COLUMN "schoolId" SET NOT NULL;
    RAISE NOTICE '已轉換 Board.schoolId 為 INT8';
  ELSE
    RAISE NOTICE 'Board.schoolId 已經是 INT8 或不存在';
  END IF;
END $$;

-- 步驟 3: 轉換 SchoolRating.schoolId 從 TEXT 到 INT8
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
    UPDATE "SchoolRating" SET schoolId_new = ("schoolId"::TEXT)::INT8 
    WHERE ("schoolId"::TEXT) ~ '^[0-9]+$';
    ALTER TABLE "SchoolRating" DROP COLUMN "schoolId";
    ALTER TABLE "SchoolRating" RENAME COLUMN schoolId_new TO "schoolId";
    ALTER TABLE "SchoolRating" ALTER COLUMN "schoolId" SET NOT NULL;
    RAISE NOTICE '已轉換 SchoolRating.schoolId 為 INT8';
  ELSE
    RAISE NOTICE 'SchoolRating.schoolId 已經是 INT8 或不存在';
  END IF;
END $$;

COMMIT;

-- 步驟 4: 重新建立外鍵約束
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

