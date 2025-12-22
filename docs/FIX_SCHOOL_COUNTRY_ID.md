# 修復學校 country_id 問題

## 問題描述

在國家看板頁面中，無法顯示對應的學校列表。這是因為 `schools` 表中缺少 `country_id` 欄位，或者該欄位的值為空。

## 解決方案

### 步驟 1: 執行 SQL Migration

1. 登入 Supabase Dashboard
2. 進入 **SQL Editor**
3. 執行以下 SQL 文件內容：
   ```
   supabase/add-country-id-to-schools.sql
   ```

   或者直接複製該文件的內容並執行。

### 步驟 2: 更新數據

執行 SQL migration 後，運行以下腳本來更新現有學校的 `country_id`：

```bash
npx tsx scripts/add-country-id-to-schools.ts
```

這個腳本會：
- 檢查 `country_id` 欄位是否存在
- 根據學校的 `country` 或 `country_en` 匹配 `Country` 表
- 更新所有學校的 `country_id`

## 驗證

執行完成後，可以通過以下方式驗證：

1. 在 Supabase Dashboard 中查詢：
   ```sql
   SELECT id, name_zh, country, country_id 
   FROM schools 
   WHERE country_id IS NOT NULL 
   LIMIT 10;
   ```

2. 訪問國家看板頁面，應該能看到對應的學校列表。

## 注意事項

- 如果某些學校無法匹配到國家，腳本會顯示警告訊息
- 這些學校的 `country_id` 將保持為 `NULL`
- 可能需要手動檢查這些學校的國家名稱是否正確

