# 學校板通知功能偵錯指南

## 問題描述
目前通知功能只對追蹤**國家板**有通知提醒，需要確認追蹤**學校板**的新貼文通知是否正常運作。

## 程式碼改進

我已經在以下檔案加入詳細的偵錯日誌：

### 1. `src/lib/notifications.ts`
在 `createBoardNewPostNotifications` 函數中加入日誌，可以追蹤：
- 接收到的 boardIds
- 查詢到的追蹤者
- 建立的通知數量
- Pusher 推送結果

### 2. `app/api/posts/route.ts`
在建立貼文時加入日誌，可以追蹤：
- 接收到的 schoolIds
- 找到的學校板 boardId
- 準備發送通知的 boardIds
- 通知發送結果

## 測試步驟

### 測試 1: 確認學校板追蹤功能
1. 登入系統
2. 前往任一學校板頁面（例如：`/social/boards/school/123`）
3. 點擊「追蹤」按鈕
4. 檢查瀏覽器 Network 標籤，確認 `POST /api/boards/[boardId]/follow` 成功

### 測試 2: 發布貼文到學校板
1. 使用另一個帳號登入
2. 建立一篇新貼文，並選擇一個學校（例如：在發文介面選擇學校）
3. 發布貼文
4. **檢查伺服器日誌**，應該會看到：
   ```
   [POST /api/posts] 開始處理學校看板，schoolIds: [...]
   [POST /api/posts] 找到學校板: schoolId=xxx, boardId=xxx
   [POST /api/posts] 準備發送通知，postId=xxx, boardIds=[...]
   [createBoardNewPostNotifications] 開始處理通知: ...
   [createBoardNewPostNotifications] 查詢追蹤者結果: ...
   [createBoardNewPostNotifications] 準備建立通知: ...
   [createBoardNewPostNotifications] 成功建立通知: ...
   ```

### 測試 3: 確認通知接收
1. 切換回第一個帳號（追蹤學校板的帳號）
2. 檢查通知鈴鐺圖示，應該會顯示未讀徽章
3. 點擊通知，應該會看到「新貼文」通知
4. 點擊通知應該會導航到新貼文

## 可能的問題排查

### 問題 1: 沒有收到通知
檢查伺服器日誌中的：
- `[createBoardNewPostNotifications] 查詢追蹤者結果`
  - 如果 `followersCount: 0`，代表沒有人追蹤該學校板
  - 檢查資料庫 `BoardFollow` 表，確認追蹤記錄是否存在

### 問題 2: boardIds 為空
檢查伺服器日誌中的：
- `[POST /api/posts] 開始處理學校看板`
  - 如果沒有這個日誌，代表前端沒有傳送 `schoolIds`
  - 檢查發文介面，確認學校選擇功能是否正常

### 問題 3: 找不到學校板
檢查伺服器日誌中的：
- `[POST /api/posts] 找到學校板`
  - 如果沒有這個日誌，代表學校板不存在
  - 檢查資料庫 `Board` 表，確認學校板是否存在
  - 確認 `Board.type = 'school'` 且 `Board.schoolId` 不為 null

### 問題 4: Pusher 推送失敗
檢查伺服器日誌中的：
- `[createBoardNewPostNotifications] Pusher 推送結果`
  - 如果 `failed > 0`，代表 Pusher 推送失敗
  - 檢查 Pusher 設定是否正確
  - 檢查 Pusher 額度是否用完

## 資料庫檢查

### 檢查追蹤記錄
```sql
SELECT * FROM "BoardFollow"
WHERE "boardId" IN (
  SELECT id FROM "Board"
  WHERE type = 'school' AND "schoolId" IS NOT NULL
);
```

### 檢查學校板
```sql
SELECT * FROM "Board"
WHERE type = 'school' AND "schoolId" IS NOT NULL
LIMIT 10;
```

### 檢查貼文-看板關聯
```sql
SELECT pb.*, b.name, b.type, b."schoolId"
FROM "PostBoard" pb
JOIN "Board" b ON pb."boardId" = b.id
WHERE b.type = 'school'
ORDER BY pb."createdAt" DESC
LIMIT 10;
```

### 檢查通知
```sql
SELECT * FROM "Notification"
WHERE type = 'board_new_post'
ORDER BY "createdAt" DESC
LIMIT 20;
```

## 程式碼邏輯說明

### 通知建立流程
1. 使用者發布貼文到學校板
2. `POST /api/posts` 接收 `schoolIds` 陣列
3. 根據 `schoolIds` 查找或建立學校板，收集 `boardIds`
4. 呼叫 `createBoardNewPostNotifications(postId, boardIds, authorId)`
5. 查詢所有追蹤這些看板的使用者
6. 為每個使用者建立通知記錄（排除作者自己）
7. 透過 Pusher 推送即時通知

### 關鍵條件
- 貼文狀態必須是 `published`（不是 `draft`）
- 必須是新建立的貼文（`!isUpdate`）
- 必須有 `boardIds`（長度 > 0）

## 預期結果

**正常情況下**，當使用者 A 追蹤學校板 X，使用者 B 在學校板 X 發布新貼文時：
1. 使用者 A 會在資料庫中看到新的 `Notification` 記錄
2. 使用者 A 會收到 Pusher 即時推送
3. 使用者 A 的通知鈴鐺會顯示未讀徽章
4. 點擊通知可以導航到新貼文

---

**注意**: 如果測試失敗，請檢查伺服器日誌，尋找上述的偵錯訊息。
