# Refactoring 結構圖

## 新增的檔案結構

```
src/
├── contexts/
│   ├── FilterContext.tsx              (既有)
│   ├── MapZoomContext.tsx             (既有)
│   ├── SchoolContext.tsx              (既有)
│   ├── UserContext.tsx                (既有)
│   ├── WishlistContext.tsx            (既有)
│   └── NotificationContext.tsx        ✨ 新增 - 管理通知狀態
│
├── hooks/
│   ├── useBackgroundBrightness.ts     (既有)
│   ├── useFilteredSchools.ts          (既有)
│   ├── usePanelManager.ts             (既有)
│   ├── usePostUpdates.ts              (既有)
│   ├── usePusher.ts                   (既有)
│   ├── useBoards.ts                   ✨ 新增 - 管理追蹤看板資料
│   ├── usePopularTags.ts              ✨ 新增 - 管理熱門標籤資料
│   ├── usePosts.ts                    ✨ 新增 - 管理貼文列表與分頁
│   └── usePostActions.ts              ✨ 新增 - 管理貼文互動邏輯
│
└── components/
    ├── auth/
    │   └── NotificationButton.tsx     🔧 重構 - 使用 NotificationContext
    └── social/
        ├── SocialSidebar.tsx          🔧 重構 - 使用 useBoards, usePopularTags
        ├── PostList.tsx               🔧 重構 - 使用 usePosts
        ├── GeneralPostCard.tsx        🔧 重構 - 使用 usePostActions
        └── SchoolReviewPostCard.tsx   🔧 重構 - 使用 usePostActions
```

## 資料流向圖

### NotificationContext 資料流
```
NotificationProvider (app/providers.tsx)
    │
    ├── 整合 usePusher (即時通知)
    ├── 定期輪詢 API
    └── 提供全域狀態
            │
            └──> NotificationButton
                    └── 顯示未讀徽章
```

### 社群資料流
```
SocialSidebar
    │
    ├──> useBoards
    │       ├── GET /api/boards/followed
    │       ├── 監聽 window events
    │       └── 回傳 { followedBoards, loading, error, refetch }
    │
    └──> usePopularTags
            ├── GET /api/hashtags/popular
            └── 回傳 { tags, loading, error, refetch }
```

### 貼文列表資料流
```
PostList
    │
    └──> usePosts
            ├── GET /api/posts (with filters)
            ├── Cursor-based pagination
            ├── Auto-refetch on filter change
            └── 回傳 { posts, loading, hasMore, loadMore, refetch }
                    │
                    └──> GeneralPostCard / SchoolReviewPostCard
```

### 貼文互動資料流
```
GeneralPostCard / SchoolReviewPostCard
    │
    ├──> usePostUpdates (即時計數)
    │       └── 監聽 Pusher events
    │
    └──> usePostActions (互動邏輯)
            ├── handleLike
            │   └── POST/DELETE /api/posts/:id/like
            ├── handleBookmark
            │   └── POST/DELETE /api/posts/:id/bookmark
            └── handleRepost
                └── Navigate to /social/post/general?repostId=...
```

## Hook 依賴關係

```
useNotifications (from NotificationContext)
    └── usePusher

useBoards
    └── useSession (from next-auth)

usePopularTags
    └── (獨立，無依賴)

usePosts
    └── (獨立，無依賴)

usePostActions
    └── useRouter (from next/navigation)
```

## 元件簡化對比

### Before (改進前)
```jsx
function NotificationButton() {
  const [hasUnread, setHasUnread] = useState(false);

  // ❌ 直接 API 呼叫
  const checkUnread = async () => { /* ... */ };

  // ❌ 管理 Pusher 訂閱
  usePusher({ /* ... */ });

  // ❌ 輪詢邏輯
  useEffect(() => { /* ... */ }, []);

  return <Button>...</Button>;
}
```

### After (改進後)
```jsx
function NotificationButton() {
  // ✅ 只使用 hook
  const { hasUnread, setHasUnread } = useNotifications();

  return <Button>...</Button>;
}
```

---

### Before (改進前)
```jsx
function PostList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);

  // ❌ 複雜的 fetch 邏輯 (~85 行)
  const fetchPosts = async (cursor) => { /* ... */ };

  // ❌ 手動重置邏輯
  useEffect(() => { /* ... */ }, [filter, sort, ...]);

  return <div>{posts.map(...)}</div>;
}
```

### After (改進後)
```jsx
function PostList() {
  // ✅ 只使用 hook
  const { posts, loading, hasMore, loadMore } = usePosts({
    filter, boardId, sort, ...
  });

  return <div>{posts.map(...)}</div>;
}
```

---

### Before (改進前)
```jsx
function GeneralPostCard({ post }) {
  const [isLiked, setIsLiked] = useState(post.isLiked);

  // ❌ 內部實作業務邏輯 (~50 行)
  const handleLike = async () => { /* ... */ };
  const handleBookmark = async () => { /* ... */ };
  const handleRepost = () => { /* ... */ };

  return <Card>...</Card>;
}
```

### After (改進後)
```jsx
function GeneralPostCard({ post }) {
  // ✅ 只使用 hook
  const { isLiked, handleLike, handleBookmark, handleRepost } =
    usePostActions({ postId: post.id, ... });

  return <Card>...</Card>;
}
```

## 優點總結

| 面向 | 改進前 | 改進後 |
|------|--------|--------|
| 程式碼行數 | ~1000 行 | ~750 行 (-250 行) |
| 關注點分離 | ❌ 混在一起 | ✅ 清楚分離 |
| 可重用性 | ❌ 難以重用 | ✅ 高度可重用 |
| 可測試性 | ❌ 難以測試 | ✅ 容易測試 |
| 維護性 | ❌ 難以維護 | ✅ 容易維護 |
| 型別安全 | ✅ 有 TypeScript | ✅ 有 TypeScript |
| 效能 | ⚠️ 重複 API 呼叫 | ✅ Context 共享狀態 |

## 關鍵改進

1. **資料與 UI 分離**: 元件只負責 UI，邏輯移至 hooks
2. **集中管理狀態**: 使用 Context 避免重複 API 呼叫
3. **提升可重用性**: Hooks 可在多個元件中重用
4. **簡化元件**: 元件程式碼量減少 30-70%
5. **型別安全**: 所有 hooks 都有完整的 TypeScript 型別定義
