import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";
import { countCharacters, parseBoards } from "@/lib/utils";

/**
 * POST /api/posts
 * 建立新貼文
 */
export async function POST(req: NextRequest) {
  try {
    // 獲取登入 session
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入才能發文" },
        { status: 401 }
      );
    }
    const userId = (session.user as any).id;
    
    // 如果沒有 userId，使用臨時測試用戶ID（僅用於開發測試）
    // const userId = session?.user?.id || "00000000-0000-0000-0000-000000000001";

    const { content, schoolIds } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    // 檢查字元數（280 字元限制）
    const charInfo = countCharacters(trimmedContent);
    if (charInfo.count > 280) {
      return NextResponse.json(
        { error: `貼文超過 280 字元限制（目前：${charInfo.count} 字元）` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // 建立貼文
    const postId = crypto.randomUUID();
    const { data: post, error: postError } = await supabase
      .from('Post')
      .insert({
        id: postId,
        content: trimmedContent,
        authorId: userId,
      })
      .select()
      .single();

    if (postError) {
      console.error("Error creating post:", postError);
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    }

    // 如果有選擇學校，建立關聯
    if (schoolIds && Array.isArray(schoolIds) && schoolIds.length > 0) {
      const postSchoolInserts = schoolIds.map((schoolId: string) => ({
        id: crypto.randomUUID(),
        postId: postId,
        schoolId: schoolId,
      }));

      const { error: relationError } = await supabase
        .from('PostSchool')
        .insert(postSchoolInserts);

      if (relationError) {
        console.error("Error creating post-school relations:", relationError);
        // 不影響貼文建立，只記錄錯誤
      }
    }

    // 處理看板：解析內容中的看板標記（#看板名稱）
    const boardNames = parseBoards(trimmedContent);
    if (boardNames.length > 0) {
      const boardIds: string[] = [];
      
      // 查找或創建看板
      for (const boardName of boardNames) {
        // 生成 slug（將看板名稱轉換為 URL 友好的格式）
        const slug = boardName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '');
        
        // 先查找是否已存在該看板（先按 name 查找，再按 slug 查找）
        let existingBoard = null;
        
        // 按 name 查找
        const { data: boardByName } = await supabase
          .from('Board')
          .select('id')
          .eq('name', boardName)
          .limit(1)
          .maybeSingle();
        
        if (boardByName) {
          existingBoard = boardByName;
        } else {
          // 按 slug 查找
          const { data: boardBySlug } = await supabase
            .from('Board')
            .select('id')
            .eq('slug', slug)
            .limit(1)
            .maybeSingle();
          
          if (boardBySlug) {
            existingBoard = boardBySlug;
          }
        }
        
        let boardId: string;
        
        if (existingBoard) {
          boardId = existingBoard.id;
        } else {
          // 創建新看板
          boardId = crypto.randomUUID();
          const { error: boardError } = await supabase
            .from('Board')
            .insert({
              id: boardId,
              type: 'region', // 默認為地區版，可以後續調整
              name: boardName,
              slug: slug,
              description: null,
            });
          
          if (boardError) {
            console.error("Error creating board:", boardError);
            continue; // 跳過這個看板，繼續處理下一個
          }
        }
        
        boardIds.push(boardId);
      }
      
      // 建立 PostBoard 關聯
      if (boardIds.length > 0) {
        const postBoardInserts = boardIds.map((boardId: string) => ({
          id: crypto.randomUUID(),
          postId: postId,
          boardId: boardId,
        }));
        
        const { error: postBoardError } = await supabase
          .from('PostBoard')
          .insert(postBoardInserts);
        
        if (postBoardError) {
          console.error("Error creating post-board relations:", postBoardError);
          // 不影響貼文建立，只記錄錯誤
        }
      }
    }

    // 獲取完整的貼文資料（包含作者資訊）
    const { data: fullPost, error: fetchError } = await supabase
      .from('Post')
      .select(`
        *,
        author:User!Post_authorId_fkey (
          id,
          name,
          userID,
          image,
          email
        )
      `)
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error("Error fetching post:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch created post" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: fullPost,
    });
  } catch (error: any) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts
 * 獲取貼文列表
 * Query params:
 *   - filter: "all" | "following" (default: "all")
 *   - limit: number (default: 20)
 *   - cursor: string (for pagination)
 *   - boardId: string (optional, filter by board)
 */
