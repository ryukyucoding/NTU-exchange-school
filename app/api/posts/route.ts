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

    const { 
      title, 
      content, 
      status = 'published',
      hashtags = [],
      photos = [],
      schoolIds = [],
      countryId,
      ratings
    } = await req.json();

    // 驗證必填欄位
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    
    if (trimmedTitle.length === 0) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    // 驗證 status
    if (!['draft', 'published', 'deleted'].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'draft', 'published', or 'deleted'" },
        { status: 400 }
      );
    }

    // 驗證 ratings（如果是學校心得文）
    if (ratings && typeof ratings === 'object') {
      const { schoolId, livingConvenience, costOfLiving, courseLoading } = ratings;
      if (!schoolId) {
        return NextResponse.json(
          { error: "School ID is required when providing ratings" },
          { status: 400 }
        );
      }
      if (typeof livingConvenience !== 'number' || livingConvenience < 1 || livingConvenience > 5 ||
          typeof costOfLiving !== 'number' || costOfLiving < 1 || costOfLiving > 5 ||
          typeof courseLoading !== 'number' || courseLoading < 1 || courseLoading > 5) {
        return NextResponse.json(
          { error: "Ratings must be numbers between 1 and 5" },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseServer();

    // 建立貼文
    const postId = crypto.randomUUID();
    const { data: post, error: postError } = await supabase
      .from('Post')
      .insert({
        id: postId,
        title: trimmedTitle,
        content: trimmedContent,
        status: status,
        authorId: userId,
      } as any)
      .select()
      .single();

    if (postError) {
      console.error("Error creating post:", postError);
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    }

    // 建立 Hashtag 記錄
    if (hashtags && Array.isArray(hashtags) && hashtags.length > 0) {
      const hashtagInserts = hashtags
        .filter((tag: string) => tag && typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => ({
          postId: postId,
          content: tag.trim(),
        }));

      if (hashtagInserts.length > 0) {
        const { error: hashtagError } = await supabase
          .from('Hashtag')
          .insert(hashtagInserts as any);

        if (hashtagError) {
          console.error("Error creating hashtags:", hashtagError);
          // 不影響貼文建立，只記錄錯誤
        }
      }
    }

    // 建立 PostPhoto 記錄
    if (photos && Array.isArray(photos) && photos.length > 0) {
      const photoInserts = photos
        .filter((photo: any) => photo && photo.url && photo.photoId)
        .map((photo: any, index: number) => ({
          id: crypto.randomUUID(),
          postId: postId,
          url: photo.url,
          photoId: photo.photoId,
          order: photo.order !== undefined ? photo.order : index,
          alt: photo.alt || '',
        }));

      if (photoInserts.length > 0) {
        const { error: photoError } = await supabase
          .from('PostPhoto')
          .insert(photoInserts as any);

        if (photoError) {
          console.error("Error creating post photos:", photoError);
          // 不影響貼文建立，只記錄錯誤
        }
      }
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
        .insert(postSchoolInserts as any);

      if (relationError) {
        console.error("Error creating post-school relations:", relationError);
        // 不影響貼文建立，只記錄錯誤
      }
    }

    // 如果是學校心得文，建立 SchoolRating 記錄
    if (ratings && typeof ratings === 'object') {
      const { schoolId, livingConvenience, costOfLiving, courseLoading } = ratings;
      if (schoolId) {
        const { error: ratingError } = await supabase
          .from('SchoolRating')
          .insert({
            postId: postId,
            schoolId: schoolId,
            livingConvenience: livingConvenience,
            costOfLiving: costOfLiving,
            courseLoading: courseLoading,
          } as any);

        if (ratingError) {
          console.error("Error creating school rating:", ratingError);
          // 不影響貼文建立，只記錄錯誤
        }
      }
    }

    // 處理看板：根據 countryId 或 schoolIds 建立看板關聯
    const boardIds: string[] = [];
    
    // 如果有 countryId，建立或查找國家看板
    if (countryId) {
      // 查找或創建國家看板
      const { data: existingCountryBoard } = await supabase
        .from('Board')
        .select('id')
        .eq('country_id', countryId)
        .is('schoolId', null)
        .eq('type', 'country')
        .limit(1)
        .maybeSingle();
      
      if (existingCountryBoard) {
        boardIds.push(existingCountryBoard.id);
      } else {
        // 創建新的國家看板（需要先查詢國家名稱，這裡簡化處理）
        const boardId = crypto.randomUUID();
        const slug = `country-${countryId}`.toLowerCase();
        const { error: boardError } = await supabase
          .from('Board')
          .insert({
            id: boardId,
            type: 'country',
            name: countryId, // 可以後續改進為實際國家名稱
            slug: slug,
            country_id: countryId,
            schoolId: null,
            description: null,
          } as any);
        
        if (!boardError) {
          boardIds.push(boardId);
        } else {
          console.error("Error creating country board:", boardError);
        }
      }
    }
    
    // 如果有 schoolIds，建立或查找學校看板
    if (schoolIds && Array.isArray(schoolIds) && schoolIds.length > 0) {
      for (const schoolId of schoolIds) {
        // 查找或創建學校看板
        const { data: existingSchoolBoard } = await supabase
          .from('Board')
          .select('id')
          .eq('schoolId', schoolId)
          .eq('type', 'school')
          .limit(1)
          .maybeSingle();
        
        if (existingSchoolBoard) {
          boardIds.push(existingSchoolBoard.id);
        } else {
          // 創建新的學校看板
          const boardId = crypto.randomUUID();
          const slug = `school-${schoolId}`.toLowerCase();
          const { error: boardError } = await supabase
            .from('Board')
            .insert({
              id: boardId,
              type: 'school',
              name: schoolId, // 可以後續改進為實際學校名稱
              slug: slug,
              country_id: null,
              schoolId: schoolId,
              description: null,
            } as any);
          
          if (!boardError) {
            boardIds.push(boardId);
          } else {
            console.error("Error creating school board:", boardError);
          }
        }
      }
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
        .insert(postBoardInserts as any);
      
      if (postBoardError) {
        console.error("Error creating post-board relations:", postBoardError);
        // 不影響貼文建立，只記錄錯誤
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
 *   - sort: "latest" | "popular" (default: "latest")
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
    const hashtag = searchParams.get("hashtag");
    const schoolId = searchParams.get("schoolId");
    const sort = (searchParams.get("sort") || "latest") as "latest" | "popular";
    const filterType = searchParams.get("filterType"); // "rating" for rating posts only

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
          title,
          content,
          createdAt,
          author:User!Post_authorId_fkey (
            id,
            name,
            userID,
            image,
            email
          )
        )
      `)
      .is('deletedAt', null)
      .eq('status', 'published')
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

    // 收集所有過濾條件下的 postIds，然後取交集
    let filterPostIds: string[] | null = null;

    // 如果指定了 boardId，只顯示該看板的貼文
    if (boardId) {
      const { data: postBoardData } = await supabase
        .from('PostBoard')
        .select('postId')
        .eq('boardId', boardId);

      if (postBoardData && postBoardData.length > 0) {
        const postIds = postBoardData.map(p => p.postId);
        if (filterPostIds === null) {
          filterPostIds = postIds;
        } else {
          filterPostIds = filterPostIds.filter(id => postIds.includes(id));
        }
      } else {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
    }

    // 如果指定了 hashtag，只顯示包含該 hashtag 的貼文
    if (hashtag) {
      const { data: hashtagData } = await supabase
        .from('Hashtag')
        .select('postId')
        .eq('content', hashtag);

      if (hashtagData && hashtagData.length > 0) {
        const postIds = hashtagData.map(h => h.postId);
        if (filterPostIds === null) {
          filterPostIds = postIds;
        } else {
          filterPostIds = filterPostIds.filter(id => postIds.includes(id));
        }
      } else {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
    }

    // 如果指定了 schoolId，只顯示與該學校相關的貼文
    if (schoolId) {
      const { data: postSchoolData } = await supabase
        .from('PostSchool')
        .select('postId')
        .eq('schoolId', schoolId);

      if (postSchoolData && postSchoolData.length > 0) {
        const postIds = postSchoolData.map(ps => ps.postId);
        if (filterPostIds === null) {
          filterPostIds = postIds;
        } else {
          filterPostIds = filterPostIds.filter(id => postIds.includes(id));
        }
      } else {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
    }

    // 如果指定了 filterType="rating"，只顯示有評分的貼文
    if (filterType === 'rating') {
      const { data: ratingData } = await supabase
        .from('SchoolRating')
        .select('postId');

      if (ratingData && ratingData.length > 0) {
        const ratingPostIds = ratingData.map(r => r.postId);
        if (filterPostIds === null) {
          filterPostIds = ratingPostIds;
        } else {
          filterPostIds = filterPostIds.filter(id => ratingPostIds.includes(id));
        }
      } else {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
    }

    // 如果有過濾條件，應用過濾
    if (filterPostIds !== null && filterPostIds.length > 0) {
      query = query.in('id', filterPostIds);
    } else if (filterPostIds !== null && filterPostIds.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    // 如果有 cursor，從該位置開始
    if (cursor && sort === "latest") {
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

    // 批量獲取互動數據和相關數據
    const postIds = posts.map(p => p.id);
    
    // 獲取按讚數、轉發數、留言數、hashtags、photos、schools、ratings（使用 try-catch 避免錯誤）
    let likesData = { data: [] };
    let repostsData = { data: [] };
    let commentsData = { data: [] };
    let userLikes = { data: [] };
    let userReposts = { data: [] };
    let hashtagsData = { data: [] };
    let photosData = { data: [] };
    let schoolsData = { data: [] };
    let ratingsData = { data: [] };

    if (supabase && postIds.length > 0) {
      try {
        [
          likesData, 
          repostsData, 
          commentsData, 
          userLikes, 
          userReposts,
          hashtagsData,
          photosData,
          schoolsData,
          ratingsData
        ] = await Promise.all([
          supabase.from('Like').select('postId').in('postId', postIds).catch(() => ({ data: [] })),
          supabase.from('Repost').select('postId').in('postId', postIds).catch(() => ({ data: [] })),
          supabase.from('Comment').select('postId').in('postId', postIds).is('deletedAt', null).catch(() => ({ data: [] })),
          (userId) ? supabase.from('Like').select('postId').eq('userId', userId).in('postId', postIds).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          (userId) ? supabase.from('Repost').select('postId').eq('userId', userId).in('postId', postIds).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          supabase.from('Hashtag').select('postId, content').in('postId', postIds).catch(() => ({ data: [] })),
          supabase.from('PostPhoto').select('*').in('postId', postIds).catch(() => ({ data: [] })),
          supabase.from('PostSchool').select('postId, school:schools!PostSchool_schoolId_fkey(id, name_zh, name_en, country)').in('postId', postIds).catch(() => ({ data: [] })),
          supabase.from('SchoolRating').select('*').in('postId', postIds).catch(() => ({ data: [] })),
        ]);
      } catch (err) {
        console.warn("Error fetching related data:", err);
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

    // 組織相關數據
    const hashtagsByPostId = new Map<string, string[]>();
    const photosByPostId = new Map<string, any[]>();
    const schoolsByPostId = new Map<string, any[]>();
    const ratingsByPostId = new Map<string, any>();

    (hashtagsData.data || []).forEach((h: any) => {
      if (!hashtagsByPostId.has(h.postId)) {
        hashtagsByPostId.set(h.postId, []);
      }
      hashtagsByPostId.get(h.postId)!.push(h.content);
    });

    (photosData.data || []).forEach((photo: any) => {
      if (!photosByPostId.has(photo.postId)) {
        photosByPostId.set(photo.postId, []);
      }
      photosByPostId.get(photo.postId)!.push(photo);
    });

    (schoolsData.data || []).forEach((ps: any) => {
      if (!schoolsByPostId.has(ps.postId)) {
        schoolsByPostId.set(ps.postId, []);
      }
      if (ps.school) {
        schoolsByPostId.get(ps.postId)!.push(ps.school);
      }
    });

    (ratingsData.data || []).forEach((rating: any) => {
      ratingsByPostId.set(rating.postId, rating);
    });

    // 組合數據
    const postsWithStatus = posts.map((post: any) => {
      const ratings = ratingsByPostId.get(post.id);
      return {
        ...post,
        isLiked: userId ? userLikedPostIds.has(post.id) : false,
        isReposted: userId ? userRepostedPostIds.has(post.id) : false,
        likeCount: likeCounts.get(post.id) || 0,
        repostCount: repostCounts.get(post.id) || 0,
        commentCount: commentCounts.get(post.id) || 0,
        schools: schoolsByPostId.get(post.id) || [],
        hashtags: hashtagsByPostId.get(post.id) || [],
        photos: (photosByPostId.get(post.id) || []).sort((a: any, b: any) => a.order - b.order),
        ratings: ratings || null,
        postType: ratings ? 'review' : 'general',
      };
    });

    // 熱門排序：先用互動數排序，暫時不提供 cursor 分頁（避免排序後 cursor 失真）
    let finalPosts = postsWithStatus;
    let nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;

    if (sort === "popular") {
      finalPosts = [...postsWithStatus].sort((a: any, b: any) => {
        const aScore = (a.likeCount || 0) + (a.commentCount || 0) + (a.repostCount || 0);
        const bScore = (b.likeCount || 0) + (b.commentCount || 0) + (b.repostCount || 0);
        if (bScore !== aScore) return bScore - aScore;
        // 分數相同時，以時間新舊做次排序
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      nextCursor = null;
    }

    return NextResponse.json({
      success: true,
      posts: finalPosts,
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

