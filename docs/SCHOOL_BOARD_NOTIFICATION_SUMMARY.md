# 學校板通知功能完整說明

## 📋 功能概述

當使用者追蹤某個學校板後，只要有新貼文發布到該學校板，追蹤者就會收到通知。

## ✅ 已完成的改進

### 1. 加入詳細的偵錯日誌

**修改檔案: `src/lib/notifications.ts`**
- 在 `createBoardNewPostNotifications` 函數中加入日誌
- 追蹤通知建立的完整流程
- 記錄 Pusher 推送結果

**修改檔案: `app/api/posts/route.ts`**
- 在處理學校看板時加入日誌
- 追蹤 boardIds 的收集過程
- 記錄通知發送的觸發條件

### 2. 功能流程

```
1. 使用者 A 追蹤學校板 X
   ↓
   POST /api/boards/[boardId]/follow
   ↓
   在 BoardFollow 表建立追蹤記錄

2. 使用者 B 發布新貼文到學校板 X
   ↓
   POST /api/posts (包含 schoolIds)
   ↓
   查找學校板的 boardId
   ↓
   建立 PostBoard 關聯
   ↓
   呼叫 createBoardNewPostNotifications

3. 建立通知
   ↓
   查詢所有追蹤學校板 X 的使用者
   ↓
   為每個使用者建立 Notification 記錄
   ↓
   透過 Pusher 推送即時通知

4. 使用者 A 收到通知
   ↓
   NotificationContext 接收 Pusher 事件
   ↓
   更新 hasUnread 狀態
   ↓
   通知鈴鐺顯示未讀徽章
```

## 🔍 關鍵程式碼位置

### 通知建立邏輯
- **檔案**: `src/lib/notifications.ts`
- **函數**: `createBoardNewPostNotifications(postId, boardIds, authorId)`
- **功能**: 為所有追蹤指定看板的使用者建立通知

### 貼文建立時觸發通知
- **檔案**: `app/api/posts/route.ts`
- **位置**: 第 507-519 行
- **條件**:
  - `status === 'published'` (已發布)
  - `!isUpdate` (新建立，非更新)
  - `uniqueBoardIds.length > 0` (有關聯的看板)

### 學校板 ID 收集
- **檔案**: `app/api/posts/route.ts`
- **位置**: 第 413-465 行
- **流程**:
  1. 接收 `schoolIds` 陣列
  2. 查找每個學校的看板 (type='school', schoolId 不為 null)
  3. 如果看板不存在，自動建立
  4. 收集所有 boardId

### 通知顯示
- **檔案**: `src/components/notifications/NotificationItem.tsx`
- **位置**: 第 94-95 行
- **訊息**: "{看板名稱} 有新貼文"

### 通知 API
- **檔案**: `app/api/notifications/route.ts`
- **功能**:
  - 查詢使用者的通知
  - 批量獲取看板資訊
  - 附加到通知物件

## 🧪 測試步驟

### 步驟 1: 追蹤學校板
1. 登入使用者 A
2. 前往學校板頁面: `/social/boards/school/{schoolId}`
3. 點擊「追蹤」按鈕
4. 確認追蹤成功

### 步驟 2: 發布貼文
1. 登入使用者 B (不同帳號)
2. 建立新貼文
3. 選擇步驟 1 中的學校
4. 發布貼文
5. **檢查伺服器日誌**，確認通知建立流程

### 步驟 3: 確認通知
1. 切換回使用者 A
2. 查看通知鈴鐺，應顯示未讀徽章
3. 點擊通知，應該看到「{學校名稱} 有新貼文」
4. 點擊通知項目，應導航到新貼文

## 📊 偵錯日誌範例

### 正常情況的日誌輸出

