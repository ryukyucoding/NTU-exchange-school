# 抓贴文逻辑说明

## 当前逻辑流程

### 1. 参数解析
- `filter`: "all" | "following" | "drafts" (默认: "all")
- `boardId`: 看板ID（可选）
- `hashtag`: 标签（可选）
- `schoolId`: 学校ID（可选）
- `filterType`: "rating" 表示只要评分贴文（可选）
- `sort`: "latest" | "popular" (默认: "latest")
- `limit`: 每页数量（默认: 10）

### 2. 查询流程

#### 情况 A: 有 boardId
1. ✅ 验证 Board 是否存在
2. ✅ 查询 PostBoard 表，获取该看板的所有 postId
3. ✅ 设置 `filterPostIds = [从PostBoard获取的postIds]`
4. ⏭️ 跳过"查询所有Posts"的步骤

#### 情况 B: 没有 boardId（社群主页）
1. ✅ 构建基础查询：
   ```sql
   SELECT * FROM Post
   WHERE deletedAt IS NULL
     AND status = 'published'
   ORDER BY createdAt DESC
   LIMIT {limit}
   ```
2. ✅ 如果 `filter === "following"`：
   - 查询用户追踪的看板
   - 从 PostBoard 获取这些看板的 postId
   - 应用 `.in('id', postIds)` 过滤
3. ✅ 如果有其他过滤条件（hashtag, schoolId, filterType），也会设置 `filterPostIds`

#### 情况 C: filter === "drafts"
- 直接返回当前用户的草稿，不经过主查询流程

### 3. 应用过滤条件

如果 `filterPostIds !== null`：
- ✅ 先验证这些 postId 是否存在于 Post 表中
- ✅ 检查它们的状态（status, deletedAt）
- ✅ 应用 `.in('id', filterPostIds)` 过滤

如果 `filterPostIds === null`：
- ✅ 查询所有已发布的贴文（没有额外过滤）

### 4. 执行查询

执行 Supabase 查询，获取：
- Post 的所有字段
- 作者信息（通过外键关联 User 表）
- 转发的原始贴文（如果有 repostId）

### 5. 后处理

- 批量获取互动数据（点赞、转发、留言）
- 获取 hashtags、photos、schools、ratings
- 组合数据并返回

## 可能的问题

### ❌ 问题 1: Post 表中没有符合条件的贴文
**检查点：**
- Post 表中是否有 `status = 'published'` 的记录？
- 这些记录的 `deletedAt` 是否为 `null`？

**调试方法：**
查看控制台日志 `🔍 Post 表所有數據`，检查：
- 有多少条 Post 记录
- 它们的 status 是什么
- deletedAt 是否为 null

### ❌ 问题 2: PostBoard 关联问题
**检查点：**
- PostBoard 表中是否有数据？
- boardId 格式是否匹配？
- PostBoard 中的 postId 是否存在于 Post 表中？

**调试方法：**
查看控制台日志 `📋 PostBoard 表所有數據` 和 `🔍 PostBoard 查詢結果`

### ❌ 问题 3: 查询条件太严格
当前查询条件：
- `deletedAt IS NULL` ✅
- `status = 'published'` ✅

如果贴文状态是 `'draft'` 或其他值，不会被查询到。

### ❌ 问题 4: RLS (Row Level Security) 政策
如果 Supabase 启用了 RLS，可能阻止了查询。

## 调试建议

1. **检查数据库中的实际数据：**
   - 查看 Post 表中有多少条记录
   - 查看这些记录的 status 和 deletedAt 字段

2. **查看服务器端日志：**
   - 所有 `[GET /api/posts]` 开头的日志都在服务器端
   - 需要在终端/服务器日志中查看，不会出现在浏览器控制台

3. **检查查询结果：**
   - 查看 `📊 查詢結果` 日志
   - 检查是否有错误信息

## 建议的修复方向

如果 Post 表中确实有贴文但查询不到，可能的原因：

1. **status 不是 'published'**
   - 检查贴文创建时是否正确设置了 status
   - 可能需要更新现有贴文的 status

2. **deletedAt 不为 null**
   - 检查是否有贴文被标记为删除

3. **查询条件需要调整**
   - 可能需要放宽查询条件（例如允许 draft 状态）

