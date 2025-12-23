# Pusher 設定指南

## 📝 步驟一：建立 Pusher 帳號與專案

### 1. 註冊 Pusher 帳號
1. 前往 https://pusher.com/
2. 點擊右上角 **Sign up** 或 **Get started free**
3. 使用 Google 帳號或 Email 註冊
4. 填寫基本資料（姓名、用途等）

### 2. 建立新的 Channels 專案
1. 登入後會自動進入 Dashboard
2. 如果是第一次使用，會引導你建立第一個專案
3. 點擊 **Create app** 或 **Create new app**
4. 填寫專案資訊：
   - **Name your app**: `NTU-Exchange-Notifications` （或任何你想要的名稱）
   - **Select a cluster**: 選擇 **ap3 (Asia Pacific - Singapore)**
     - 💡 這是離台灣最近的節點，延遲最低
   - **Create app for a front-end tech**: 選擇 **JavaScript**
   - **Create app for a back-end tech**: 選擇 **Node.js**
5. 點擊 **Create app**

### 3. 獲取 API 憑證
建立專案後，你會看到 **App Keys** 頁面，包含以下資訊：

```
app_id = "1234567"
key = "abcdef123456"
secret = "fedcba654321"
cluster = "ap3"
```

**⚠️ 請妥善保管這些憑證，不要公開分享！**

---

## 📝 步驟二：配置環境變數

1. 打開專案根目錄的 `.env` 檔案
2. 找到 Pusher 設定區塊（已經預先建立好）
3. 將剛才獲取的憑證填入：

```env
# Pusher 設定（用於即時通知推送）
PUSHER_APP_ID=你的_app_id
PUSHER_KEY=你的_key
PUSHER_SECRET=你的_secret
PUSHER_CLUSTER=ap3
NEXT_PUBLIC_PUSHER_KEY=你的_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap3
```

**範例：**
```env
# Pusher 設定（用於即時通知推送）
PUSHER_APP_ID=1234567
PUSHER_KEY=abcdef123456789
PUSHER_SECRET=fedcba987654321
PUSHER_CLUSTER=ap3
NEXT_PUBLIC_PUSHER_KEY=abcdef123456789
NEXT_PUBLIC_PUSHER_CLUSTER=ap3
```

**重要提醒：**
- `PUSHER_APP_ID`、`PUSHER_KEY`、`PUSHER_SECRET`：伺服器端使用
- `NEXT_PUBLIC_PUSHER_KEY`、`NEXT_PUBLIC_PUSHER_CLUSTER`：客戶端使用（會暴露給前端）
- ⚠️ **千萬不要** 將 `PUSHER_SECRET` 設定為 `NEXT_PUBLIC_*`，這會暴露你的密鑰！

---

## 📝 步驟三：重啟開發伺服器

環境變數更新後需要重啟 Next.js 開發伺服器：

```bash
# 按 Ctrl+C 停止目前的伺服器
# 然後重新啟動
npm run dev
```

---

## 📝 步驟四：在 Supabase 修正資料庫約束

在 Supabase Dashboard 執行以下 SQL（這個必須先做，否則通知無法創建）：

```sql
-- 1. 刪除舊的 CHECK 約束
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_type_check";

-- 2. 添加新的 CHECK 約束，包含所有 7 種通知類型
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_type_check"
  CHECK (type = ANY (ARRAY[
    'post_like'::text,
    'post_comment'::text,
    'post_repost'::text,
    'post_bookmark'::text,
    'comment_like'::text,
    'comment_reply'::text,
    'board_new_post'::text
  ]));
```

---

## 🧪 步驟五：測試即時通知

### 測試方法：

1. **開啟兩個瀏覽器視窗**（或一個正常視窗 + 一個無痕模式）
2. **視窗 A**：登入帳號 A
3. **視窗 B**：登入帳號 B
4. **在視窗 B 中執行互動**：
   - 對帳號 A 的貼文按讚
   - 留言帳號 A 的貼文
   - 回覆帳號 A 的留言
5. **觀察視窗 A**：
   - ✅ 鈴鐺上應該**立即**（1 秒內）出現藍點
   - ✅ 點擊鈴鐺應該看到新通知
   - ✅ 瀏覽器 Console 應該顯示 Pusher 連線訊息

### 預期的 Console 訊息：

**視窗 A（接收通知）：**
```
[Pusher] Subscribed to private-user-{userId}
[Pusher] New notification received: {...}
[NotificationButton] New notification received from Pusher
```