```
[POST /api/posts] 開始處理學校看板，schoolIds: ["123"]
[POST /api/posts] 找到學校板: schoolId=123, boardId=abc-def-ghi
[POST /api/posts] 準備發送通知，postId=xyz, boardIds=["abc-def-ghi"]
[createBoardNewPostNotifications] 開始處理通知: {
  postId: 'xyz',
  boardIds: ['abc-def-ghi'],
  authorId: 'user-b-id',
  boardCount: 1
}
[createBoardNewPostNotifications] 查詢追蹤者結果: {
  followersCount: 2,
  followers: [
    { userId: 'user-a-id', boardId: 'abc-def-ghi' },
    { userId: 'user-c-id', boardId: 'abc-def-ghi' }
  ]
}
[createBoardNewPostNotifications] 準備建立通知: {
  totalFollowers: 2,
  uniqueUserIds: 1,  // 排除作者自己
  authorId: 'user-b-id',
  willCreateNotifications: 1
}
[createBoardNewPostNotifications] 成功建立通知: {
  count: 1,
  boardIds: ['abc-def-ghi']
}
[createBoardNewPostNotifications] Pusher 推送結果: {
  total: 1,
  success: 1,
  failed: 0
}
```

### 異常情況分析

#### 情況 1: 沒有追蹤者
```
[createBoardNewPostNotifications] 查詢追蹤者結果: {
  followersCount: 0,
  followers: []
}
[createBoardNewPostNotifications] 沒有追蹤者，跳過通知
```
**原因**: 沒有人追蹤該學校板

#### 情況 2: 找不到學校板
```
[POST /api/posts] 開始處理學校看板，schoolIds: ["123"]
[POST /api/posts] 未找到學校: 123
```
**原因**: 學校不存在於 `schools` 表

#### 情況 3: 跳過通知發送
```
[POST /api/posts] 跳過通知發送: status=draft, isUpdate=false, boardIds.length=1
```
**原因**: 貼文狀態是草稿，不發送通知

## 🔧 資料庫查詢參考

### 檢查使用者是否追蹤學校板
```sql
SELECT bf.*, b.name, b.type
FROM "BoardFollow" bf
JOIN "Board" b ON bf."boardId" = b.id
WHERE bf."userId" = 'user-id-here'
  AND b.type = 'school';
```

### 檢查學校板的追蹤者
```sql
SELECT bf."userId", u.name, u.email
FROM "BoardFollow" bf
JOIN "User" u ON bf."userId" = u.id
WHERE bf."boardId" = 'board-id-here';
```

### 檢查最近的通知
```sql
SELECT n.*, u.name as actor_name, b.name as board_name
FROM "Notification" n
LEFT JOIN "User" u ON n."actorId" = u.id
LEFT JOIN "Board" b ON n."boardId" = b.id
WHERE n.type = 'board_new_post'
ORDER BY n."createdAt" DESC
LIMIT 20;
```

## 📝 注意事項

1. **通知只會發送給已發布的貼文**
   - 草稿貼文不會觸發通知
   - 更新貼文不會重複發送通知

2. **作者不會收到自己的通知**
   - 系統自動排除作者本人

3. **支援多個看板**
   - 一篇貼文可以同時關聯多個看板（國家板 + 學校板）
   - 所有追蹤者都會收到通知

4. **即時推送**
   - 使用 Pusher 實現即時通知
   - 如果 Pusher 推送失敗，通知仍然會儲存在資料庫

## ✨ 與國家板通知的一致性

學校板通知和國家板通知使用**完全相同的機制**：
- 使用相同的 `createBoardNewPostNotifications` 函數
- 使用相同的通知類型 `board_new_post`
- 使用相同的顯示格式

**唯一的區別**是看板的 `type` 欄位：
- 國家板: `type = 'country'`, `schoolId = null`, `country_id != null`
- 學校板: `type = 'school'`, `schoolId != null`

## 🎯 結論

學校板通知功能**理論上已經完整實作**，與國家板通知使用相同的程式碼邏輯。如果目前只有國家板通知有效，可能的原因包括：

1. 沒有人追蹤學校板
2. 發布貼文時沒有選擇學校
3. 學校板不存在

請使用上述的測試步驟和偵錯日誌來確認問題所在。
