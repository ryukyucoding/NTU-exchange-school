# 遷移說明：建立 Country 表並更新 Board 表

## 📋 變更內容

1. **新建 Country 表**
   - `id` (TEXT, PRIMARY KEY) - 國家 ID
   - `country_zh` (TEXT) - 國家中文名稱
   - `country_en` (TEXT) - 國家英文名稱
   - `continent` (TEXT) - 洲別
   - `created_at` (TIMESTAMP) - 建立時間
   - `updated_at` (TIMESTAMP) - 更新時間

2. **更新 Board 表**
   - 將 `regionId` 欄位改名為 `countryId`

## 🚀 執行步驟

### 方法 1：使用完整遷移腳本（推薦）

1. 登入 Supabase Dashboard
2. 進入 **SQL Editor**
3. 複製 `migration_add_country_table.sql` 的內容
4. 貼上並執行

這個腳本會自動：
- 建立 Country 表
- 檢查 Board 表是否存在
- 自動將 `regionId` 改名為 `countryId`（支援多種命名格式）
- 更新相關索引

### 方法 2：使用簡化版腳本

如果完整版腳本執行失敗，可以使用 `migration_add_country_table_simple.sql`：

1. 執行 Country 表的建立部分（已包含在腳本中）
2. 根據你的實際欄位名稱，手動執行對應的 ALTER TABLE 命令：
   ```sql
   -- 如果欄位名稱是 regionId（駝峰命名）
   ALTER TABLE board RENAME COLUMN "regionId" TO "countryId";
   
   -- 如果欄位名稱是 region_id（蛇形命名）
   ALTER TABLE board RENAME COLUMN region_id TO country_id;
   ALTER TABLE board RENAME COLUMN country_id TO "countryId";
   
   -- 如果欄位名稱是 regionid（全小寫）
   ALTER TABLE board RENAME COLUMN regionid TO countryid;
   ```

### 方法 3：手動執行

如果以上方法都不行，可以手動執行：

```sql
-- 1. 建立 Country 表
CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,
  country_zh TEXT NOT NULL,
  country_en TEXT NOT NULL,
  continent TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_countries_country_zh ON countries(country_zh);
CREATE INDEX IF NOT EXISTS idx_countries_country_en ON countries(country_en);
CREATE INDEX IF NOT EXISTS idx_countries_continent ON countries(continent);

-- 3. 啟用 RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- 4. 建立 RLS 政策
CREATE POLICY "Enable read access for all users" ON countries
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON countries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON countries
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. 建立觸發器（使用現有的 update_updated_at_column 函數）
CREATE TRIGGER update_countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. 更新 Board 表（根據實際欄位名稱選擇）
ALTER TABLE board RENAME COLUMN regionId TO countryId;
-- 或
ALTER TABLE board RENAME COLUMN region_id TO country_id;
-- 或
ALTER TABLE board RENAME COLUMN regionid TO countryid;

-- 7. 更新索引
DROP INDEX IF EXISTS idx_board_regionid;
DROP INDEX IF EXISTS idx_board_region_id;
CREATE INDEX IF NOT EXISTS idx_board_countryid ON board("countryId");
```

## ✅ 驗證

執行以下查詢來驗證遷移是否成功：

```sql
-- 檢查 Country 表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'countries';

-- 檢查 Country 表的結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'countries'
ORDER BY ordinal_position;

-- 檢查 Board 表的 countryId 欄位
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'board'
AND column_name LIKE '%country%';
```

## 📝 注意事項

1. **外鍵約束**：遷移腳本中包含了建立外鍵約束的選項（已註解），如果需要建立 `Board.countryId` 到 `Countries.id` 的外鍵關係，請：
   - 確保 Board 表中所有 `countryId` 的值都在 Countries 表中存在
   - 取消註解遷移腳本中的外鍵約束部分

2. **資料遷移**：如果 Board 表中已有資料，請確保：
   - `regionId` 的值可以對應到 Countries 表的 `id`
   - 或者先建立 Countries 表並填入資料，再執行欄位改名

3. **TypeScript 類型**：執行遷移後，TypeScript 類型定義已更新，包含 `countries` 表。如果使用 Supabase CLI 生成類型，請重新執行：
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
   ```

## 🔗 相關檔案

- `supabase/migration_add_country_table.sql` - 完整遷移腳本
- `supabase/migration_add_country_table_simple.sql` - 簡化版遷移腳本
- `supabase/schema.sql` - 已更新，包含 Country 表定義
- `src/types/supabase.ts` - 已更新，包含 countries 表類型定義

