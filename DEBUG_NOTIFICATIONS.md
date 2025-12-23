# 通知系統診斷指南

## 問題診斷步驟

### 1. 檢查資料庫中的通知

在 Supabase Dashboard → SQL Editor 執行：

```sql
-- 查看最近 10 條通知
SELECT
  id,
  "userId",
  type,
  "actorId",
  "postId",
  "commentId",
  "boardId",
  read,
  "createdAt"
FROM "Notification"
ORDER BY "createdAt" DESC
LIMIT 10;
```

**預期結果：**
- `boardId` 應該只在 `type = 'board_new_post'` 時有值
- 其他類型的通知 `boardId` 為 null 是**正常的**

---

### 2. 檢查通知 API 是否正常

打開瀏覽器開發者工具（F12）→ Console，執行：

```javascript
// 測試通知列表 API
fetch('/api/notifications?limit=5')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Notifications API Response:', data);
    console.log('Total notifications:', data.notifications?.length || 0);
  })
  .catch(err => console.error('❌ API Error:', err));

// 測試未讀數量 API
fetch('/api/notifications/unread-count')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Unread Count:', data);
  })
  .catch(err => console.error('❌ Unread Count Error:', err));
```

**預期結果：**
- 應該看到通知列表
- `notifications` 陣列應該包含通知資料
- 每個通知應該有 `actor`, `post`, `comment`, `board` 等關聯資料

---

### 3. 檢查 Pusher 連線狀態

在 Console 中檢查：

```javascript
// 應該看到類似這樣的訊息
[Pusher] Subscribed to private-user-{userId}
```

**如果沒有看到：**
- 檢查 `.env` 中的 `NEXT_PUBLIC_PUSHER_KEY` 是否正確
- 確認已經重啟開發伺服器

---

### 4. 檢查通知面板是否渲染

在 Console 執行：

```javascript
// 檢查 NotificationList 組件是否掛載
document.querySelector('[role="dialog"]') ||
document.querySelector('.w-96.p-0') ||
console.log('❌ Notification panel not found - try clicking the bell icon');
```

---

### 5. 手動觸發通知測試

在一個瀏覽器視窗（帳號 A）執行：

```javascript
// 取得目前登入的 userId
console.log('Current user:', window.location.href);
```

在另一個視窗（帳號 B）對帳號 A 的貼文按讚，然後觀察帳號 A 的視窗：
- ✅ Console 應該顯示 `[Pusher] New notification received`
- ✅ 鈴鐺應該出現藍點
- ✅ 點擊鈴鐺應該看到通知列表

---

## 常見問題排查

### 問題 1：通知面板是空的（顯示「暫無通知」）

**可能原因：**
1. 資料庫中沒有該用戶的通知
2. API 返回的通知列表為空
3. 通知的 `userId` 與登入用戶不匹配

**檢查方法：**

```sql
-- 在 Supabase 檢查特定用戶的通知
SELECT * FROM "Notification"
WHERE "userId" = '你的_user_id'
ORDER BY "createdAt" DESC;
```

### 問題 2：通知有資料但不顯示

**檢查 NotificationList 組件狀態：**

在瀏覽器點擊鈴鐺後，在 Console 執行：

```javascript
// 檢查 React 組件狀態（需要 React DevTools）
// 或直接檢查 Network 標籤中的 /api/notifications 請求
```

**檢查 Network 標籤：**
1. 打開 DevTools → Network
2. 點擊鈴鐺圖示
3. 查找 `notifications?limit=20` 請求
4. 檢查 Response 是否有資料

### 問題 3：boardId 都是 null

**這是正常的！**

只有以下情況 `boardId` 才會有值：
- 通知類型是 `board_new_post`（你追蹤的板有新貼文）

其他通知類型（post_like, post_comment, comment_reply 等）的 `boardId` 本來就是 null。

### 問題 4：Pusher 沒有推送

**檢查步驟：**

1. 確認 `.env` 配置正確：
```env
PUSHER_APP_ID=2094312
PUSHER_KEY=022cc2ed5a390613f3a2
PUSHER_SECRET=06efdcdedaa456c58189
PUSHER_CLUSTER=ap3
NEXT_PUBLIC_PUSHER_KEY=022cc2ed5a390613f3a2
NEXT_PUBLIC_PUSHER_CLUSTER=ap3
```

2. 重啟開發伺服器：
```bash
# Ctrl+C 停止
npm run dev
```

3. 檢查 Pusher Dashboard：
   - 登入 https://dashboard.pusher.com
   - 選擇你的專案
   - 查看 Debug Console
   - 應該看到連線和訊息記錄

### 問題 5：資料庫 CHECK 約束錯誤

**錯誤訊息：**
```
new row for relation "Notification" violates check constraint "Notification_type_check"
```

**解決方法：**

在 Supabase SQL Editor 執行：

```sql
-- 刪除舊約束
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_type_check";

-- 添加新約束
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

## 完整測試流程

### 測試 1：按讚通知

1. **帳號 A** 登入並發布一篇貼文
2. **帳號 B** 登入（另一個瀏覽器/無痕模式）
3. **帳號 B** 對帳號 A 的貼文按讚
4. **觀察帳號 A**：
   - ✅ 鈴鐺應該在 1 秒內出現藍點
   - ✅ Console 顯示 `[Pusher] New notification received`
   - ✅ Console 顯示 `[NotificationButton] New notification received from Pusher`
   - ✅ 點擊鈴鐺看到「XXX 對你的貼文按讚」

### 測試 2：留言通知

1. **帳號 B** 留言帳號 A 的貼文
2. **觀察帳號 A**：
   - ✅ 即時收到通知
   - ✅ 顯示「XXX 留言了貼文：{留言內容前30字}」

### 測試 3：回覆留言通知

1. **帳號 A** 在貼文下留言
2. **帳號 B** 回覆帳號 A 的留言
3. **觀察帳號 A**：
   - ✅ 即時收到通知
   - ✅ 顯示「XXX 回覆了貼文：{回覆內容前30字}」

### 測試 4：板新貼文通知

1. **帳號 A** 追蹤某個板（例如：美國版）
2. **帳號 B** 在該板發布新貼文
3. **觀察帳號 A**：
   - ✅ 即時收到通知
   - ✅ 顯示「美國版 有新貼文」
   - ✅ 資料庫中該通知的 `boardId` 應該有值

---

## 預期的 Console 輸出

### 正常運作時應該看到：

```
[Pusher] Subscribed to private-user-abc123
[NotificationButton] New notification received from Pusher
[Pusher] New notification received: {id: "...", type: "post_like", ...}
```

### 伺服器端（npm run dev terminal）應該顯示：

```
[Pusher] Notification pushed to user abc123
```

---

## 如果還是不work

請提供以下資訊：

1. **瀏覽器 Console 的完整輸出**（截圖或複製文字）
2. **Network 標籤中 `/api/notifications` 的 Response**
3. **資料庫中的通知資料**（執行上面的 SQL）
4. **Pusher Dashboard 的 Debug Console** 是否有看到訊息

這樣我才能更精確地診斷問題！
