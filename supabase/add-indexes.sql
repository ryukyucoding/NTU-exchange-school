-- 為 Post 和相關表建立索引以加快查詢速度
-- 執行日期: 2025-12-22

-- ============================================
-- Post 表索引
-- ============================================

-- 1. 按作者查詢貼文（最常見的查詢）
CREATE INDEX IF NOT EXISTS idx_post_authorid
ON public."Post" ("authorId");

-- 2. 按狀態查詢（只查詢已發布的貼文）
CREATE INDEX IF NOT EXISTS idx_post_status
ON public."Post" ("status");

-- 3. 按類型查詢（normal/rating）
CREATE INDEX IF NOT EXISTS idx_post_type
ON public."Post" ("type");

-- 4. 按建立時間倒序查詢（首頁、時間軸）
CREATE INDEX IF NOT EXISTS idx_post_created_at
ON public."Post" ("createdAt" DESC);

-- 5. 複合索引：狀態 + 建立時間（最常用的組合）
CREATE INDEX IF NOT EXISTS idx_post_status_created_at
ON public."Post" ("status", "createdAt" DESC);

-- 6. 複合索引：作者 + 狀態（查詢特定作者的已發布貼文）
CREATE INDEX IF NOT EXISTS idx_post_authorid_status
ON public."Post" ("authorId", "status");

-- 7. 軟刪除支援：查詢未刪除的貼文
CREATE INDEX IF NOT EXISTS idx_post_deleted_at
ON public."Post" ("deletedAt")
WHERE "deletedAt" IS NULL;

-- ============================================
-- PostBoard 表索引（用於看板查詢）
-- ============================================

-- 8. 按 postId 查詢（查詢貼文屬於哪些看板）
CREATE INDEX IF NOT EXISTS idx_postboard_postid
ON public."PostBoard" ("postId");

-- 9. 按 boardId 查詢（查詢看板內的所有貼文）
CREATE INDEX IF NOT EXISTS idx_postboard_boardid
ON public."PostBoard" ("boardId");

-- 10. 複合索引：boardId + createdAt（看板內按時間排序）
CREATE INDEX IF NOT EXISTS idx_postboard_boardid_created_at
ON public."PostBoard" ("boardId", "createdAt" DESC);

-- ============================================
-- Board 表索引
-- ============================================

-- 11. 按 slug 查詢看板（URL 路由）
CREATE INDEX IF NOT EXISTS idx_board_slug
ON public."Board" ("slug");

-- 12. 按類型查詢（country/school）
CREATE INDEX IF NOT EXISTS idx_board_type
ON public."Board" ("type");

-- 13. 按學校 ID 查詢看板
CREATE INDEX IF NOT EXISTS idx_board_schoolid
ON public."Board" ("schoolId");

-- 14. 按國家 ID 查詢看板
CREATE INDEX IF NOT EXISTS idx_board_countryid
ON public."Board" ("country_id");

-- ============================================
-- Comment 表索引
-- ============================================

-- 15. 按 postId 查詢評論
CREATE INDEX IF NOT EXISTS idx_comment_postid
ON public."Comment" ("postId");

-- 16. 按 userId 查詢用戶的所有評論
CREATE INDEX IF NOT EXISTS idx_comment_userid
ON public."Comment" ("userId");

-- 17. 按 parentId 查詢子評論（樹狀結構）
CREATE INDEX IF NOT EXISTS idx_comment_parentid
ON public."Comment" ("parentId");

-- 18. 複合索引：postId + createdAt（貼文評論按時間排序）
CREATE INDEX IF NOT EXISTS idx_comment_postid_created_at
ON public."Comment" ("postId", "createdAt" DESC);

-- 19. 軟刪除支援：查詢未刪除的評論
CREATE INDEX IF NOT EXISTS idx_comment_deleted_at
ON public."Comment" ("deletedAt")
WHERE "deletedAt" IS NULL;

-- ============================================
-- Like 表索引
-- ============================================

-- 20. 按 postId 查詢（計算按讚數）
CREATE INDEX IF NOT EXISTS idx_like_postid
ON public."Like" ("postId");

-- 21. 按 userId 查詢（用戶按讚的所有貼文）
CREATE INDEX IF NOT EXISTS idx_like_userid
ON public."Like" ("userId");

