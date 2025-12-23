# 通知顯示錯誤的修正

## 🐛 問題描述

**症狀**: 追蹤學校板時，收到新貼文通知，但通知顯示的是**國家名稱**而不是**學校名稱**。

**原因**: 在建立通知時，程式碼錯誤地使用了 `boardIds[0]`（第一個看板 ID），而不是使用者**實際追蹤的那個看板的 ID**。

## 🔍 問題分析

### 舊程式碼 (錯誤)

```typescript
// 在 src/lib/notifications.ts 中
const uniqueUserIds = [...new Set(followers.map((f: any) => f.userId))]
  .filter(uid => uid !== authorId);

const notifications = uniqueUserIds.slice(0, 1000).map(userId => ({
  id: crypto.randomUUID(),
  userId,
  type: 'board_new_post',
  actorId: authorId,
  postId,
  boardId: boardIds[0], // ❌ 錯誤：統一使用第一個 boardId
  read: false,
  createdAt: new Date().toISOString(),
}));
```

**問題**:
- 假設一篇貼文同時發布到「美國（國家板）」和「哈佛大學（學校板）」
- `boardIds = [國家板ID, 學校板ID]`
- 所有通知都會使用 `boardIds[0]`，也就是國家板 ID
- 即使使用者追蹤的是學校板，通知也會顯示國家名稱

### 新程式碼 (正確)

```typescript
// 為每個追蹤者建立通知，並使用他們追蹤的看板 ID
const userBoardMap = new Map<string, string>();
followers.forEach((f: any) => {
  if (f.userId !== authorId && !userBoardMap.has(f.userId)) {
    userBoardMap.set(f.userId, f.boardId); // ✅ 使用使用者追蹤的看板 ID
  }
});

const notifications = Array.from(userBoardMap.entries())
  .slice(0, 1000)
  .map(([userId, boardId]) => ({
    id: crypto.randomUUID(),
    userId,
    type: 'board_new_post',
    actorId: authorId,
    postId,
    boardId, // ✅ 正確：使用該使用者追蹤的看板 ID
    read: false,
    createdAt: new Date().toISOString(),
  }));
```

**改進**:
- 使用 `Map` 來追蹤每個使用者追蹤的看板
- 每個使用者的通知會使用**他們實際追蹤的那個看板的 ID**
- 如果使用者同時追蹤了國家板和學校板，只會收到一個通知（使用第一個追蹤的看板）

## 📊 範例說明

### 情境
- 使用者 A 追蹤「哈佛大學（學校板）」
- 使用者 B 追蹤「美國（國家板）」
- 使用者 C 發布一篇貼文到「美國」和「哈佛大學」

### 修正前（錯誤）
```
followers = [
  { userId: 'A', boardId: '學校板ID' },
  { userId: 'B', boardId: '國家板ID' }
]

boardIds = ['國家板ID', '學校板ID']

通知:
- 使用者 A: boardId = '國家板ID' ❌ 顯示「美國 有新貼文」
- 使用者 B: boardId = '國家板ID' ✅ 顯示「美國 有新貼文」
```

### 修正後（正確）
```
followers = [
  { userId: 'A', boardId: '學校板ID' },
  { userId: 'B', boardId: '國家板ID' }
]

userBoardMap = {
  'A' => '學校板ID',
  'B' => '國家板ID'
}

通知:
- 使用者 A: boardId = '學校板ID' ✅ 顯示「哈佛大學 有新貼文」
- 使用者 B: boardId = '國家板ID' ✅ 顯示「美國 有新貼文」
```

## ✅ 修正內容

**修改檔案**: `src/lib/notifications.ts`

**修改位置**: 第 128-158 行

**主要改動**:
1. 建立 `userBoardMap` 來記錄每個使用者追蹤的看板
2. 排除作者本人（在 `forEach` 中就過濾掉）
3. 去重邏輯：如果同一個使用者追蹤多個看板，只使用第一個
4. 建立通知時使用 `Map` 中記錄的 `boardId`

