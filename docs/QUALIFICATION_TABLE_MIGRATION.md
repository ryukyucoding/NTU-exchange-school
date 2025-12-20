# 資格篩選表遷移指南

## 概述

如果您的數據庫中已經存在 `User` 表，只需要添加新的 `UserQualification` 表來存儲資格篩選信息。這個遷移過程不會影響現有的 `User` 表數據。

## 遷移步驟

### 情況 1：User 表中沒有資格欄位（推薦）

如果您之前沒有在 `User` 表中添加資格欄位，直接執行：

```sql
-- 在 Supabase SQL Editor 中執行
-- 文件：supabase/add-user-qualification-table.sql
```

這個文件會：
- ✅ 創建 `UserQualification` 表
- ✅ 創建索引和觸發器
- ✅ 設置 RLS 策略
- ✅ **不會修改現有的 User 表**

### 情況 2：User 表中已有資格欄位

如果您之前在 `User` 表中添加了資格欄位（如 `college`, `grade`, `gpa` 等），需要：

**步驟 1：創建新表**
```sql
-- 執行文件：supabase/add-user-qualification-table.sql
```

**步驟 2：遷移數據**
```sql
-- 執行文件：supabase/migrate-qualification-to-separate-table.sql
```

這個遷移腳本會：
- ✅ 檢查 `User` 表中是否有資格欄位
- ✅ 將現有的資格數據遷移到 `UserQualification` 表
- ✅ 顯示遷移結果和樣本數據

**步驟 3（可選）：清理 User 表**

遷移完成後，如果確認數據已正確遷移，可以手動刪除 `User` 表中的資格欄位：

```sql
-- 注意：請先確認數據已正確遷移後再執行
ALTER TABLE "User" DROP COLUMN IF EXISTS "college";
ALTER TABLE "User" DROP COLUMN IF EXISTS "grade";
ALTER TABLE "User" DROP COLUMN IF EXISTS "gpa";
ALTER TABLE "User" DROP COLUMN IF EXISTS "toefl";
ALTER TABLE "User" DROP COLUMN IF EXISTS "ielts";
ALTER TABLE "User" DROP COLUMN IF EXISTS "toeic";
```

## 驗證遷移

執行以下查詢來驗證：

```sql
-- 檢查 UserQualification 表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'UserQualification';

-- 檢查表結構
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'UserQualification'
ORDER BY ordinal_position;

-- 檢查數據（如果有遷移）
SELECT 
  u.id,
  u.email,
  uq.college,
  uq.grade,
  uq.gpa,
  uq.toefl,
  uq.ielts,
  uq.toeic
FROM "User" u
LEFT JOIN "UserQualification" uq ON u.id = uq."userId"
WHERE uq.id IS NOT NULL
LIMIT 10;
```

## 安全說明

- ✅ 所有操作都使用 `IF NOT EXISTS` 和 `IF EXISTS` 檢查，不會覆蓋現有數據
- ✅ 外鍵約束確保數據完整性
- ✅ 使用 `ON DELETE CASCADE`，刪除用戶時會自動刪除相關資格記錄
- ✅ RLS 策略已啟用（目前設置為允許所有人，之後可以改為更嚴格的權限）

## 回滾（如果需要）

如果遷移後發現問題，可以刪除 `UserQualification` 表：

```sql
-- 注意：這會刪除所有資格數據
DROP TABLE IF EXISTS "UserQualification" CASCADE;
```

## 常見問題

**Q: 執行 add-user-qualification-table.sql 會影響現有的 User 表嗎？**  
A: 不會。這個文件只創建新表，不會修改 User 表。

**Q: 如果 User 表中沒有資格欄位，還需要執行遷移腳本嗎？**  
A: 不需要。只需要執行 `add-user-qualification-table.sql` 即可。

**Q: 遷移後，舊的資格欄位數據會保留嗎？**  
A: 是的。遷移腳本只會複製數據，不會刪除 User 表中的欄位。您可以手動刪除（見步驟 3）。

**Q: 如果執行過程中出錯怎麼辦？**  
A: 所有操作都使用了安全檢查，即使出錯也不會影響現有數據。可以查看錯誤信息並重新執行。
