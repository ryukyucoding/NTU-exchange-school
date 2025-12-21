-- ============================================
-- 簡化版遷移腳本：將 schools 表的 id 從 TEXT 改為 INT8
-- 如果上面的腳本執行失敗，可以使用這個簡化版本
-- ============================================

-- 步驟 1: 檢查 id 是否都是數字（先執行這個檢查）
SELECT id, name_zh 
FROM schools 
WHERE id !~ '^[0-9]+$';
-- 如果有結果，表示有非數字的 id，需要先處理

-- 步驟 2: 刪除主鍵約束
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_pkey;

-- 步驟 3: 新增臨時欄位
ALTER TABLE schools ADD COLUMN id_new INT8;

-- 步驟 4: 轉換資料
UPDATE schools SET id_new = id::INT8 WHERE id ~ '^[0-9]+$';

-- 步驟 5: 檢查轉換結果
SELECT COUNT(*) as total, COUNT(id_new) as converted
FROM schools;
-- 如果 converted < total，表示有資料轉換失敗

-- 步驟 6: 刪除舊欄位並改名
ALTER TABLE schools DROP COLUMN id;
ALTER TABLE schools RENAME COLUMN id_new TO id;

-- 步驟 7: 設定為 NOT NULL 和主鍵
ALTER TABLE schools ALTER COLUMN id SET NOT NULL;
ALTER TABLE schools ADD PRIMARY KEY (id);

-- 步驟 8: 驗證
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'schools'
AND column_name = 'id';

