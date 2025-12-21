-- ============================================
-- 簡化版：轉換 schools.id 從 TEXT 到 INT8
-- ============================================

-- 步驟 1: 刪除外鍵約束
ALTER TABLE "PostSchool" DROP CONSTRAINT IF EXISTS "PostSchool_schoolId_fkey";
ALTER TABLE "Board" DROP CONSTRAINT IF EXISTS "Board_schoolId_fkey";
ALTER TABLE "SchoolRating" DROP CONSTRAINT IF EXISTS "SchoolRating_schoolId_fkey";

-- 步驟 2: 刪除主鍵約束
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_pkey;

-- 步驟 3: 轉換 schools.id
ALTER TABLE schools ADD COLUMN id_new INT8;
UPDATE schools SET id_new = id::INT8 WHERE id ~ '^[0-9]+$';
ALTER TABLE schools DROP COLUMN id;
ALTER TABLE schools RENAME COLUMN id_new TO id;
ALTER TABLE schools ALTER COLUMN id SET NOT NULL;
ALTER TABLE schools ADD PRIMARY KEY (id);

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

-- 驗證
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'schools'
AND column_name = 'id';
-- 應該顯示：id | bigint

