-- ============================================
-- 簡化版修復腳本：轉換相關表的 schoolId 欄位類型
-- 如果上面的腳本執行失敗，使用這個版本
-- ============================================

-- 先檢查這些表的 schoolId 欄位類型
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('PostSchool', 'Board', 'SchoolRating')
AND column_name = 'schoolId';

-- 如果顯示 data_type = 'text'，執行以下轉換：

-- ============================================
-- 轉換 PostSchool.schoolId
-- ============================================
ALTER TABLE "PostSchool" ADD COLUMN schoolId_new INT8;
UPDATE "PostSchool" SET schoolId_new = CAST("schoolId" AS TEXT)::INT8 
WHERE CAST("schoolId" AS TEXT) ~ '^[0-9]+$';
ALTER TABLE "PostSchool" DROP COLUMN "schoolId";
ALTER TABLE "PostSchool" RENAME COLUMN schoolId_new TO "schoolId";
ALTER TABLE "PostSchool" ALTER COLUMN "schoolId" SET NOT NULL;

-- ============================================
-- 轉換 Board.schoolId
-- ============================================
ALTER TABLE "Board" ADD COLUMN schoolId_new INT8;
UPDATE "Board" SET schoolId_new = CAST("schoolId" AS TEXT)::INT8 
WHERE CAST("schoolId" AS TEXT) ~ '^[0-9]+$';
ALTER TABLE "Board" DROP COLUMN "schoolId";
ALTER TABLE "Board" RENAME COLUMN schoolId_new TO "schoolId";
ALTER TABLE "Board" ALTER COLUMN "schoolId" SET NOT NULL;

-- ============================================
-- 轉換 SchoolRating.schoolId
-- ============================================
ALTER TABLE "SchoolRating" ADD COLUMN schoolId_new INT8;
UPDATE "SchoolRating" SET schoolId_new = CAST("schoolId" AS TEXT)::INT8 
WHERE CAST("schoolId" AS TEXT) ~ '^[0-9]+$';
ALTER TABLE "SchoolRating" DROP COLUMN "schoolId";
ALTER TABLE "SchoolRating" RENAME COLUMN schoolId_new TO "schoolId";
ALTER TABLE "SchoolRating" ALTER COLUMN "schoolId" SET NOT NULL;

-- ============================================
-- 重新建立外鍵約束
-- ============================================
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

-- 驗證
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