export async function GET(req: NextRequest) {
  try {
    // 暫時禁用認證檢查，允許未登入訪問
    const userId = null; // 暫時設為 null

    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get("filter") || "all";
    const limit = parseInt(searchParams.get("limit") || "10");
    const cursor = searchParams.get("cursor");
    const boardId = searchParams.get("boardId");

    const supabase = getSupabaseServer();
    
    // 如果 Supabase 未配置，返回空列表
    if (!supabase) {
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    let query = supabase
      .from('Post')
      .select(`
        *,
        author:User!Post_authorId_fkey (
          id,
          name,
          userID,
          image,
          email
        ),
        repostedPost:Post!Post_repostedPostId_fkey (
          id,
          content,
          createdAt,
          author:User!Post_authorId_fkey (
            id,
            name,
            userID,
            image,
            email
          )
        ),
        schools:PostSchool!PostSchool_postId_fkey (
          school:schools!PostSchool_schoolId_fkey (
            id,
            name_zh,
            name_en,
            country
          )
        )
      `)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(limit);

    // 如果是 "following"，只顯示追蹤看板中的貼文
    if (filter === "following") {
      if (!userId || !supabase) {
        // 如果沒有登入或 Supabase 未配置，返回空列表
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
      
      // 獲取用戶追蹤的看板
      const { data: followedBoards } = await supabase
        .from('BoardFollow')
        .select('boardId')
        .eq('userId', userId);

      if (followedBoards && followedBoards.length > 0) {
        const boardIds = followedBoards.map(b => b.boardId);
        // 獲取這些看板的貼文
        const { data: postBoardData } = await supabase
          .from('PostBoard')
          .select('postId')
          .in('boardId', boardIds);

        if (postBoardData && postBoardData.length > 0) {
          const postIds = postBoardData.map(p => p.postId);
          query = query.in('id', postIds);
        } else {
          // 沒有追蹤的看板，返回空列表
          return NextResponse.json({
            success: true,
            posts: [],
            nextCursor: null,
          });
        }
      } else {
        // 沒有追蹤的看板，返回空列表
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
    }

    // 如果指定了 boardId，只顯示該看板的貼文
    if (boardId) {
      const { data: postBoardData } = await supabase
        .from('PostBoard')
        .select('postId')
        .eq('boardId', boardId);

      if (postBoardData && postBoardData.length > 0) {
        const postIds = postBoardData.map(p => p.postId);
        query = query.in('id', postIds);
      } else {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
    }

    // 如果有 cursor，從該位置開始
    if (cursor) {
      const { data: cursorPost } = await supabase
        .from('Post')
        .select('createdAt')
        .eq('id', cursor)
        .single();

      if (cursorPost) {
        query = query.lt('createdAt', cursorPost.createdAt);
      }
    }

    let posts, error;
    try {
      const result = await query;
      posts = result.data;
      error = result.error;
    } catch (queryError: any) {
      console.error("Query error:", queryError);
      // 如果是表不存在的错误，返回空列表
      if (queryError.message?.includes('relation') || 
          queryError.message?.includes('does not exist') ||
          queryError.code === 'PGRST116' ||
          queryError.code === '42P01') {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
      // 其他错误也返回空列表，避免 500 错误
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    if (error) {
      console.error("Error fetching posts:", error);
      // 如果是表不存在的错误，返回空列表而不是错误
      if (error.code === 'PGRST116' || 
          error.code === '42P01' ||
          error.message?.includes('relation') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('Post') ||
          error.message?.includes('User')) {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
      // 其他错误也返回空列表，避免 500 错误
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    // 批量獲取互動數據
    const postIds = posts.map(p => p.id);
    
    // 獲取按讚數、轉發數、留言數（使用 try-catch 避免錯誤）
    let likesData = { data: [] };
    let repostsData = { data: [] };
    let commentsData = { data: [] };
    let userLikes = { data: [] };
    let userReposts = { data: [] };

    if (supabase && postIds.length > 0) {
      try {
        [likesData, repostsData, commentsData, userLikes, userReposts] = await Promise.all([
          supabase.from('Like').select('postId').in('postId', postIds).catch(() => ({ data: [] })),
          supabase.from('Repost').select('postId').in('postId', postIds).catch(() => ({ data: [] })),
          supabase.from('Comment').select('postId').in('postId', postIds).is('deletedAt', null).catch(() => ({ data: [] })),
          (userId) ? supabase.from('Like').select('postId').eq('userId', userId).in('postId', postIds).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          (userId) ? supabase.from('Repost').select('postId').eq('userId', userId).in('postId', postIds).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ]);
      } catch (err) {
        console.warn("Error fetching interaction data:", err);
        // 繼續執行，使用空數據
      }
    }

    // 計算統計數據
    const likeCounts = new Map<string, number>();
    const repostCounts = new Map<string, number>();
    const commentCounts = new Map<string, number>();
    const userLikedPostIds = new Set((userLikes.data || []).map(l => l.postId));
    const userRepostedPostIds = new Set((userReposts.data || []).map(r => r.postId));

    (likesData.data || []).forEach(like => {
      likeCounts.set(like.postId, (likeCounts.get(like.postId) || 0) + 1);
    });

    (repostsData.data || []).forEach(repost => {
      repostCounts.set(repost.postId, (repostCounts.get(repost.postId) || 0) + 1);
    });

    (commentsData.data || []).forEach(comment => {
      commentCounts.set(comment.postId, (commentCounts.get(comment.postId) || 0) + 1);
    });

    // 組合數據
    const postsWithStatus = posts.map((post: any) => ({
      ...post,
      isLiked: userId ? userLikedPostIds.has(post.id) : false,
      isReposted: userId ? userRepostedPostIds.has(post.id) : false,
      likeCount: likeCounts.get(post.id) || 0,
      repostCount: repostCounts.get(post.id) || 0,
      commentCount: commentCounts.get(post.id) || 0,
      schools: (post.schools || []).map((ps: any) => ps.school).filter(Boolean),
    }));

    const nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;

    return NextResponse.json({
      success: true,
      posts: postsWithStatus,
      nextCursor,
    });
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    // 任何錯誤都返回空列表，避免 500 錯誤
    // 這樣即使資料庫未設置，頁面也能正常顯示
    return NextResponse.json({
      success: true,
      posts: [],
      nextCursor: null,
    });
  }
}

