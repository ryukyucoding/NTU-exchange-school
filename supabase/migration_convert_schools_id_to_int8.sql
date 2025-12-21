-- ============================================
-- 轉換 schools.id 從 TEXT 到 INT8
-- 相關表的 schoolId 已經是 bigint，只需要轉換 schools.id
-- ============================================

BEGIN;

-- 步驟 1: 檢查 schools.id 的類型
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'schools'
AND column_name = 'id';

-- 步驟 2: 刪除外鍵約束（必須先刪除）
ALTER TABLE "PostSchool" DROP CONSTRAINT IF EXISTS "PostSchool_schoolId_fkey";
ALTER TABLE "Board" DROP CONSTRAINT IF EXISTS "Board_schoolId_fkey";
ALTER TABLE "SchoolRating" DROP CONSTRAINT IF EXISTS "SchoolRating_schoolId_fkey";

-- 步驟 3: 刪除主鍵約束
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_pkey;

-- 步驟 4: 轉換 schools.id 從 TEXT 到 INT8
-- 4.1 新增臨時欄位
ALTER TABLE schools ADD COLUMN id_new INT8;

-- 4.2 轉換資料
UPDATE schools SET id_new = id::INT8 WHERE id ~ '^[0-9]+$';

-- 4.3 檢查轉換結果
-- SELECT COUNT(*) as total, COUNT(id_new) as converted FROM schools;
-- 如果 converted < total，表示有資料轉換失敗

-- 4.4 刪除舊欄位
ALTER TABLE schools DROP COLUMN id;

-- 4.5 改名
ALTER TABLE schools RENAME COLUMN id_new TO id;

-- 4.6 設定為 NOT NULL
ALTER TABLE schools ALTER COLUMN id SET NOT NULL;

-- 步驟 5: 重新建立主鍵約束
ALTER TABLE schools ADD PRIMARY KEY (id);

-- 步驟 6: 重新建立外鍵約束
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

