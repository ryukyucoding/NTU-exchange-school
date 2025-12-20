# 資料庫認證架構設定指南

## 概述

此文件說明如何設定 NextAuth 所需的資料庫表結構，包括 `User` 和 `Account` 表，用於處理 Google OAuth 登入和用戶資料管理。

## 資料表結構

### 1. User 表

儲存用戶基本資訊和設定：

- `id` (TEXT, PRIMARY KEY) - 用戶唯一識別碼（UUID）
- `userID` (TEXT, NULLABLE) - 用戶自訂的用戶名（可選，唯一）
- `name` (TEXT, NULLABLE) - 顯示名稱
- `email` (TEXT, NULLABLE) - 電子郵件地址
- `emailVerified` (TIMESTAMP) - 電子郵件驗證時間
- `image` (TEXT, NULLABLE) - 頭像 URL
- `bio` (TEXT, NULLABLE) - 個人簡介
- `backgroundImage` (TEXT, NULLABLE) - 背景圖片 URL
- `createdAt` (TIMESTAMP) - 建立時間
- `updatedAt` (TIMESTAMP) - 更新時間

### 2. Account 表

儲存 OAuth 提供者的帳號關聯：

- `id` (TEXT, PRIMARY KEY) - 帳號唯一識別碼（UUID）
- `userId` (TEXT, FOREIGN KEY) - 關聯到 User.id
- `type` (TEXT) - 帳號類型（通常是 "oauth"）
- `provider` (TEXT) - OAuth 提供者（如 "google"）
- `providerAccountId` (TEXT) - 提供者的帳號 ID
- `refresh_token` (TEXT, NULLABLE) - 刷新令牌
- `access_token` (TEXT, NULLABLE) - 存取令牌
- `expires_at` (INTEGER, NULLABLE) - 令牌過期時間（Unix timestamp）
- `token_type` (TEXT, NULLABLE) - 令牌類型
- `scope` (TEXT, NULLABLE) - OAuth 範圍
- `id_token` (TEXT, NULLABLE) - ID 令牌
- `session_state` (TEXT, NULLABLE) - Session 狀態

### 3. Session 表（可選）

NextAuth 的 Session 表，但我們使用 JWT 策略，此表可能不需要。

## 設定步驟

### 方法 1：使用 Supabase Dashboard

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇你的專案
3. 前往 **SQL Editor**
4. 複製 `supabase/auth-schema.sql` 的內容
5. 貼上並執行

### 方法 2：使用 Supabase CLI

```bash
# 如果已安裝 Supabase CLI
supabase db push
```

### 方法 3：手動執行 SQL

1. 連接到你的 Supabase 資料庫
2. 執行 `supabase/auth-schema.sql` 中的 SQL 語句

## 驗證設定

執行以下查詢確認表已建立：

```sql
-- 檢查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('User', 'Account', 'Session');

-- 檢查索引
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('User', 'Account', 'Session');
```

## 資料流程

### 首次登入流程

1. 用戶點擊「使用 Google 登入」
2. NextAuth 處理 OAuth 流程
3. `signIn` callback 被觸發：
   - 檢查 `Account` 表中是否已有該 Google 帳號
   - 如果沒有，檢查 `User` 表中是否已有相同 email 的用戶
   - 如果都沒有，創建新的 `User` 和 `Account` 記錄
   - 如果用戶存在但 Account 不存在，創建 `Account` 記錄

### 後續登入流程

1. 用戶點擊「使用 Google 登入」
2. NextAuth 處理 OAuth 流程
3. `signIn` callback 找到現有的 `Account` 記錄
4. 允許登入，更新 session

## 用戶資料設定

用戶可以透過以下方式更新個人資料：

- 修改 `name` - 顯示名稱
- 修改 `userID` - 自訂用戶名（必須唯一）
- 修改 `bio` - 個人簡介
- 修改 `image` - 頭像
- 修改 `backgroundImage` - 背景圖片

## 注意事項

1. **userID 唯一性**：`userID` 欄位有唯一索引，但允許 NULL。如果用戶未設定，可以為 NULL。
2. **email 不唯一**：email 欄位沒有唯一約束，允許重複（例如測試環境）。
3. **外鍵約束**：`Account.userId` 有外鍵約束到 `User.id`，刪除用戶時會自動刪除相關的 Account 記錄。
4. **RLS 政策**：目前設定為允許所有人讀取和更新，之後可以改為更嚴格的權限控制。

## 測試

建立表後，可以測試登入功能：

1. 點擊右上角用戶圖標
2. 選擇「使用 Google 登入」
3. 完成 OAuth 流程
4. 檢查資料庫中是否建立了 `User` 和 `Account` 記錄

```sql
-- 查看所有用戶
SELECT * FROM "User";

-- 查看所有帳號
SELECT * FROM "Account";
```
