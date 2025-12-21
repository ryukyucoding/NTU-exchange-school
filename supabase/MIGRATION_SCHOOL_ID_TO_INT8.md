# 遷移說明：將 schools.id 從 TEXT 改為 INT8

## 📋 變更內容

將 `schools` 表的 `id` 欄位從 `TEXT` 改為 `INT8` (BIGINT)。

## ⚠️ 注意事項

1. **備份資料**：執行遷移前務必備份資料
2. **檢查外鍵**：如果有其他表引用 `schools.id`，需要先處理外鍵約束
3. **資料格式**：確保所有 `id` 都是數字格式

## 🚀 執行步驟

### 方法 1：使用完整遷移腳本（推薦）

1. 在 Supabase Dashboard → SQL Editor 中執行 `migration_change_school_id_to_int8.sql`

### 方法 2：使用簡化版腳本

如果完整版執行失敗，使用 `migration_change_school_id_to_int8_simple.sql`，分步驟執行。

### 方法 3：手動執行（最安全）

#### 步驟 1: 檢查資料格式

```sql
-- 檢查是否有非數字的 id
SELECT id, name_zh 
FROM schools 
WHERE id !~ '^[0-9]+$';
```

如果沒有結果，表示所有 id 都是數字，可以繼續。

#### 步驟 2: 備份資料

```sql
CREATE TABLE schools_backup AS SELECT * FROM schools;
```

#### 步驟 3: 檢查外鍵約束

```sql
-- 檢查是否有其他表引用 schools.id
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS referencing_table,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f' 
AND confrelid = 'schools'::regclass;
```

如果有外鍵約束，需要先刪除（記住約束名稱，之後要重新建立）。

#### 步驟 4: 刪除主鍵約束

```sql
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_pkey;
```

#### 步驟 5: 新增臨時欄位並轉換資料

```sql
-- 新增臨時欄位
ALTER TABLE schools ADD COLUMN id_new INT8;

-- 轉換資料
UPDATE schools SET id_new = id::INT8 WHERE id ~ '^[0-9]+$';

-- 檢查轉換結果
SELECT COUNT(*) as total, COUNT(id_new) as converted
FROM schools;
```

#### 步驟 6: 刪除舊欄位並改名

```sql
-- 刪除舊欄位
ALTER TABLE schools DROP COLUMN id;

-- 改名
ALTER TABLE schools RENAME COLUMN id_new TO id;

-- 設定為 NOT NULL
ALTER TABLE schools ALTER COLUMN id SET NOT NULL;

-- 重新建立主鍵
ALTER TABLE schools ADD PRIMARY KEY (id);
```

#### 步驟 7: 重新建立外鍵約束（如果有）

```sql
-- 根據步驟 3 的結果，重新建立外鍵約束
-- ALTER TABLE other_table ADD CONSTRAINT fk_other_table_school
--   FOREIGN KEY (school_id) REFERENCES schools(id);
```

#### 步驟 8: 驗證

```sql
-- 檢查欄位類型
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'schools'
AND column_name = 'id';

-- 應該顯示：id | bigint
```

## 📝 更新匯入腳本

匯入腳本 `scripts/import-schools-to-supabase.ts` 已經更新：
- `id` 欄位類型從 `string` 改為 `number`
- CSV 中的 `id` 會自動轉換為數字

執行遷移後，重新匯入資料時會自動使用 INT8 類型的 id。

## ✅ 驗證清單

- [ ] 已備份資料
- [ ] 已檢查外鍵約束
- [ ] 已確認所有 id 都是數字格式
- [ ] 已執行遷移腳本
- [ ] 已驗證欄位類型為 bigint
- [ ] 已重新建立外鍵約束（如果有）
- [ ] 已測試查詢功能正常

## 🔗 相關檔案

- `supabase/migration_change_school_id_to_int8.sql` - 完整遷移腳本
- `supabase/migration_change_school_id_to_int8_simple.sql` - 簡化版遷移腳本
- `scripts/import-schools-to-supabase.ts` - 已更新的匯入腳本