**伺服器端 (npm run dev terminal)：**
```
[Pusher] Notification pushed to user {userId}
```

---

## 🔍 除錯指南

### 問題 1：鈴鐺沒有即時出現藍點

**檢查步驟：**
1. 打開瀏覽器開發者工具（F12）→ Console
2. 確認有看到 `[Pusher] Subscribed to private-user-...`
3. 如果沒有，檢查：
   - `.env` 中的 `NEXT_PUBLIC_PUSHER_KEY` 是否正確
   - 是否重啟了開發伺服器

### 問題 2：Console 顯示 Pusher 連線錯誤

**可能原因：**
- ❌ `NEXT_PUBLIC_PUSHER_KEY` 錯誤
- ❌ `NEXT_PUBLIC_PUSHER_CLUSTER` 錯誤（應該是 `ap3`）
- ❌ Pusher 專案未啟用

**解決方法：**
1. 重新檢查 `.env` 中的憑證
2. 登入 Pusher Dashboard 確認專案狀態
3. 重啟開發伺服器

### 問題 3：創建通知時出現資料庫錯誤

**錯誤訊息：**
```
Error creating notification: {
  message: 'new row for relation "Notification" violates check constraint "Notification_type_check"'
}
```

**解決方法：**
- 在 Supabase 執行步驟四的 SQL

### 問題 4：通知創建成功但沒有推送

**檢查伺服器端 Console：**
```bash
npm run dev
```

**應該看到：**
```
[Pusher] Notification pushed to user {userId}
```

**如果沒有，檢查：**
- `.env` 中的 `PUSHER_APP_ID`、`PUSHER_KEY`、`PUSHER_SECRET` 是否正確
- 是否重啟了開發伺服器

---

## 📊 Pusher Dashboard 監控

### 查看即時連線與訊息

1. 登入 Pusher Dashboard
2. 選擇你的專案
3. 點擊左側選單的 **Debug Console**
4. 在這裡你可以看到：
   - 目前連線的客戶端數量
   - 即時的訊息推送記錄
   - 訂閱的頻道列表

### 訊息配額

**免費方案限制：**
- ✅ 每天 200,000 則訊息
- ✅ 最多 100 個同時連線
- ✅ 無限頻道數

對於學校專案來說，這個額度綽綽有餘！

---

## 🎯 整合完成檢查清單

- [ ] 在 Pusher.com 建立帳號和專案
- [ ] 獲取 API 憑證（app_id, key, secret）
- [ ] 在 `.env` 中配置 Pusher 環境變數
- [ ] 重啟 Next.js 開發伺服器
- [ ] 在 Supabase 執行 SQL 修正資料庫約束
- [ ] 測試即時通知功能
- [ ] 確認 Console 有 Pusher 連線訊息
- [ ] 確認鈴鐺即時顯示藍點

---

## 💡 技術架構說明

### 運作流程：

```
用戶 A 按讚用戶 B 的貼文
         ↓
  創建 Like 記錄（資料庫）
         ↓
  呼叫 createNotification()
         ↓
  創建 Notification 記錄（資料庫）
         ↓
  呼叫 pushNotificationToUser()
         ↓
  Pusher Server 推送到 private-user-{userId}
         ↓
  用戶 B 的瀏覽器接收 Pusher 事件
         ↓
  NotificationButton 更新藍點狀態
         ↓
  用戶 B 即時看到通知！⚡
```

### 為什麼使用 `private-user-{userId}` 頻道？

- 🔒 **安全性**：每個用戶只能收到自己的通知
- 🎯 **精準推送**：直接推送給特定用戶
- 📡 **可擴展**：輕鬆支援數千個用戶

---

## 🚀 後續優化建議

### 1. 添加音效提示

```typescript
// 在 NotificationButton.tsx 的 handleNewNotification 中
const audio = new Audio('/notification.mp3');
audio.play();
```

### 2. 添加震動動畫

```typescript
// 鈴鐺震動效果
<Bell className="w-5 h-5 animate-bounce" />
```

### 3. 顯示未讀數量徽章

```typescript
<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
  {unreadCount}
</span>
```

---

## 📚 參考資料

- Pusher Channels 官方文檔：https://pusher.com/docs/channels/
- Pusher JavaScript SDK：https://github.com/pusher/pusher-js
- Pusher Node.js SDK：https://github.com/pusher/pusher-http-node

---

**如有任何問題，請檢查 Console 訊息並參考除錯指南！** 🐛