## 🧪 測試驗證

### 測試步驟
1. 使用者 A 追蹤學校板（例如：哈佛大學）
2. 使用者 B 發布新貼文，同時選擇該學校和所在國家
3. 檢查使用者 A 的通知

**預期結果**:
- ✅ 通知顯示「哈佛大學 有新貼文」（而不是「美國 有新貼文」）

### 伺服器日誌
現在日誌會顯示 `userBoardMap`，可以清楚看到每個使用者對應的看板：

```
[createBoardNewPostNotifications] 準備建立通知: {
  totalFollowers: 2,
  uniqueUserIds: 2,
  authorId: 'user-c-id',
  willCreateNotifications: 2,
  userBoardMap: [
    ['user-a-id', '學校板ID'],
    ['user-b-id', '國家板ID']
  ]
}
```

## 🎯 邊界情況處理

### 情況 1: 使用者同時追蹤國家板和學校板
**問題**: 如果使用者同時追蹤了「美國」和「哈佛大學」，發布一篇貼文到兩個板時，會收到幾個通知？

**答案**: 只會收到**一個通知**，使用第一個追蹤的看板 ID。

**原因**: 使用 `Map.has()` 檢查，如果使用者已經在 Map 中，就不會重複加入。

**程式碼**:
```typescript
if (f.userId !== authorId && !userBoardMap.has(f.userId)) {
  userBoardMap.set(f.userId, f.boardId);
}
```

### 情況 2: 多個看板的順序
**問題**: 如果 `followers` 的順序是隨機的，會使用哪個看板 ID？

**答案**: 使用**第一個出現的看板 ID**（取決於資料庫查詢結果的順序）。

**建議**: 如果需要控制順序（例如優先顯示學校板），可以在查詢時加入排序：
```typescript
const { data: followers } = await supabase
  .from('BoardFollow')
  .select('userId, boardId, Board!inner(type)')
  .in('boardId', boardIds)
  .order('Board.type', { ascending: false }); // school > country
```

## 📝 後續建議

### 選項 1: 為每個看板建立獨立通知（可能造成通知過多）
如果希望使用者同時追蹤國家板和學校板時，收到兩個通知：

```typescript
const notifications = followers
  .filter((f: any) => f.userId !== authorId)
  .slice(0, 1000)
  .map((f: any) => ({
    id: crypto.randomUUID(),
    userId: f.userId,
    type: 'board_new_post',
    actorId: authorId,
    postId,
    boardId: f.boardId, // 每個追蹤關係建立一個通知
    read: false,
    createdAt: new Date().toISOString(),
  }));
```

**優點**: 更準確，不會漏掉任何看板
**缺點**: 可能造成通知疲勞（同一篇貼文收到多個通知）

### 選項 2: 優先顯示學校板（推薦）
如果希望優先顯示學校板的名稱：

```typescript
// 先按 Board.type 排序，school 在前
const { data: followers } = await supabase
  .from('BoardFollow')
  .select('userId, boardId, Board!inner(type)')
  .in('boardId', boardIds)
  .order('Board.type', { ascending: false });

// 然後使用第一個（即 school 類型）
const userBoardMap = new Map<string, string>();
followers.forEach((f: any) => {
  if (f.userId !== authorId && !userBoardMap.has(f.userId)) {
    userBoardMap.set(f.userId, f.boardId);
  }
});
```

**優點**: 更符合使用者預期（學校板比國家板更具體）
**缺點**: 需要修改查詢語句

## ✨ 總結

**問題**: 通知顯示錯誤的看板名稱
**原因**: 使用 `boardIds[0]` 而不是使用者追蹤的看板 ID
**修正**: 使用 `Map` 記錄每個使用者追蹤的看板，建立通知時使用對應的 ID
**結果**: 現在通知會正確顯示使用者追蹤的那個看板的名稱

---

**Build 狀態**: ✅ 編譯成功
**測試建議**: 請按照上述測試步驟驗證修正是否生效