-- 22. 複合唯一索引：防止重複按讚
CREATE UNIQUE INDEX IF NOT EXISTS idx_like_userid_postid
ON public."Like" ("userId", "postId");

-- ============================================
-- CommentLike 表索引
-- ============================================

-- 23. 按 commentId 查詢（計算評論按讚數）
CREATE INDEX IF NOT EXISTS idx_commentlike_commentid
ON public."CommentLike" ("commentId");

-- 24. 按 userId 查詢
CREATE INDEX IF NOT EXISTS idx_commentlike_userid
ON public."CommentLike" ("userId");

-- 25. 複合唯一索引：防止重複按讚
CREATE UNIQUE INDEX IF NOT EXISTS idx_commentlike_userid_commentid
ON public."CommentLike" ("userId", "commentId");

-- ============================================
-- Bookmark 表索引
-- ============================================

-- 26. 按 userId 查詢（用戶的書籤列表）
CREATE INDEX IF NOT EXISTS idx_bookmark_userid
ON public."Bookmark" ("userId");

-- 27. 按 postId 查詢
CREATE INDEX IF NOT EXISTS idx_bookmark_postid
ON public."Bookmark" ("postId");

-- 28. 複合索引：userId + createdAt（書籤按時間排序）
CREATE INDEX IF NOT EXISTS idx_bookmark_userid_created_at
ON public."Bookmark" ("userId", "createdAt" DESC);

-- 29. 複合唯一索引：防止重複書籤
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmark_userid_postid
ON public."Bookmark" ("userId", "postId");

-- ============================================
-- BoardFollow 表索引
-- ============================================

-- 30. 按 userId 查詢（用戶追蹤的看板）
CREATE INDEX IF NOT EXISTS idx_boardfollow_userid
ON public."BoardFollow" ("userId");

-- 31. 按 boardId 查詢（看板的追蹤者）
CREATE INDEX IF NOT EXISTS idx_boardfollow_boardid
ON public."BoardFollow" ("boardId");

-- 32. 複合唯一索引：防止重複追蹤
CREATE UNIQUE INDEX IF NOT EXISTS idx_boardfollow_userid_boardid
ON public."BoardFollow" ("userId", "boardId");

-- ============================================
-- Notification 表索引
-- ============================================

-- 33. 按 userId 查詢通知
CREATE INDEX IF NOT EXISTS idx_notification_userid
ON public."Notification" ("userId");

-- 34. 複合索引：userId + read（查詢未讀通知）
CREATE INDEX IF NOT EXISTS idx_notification_userid_read
ON public."Notification" ("userId", "read");

-- 35. 複合索引：userId + createdAt（通知按時間排序）
CREATE INDEX IF NOT EXISTS idx_notification_userid_created_at
ON public."Notification" ("userId", "createdAt" DESC);

-- ============================================
-- SchoolRating 表索引
-- ============================================

-- 36. 按 schoolId 查詢評分
CREATE INDEX IF NOT EXISTS idx_schoolrating_schoolid
ON public."SchoolRating" ("schoolId");

-- 37. 按 postId 查詢
CREATE INDEX IF NOT EXISTS idx_schoolrating_postid
ON public."SchoolRating" ("postId");

-- ============================================
-- User 表索引
-- ============================================

-- 38. 按 email 查詢（登入、註冊）
CREATE INDEX IF NOT EXISTS idx_user_email
ON public."User" ("email");

-- 39. 按 userID 查詢（如果有使用 username）
CREATE INDEX IF NOT EXISTS idx_user_userid
ON public."User" ("userID");

-- ============================================
-- schools 表索引
-- ============================================

-- 40. 按 country_id 查詢（按國家篩選學校）
CREATE INDEX IF NOT EXISTS idx_schools_country_id
ON public.schools ("country_id");

-- 41. 全文搜尋：學校名稱（中文）
CREATE INDEX IF NOT EXISTS idx_schools_name_zh_gin
ON public.schools USING gin (to_tsvector('simple', "name_zh"));

-- 42. 全文搜尋：學校名稱（英文）
CREATE INDEX IF NOT EXISTS idx_schools_name_en_gin
ON public.schools USING gin (to_tsvector('english', "name_en"));

-- ============================================
-- 完成訊息
-- ============================================

-- 顯示建立的索引數量
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

    RAISE NOTICE '✅ 索引建立完成！';
    RAISE NOTICE '📊 總共建立了 % 個索引', index_count;
END $$;
