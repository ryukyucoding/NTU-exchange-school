import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

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
    const userId = (session.user as { id: string }).id;
    const userEmail = session.user.email;
    const userName = session.user.name;
    const userImage = (session.user as { image?: string }).image;
    
    if (!userId) {
      return NextResponse.json(
        { error: "無法獲取用戶ID" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServer();
    
    // 確保用戶存在於資料庫中
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingUser } = await (supabase as any)
      .from('User')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (!existingUser) {
      // 用戶不存在，創建用戶
      console.log(`[POST /api/posts] 用戶不存在，創建新用戶: ${userId}`);
      
      // 生成唯一的 userID
      let userID = userEmail ? userEmail.split('@')[0] : userId.substring(0, 8);
      
      // 檢查 userID 是否已存在
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingUserID } = await (supabase as any)
        .from('User')
        .select('userID')
        .eq('userID', userID)
        .maybeSingle();
      
      if (existingUserID) {
        userID = `${userID}_${Math.random().toString(36).substring(2, 8)}`;
      }
      
      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: createUserError } = await (supabase as any)
        .from('User')
        .insert({
          id: userId,
          userID: userID,
          name: userName || null,
          email: userEmail || null,
          emailVerified: now,
          image: userImage || null,
          createdAt: now,
          updatedAt: now,
        });
      
      if (createUserError) {
        console.error("Error creating user:", createUserError);
        return NextResponse.json(
          { error: "無法創建用戶資料" },
          { status: 500 }
        );
      }
      
      console.log(`[POST /api/posts] 用戶創建成功: ${userId}`);
    }

    const {
      postId: providedPostId, // 如果提供，則更新現有 post
      title,
      content,
      status = 'published',
      type, // 'general' 或 'review'，決定貼文類型
      hashtags = [],
      photos = [],
      schoolIds = [],
      countryIds = [], // 國家 ID 陣列（優先使用）
      countryNames = [], // 國家名稱陣列（向後兼容，會轉換為 countryIds）
      ratings
    } = await req.json();

    // 驗證必填欄位（草稿允許空標題和內容）
    if (status !== 'draft') {
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
    }

    const trimmedTitle = (title || '').trim() || '未命名草稿';
    const trimmedContent = (content || '').trim();
    
    if (status !== 'draft' && trimmedTitle.length === 0) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    if (status !== 'draft' && trimmedContent.length === 0) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    // 如果提供了 postId，檢查該 post 是否存在且屬於當前用戶
    let postId = providedPostId;
    let isUpdate = false;
    if (postId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingPost, error: fetchError } = await (supabase as any)
        .from('Post')
        .select('id, authorId')
        .eq('id', postId)
        .eq('authorId', userId)
        .maybeSingle();
      
      if (fetchError || !existingPost) {
        return NextResponse.json(
          { error: "Post not found or unauthorized" },
          { status: 404 }
        );
      }
      isUpdate = true;
    } else {
      postId = crypto.randomUUID();
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
          typeof costOfLiving !== 'number' || costOfLiving < 1 || costOfLiving > 3 ||
          typeof courseLoading !== 'number' || courseLoading < 1 || courseLoading > 5) {
        return NextResponse.json(
          { error: "Ratings must be numbers (livingConvenience, courseLoading 1-5, costOfLiving 1-3)" },
          { status: 400 }
        );
      }
    }

    // 決定貼文類型：根據 type 參數（'general' -> 'normal', 'review' -> 'rating'）
    // 如果沒有提供 type，則根據是否有 ratings 來判斷（向後兼容）
    let postType: 'normal' | 'rating';
    if (type === 'review') {
      postType = 'rating';
    } else if (type === 'general') {
      postType = 'normal';
    } else {
      // 向後兼容：根據是否有 ratings 來決定
      postType = (ratings && typeof ratings === 'object' && ratings.schoolId) ? 'rating' : 'normal';
    }

    // 建立或更新貼文
    if (isUpdate) {
      // 更新現有 post
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: _updatedPost, error: updateError } = await (supabase as any)
        .from('Post')
        .update({
          title: trimmedTitle,
          content: trimmedContent,
          status: status,
          type: postType,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', postId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating post:", updateError);
        return NextResponse.json(
          { error: "Failed to update post" },
          { status: 500 }
        );
      }

      // 刪除舊的關聯資料
      await Promise.all([
        supabase.from('Hashtag').delete().eq('postId', postId),
        supabase.from('PostPhoto').delete().eq('postId', postId),
        supabase.from('SchoolRating').delete().eq('postId', postId),
        supabase.from('PostBoard').delete().eq('postId', postId),
      ]);
    } else {
      // 創建新 post
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: _newPost, error: postError } = await (supabase as any)
        .from('Post')
        .insert({
          id: postId,
          title: trimmedTitle,
          content: trimmedContent,
          status: status,
          type: postType,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: hashtagError } = await (supabase as any)
          .from('Hashtag')
          .insert(hashtagInserts);

        if (hashtagError) {
          console.error("Error creating hashtags:", hashtagError);
          // 不影響貼文建立，只記錄錯誤
        }
      }
    }

    // 建立 PostPhoto 記錄
    if (photos && Array.isArray(photos) && photos.length > 0) {
      const photoInserts = photos
        .filter((photo: { url: string; photoId: string }) => photo && photo.url && photo.photoId)
        .map((photo: { url: string; photoId: string; order?: number; alt?: string }, index: number) => ({
          id: crypto.randomUUID(),
          postId: postId,
          url: photo.url,
          photoId: photo.photoId,
          order: photo.order !== undefined ? photo.order : index,
          alt: photo.alt || '',
        }));

      if (photoInserts.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: photoError } = await (supabase as any)
          .from('PostPhoto')
          .insert(photoInserts);

        if (photoError) {
          console.error("Error creating post photos:", photoError);
          // 不影響貼文建立，只記錄錯誤
        }
      }
    }

    // 如果是學校心得文，建立 SchoolRating 記錄
    if (ratings && typeof ratings === 'object') {
      const { schoolId, livingConvenience, costOfLiving, courseLoading } = ratings;
      if (schoolId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: ratingError } = await (supabase as any)
          .from('SchoolRating')
          .insert({
            postId: postId,
            schoolId: schoolId,
            livingConvenience: livingConvenience,
            costOfLiving: costOfLiving,
            courseLoading: courseLoading,
          });

        if (ratingError) {
          console.error("Error creating school rating:", ratingError);
          // 不影響貼文建立，只記錄錯誤
        }
      }
    }

    // 處理看板：根據 countryIds 和 schoolIds 建立 PostBoard 關聯
    const boardIds: string[] = [];
    
    // 1. 處理國家看板（根據 countryIds 查找國家版，schoolId 為 null）
    // 如果提供了 countryIds，直接使用；否則嘗試從 countryNames 轉換
    let finalCountryIds: (string | number)[] = [];
    
    if (countryIds && Array.isArray(countryIds) && countryIds.length > 0) {
      // 優先使用 countryIds
      finalCountryIds = countryIds.filter(id => id !== null && id !== undefined);
    } else if (countryNames && Array.isArray(countryNames) && countryNames.length > 0) {
      // 向後兼容：從 countryNames 轉換為 countryIds
      console.log(`[POST /api/posts] 使用 countryNames 轉換為 countryIds: ${countryNames.join(', ')}`);
      for (const countryName of countryNames) {
        if (!countryName || typeof countryName !== 'string') continue;
        
        try {
          // 通過 Country 表查找 country_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: countryData } = await (supabase as any)
              .from('Country')
              .select('id')
            .or(`country_zh.eq.${countryName},country_en.eq.${countryName}`)
              .maybeSingle();
            
          if (countryData && countryData.id) {
            finalCountryIds.push(countryData.id);
          } else {
            console.log(`[POST /api/posts] 未找到國家 ID (通過 countryName): ${countryName}`);
          }
        } catch (_e) {
          console.log(`[POST /api/posts] 查詢 Country 表失敗: ${countryName}`);
        }
      }
    }
    
    // 使用 countryIds 查找國家看板
    if (finalCountryIds.length > 0) {
      for (const countryId of finalCountryIds) {
        if (!countryId) continue;
        
        // 通過 country_id 查找 Board（schoolId 為 null）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: countryBoard } = await (supabase as any)
                .from('Board')
                .select('id')
                .is('schoolId', null)
          .eq('country_id', countryId)
                .limit(1)
                .maybeSingle();
              
              if (countryBoard) {
                boardIds.push(countryBoard.id);
              } else {
          console.log(`[POST /api/posts] 未找到國家版 (country_id=${countryId})`);
        }
      }
    }
    
    // 2. 處理學校看板（根據 schoolIds 查找學校版，有 schoolId）
    if (schoolIds && Array.isArray(schoolIds) && schoolIds.length > 0) {
      for (const schoolId of schoolIds) {
        if (!schoolId || typeof schoolId !== 'string') continue;
        
        // 查找學校版 Board（有 schoolId）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: schoolBoard } = await (supabase as any)
          .from('Board')
          .select('id')
          .eq('schoolId', schoolId)
          .not('schoolId', 'is', null)
          .limit(1)
          .maybeSingle();
        
        if (schoolBoard) {
          boardIds.push(schoolBoard.id);
        } else {
          // 如果學校版不存在，嘗試創建
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: schoolInfo } = await (supabase as any)
            .from('schools')
            .select('name_zh, country')
            .eq('id', schoolId)
            .maybeSingle();
          
          if (schoolInfo) {
            const boardId = crypto.randomUUID();
            const slug = `school-${schoolId}`.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: boardError } = await (supabase as any)
              .from('Board')
              .insert({
                id: boardId,
                type: 'school',
                name: schoolInfo.name_zh || schoolId,
                slug: slug,
                country_id: null,
                schoolId: schoolId,
                description: null,
              });
            
            if (!boardError) {
              boardIds.push(boardId);
            } else {
              console.error("Error creating school board:", boardError);
            }
          } else {
            console.log(`[POST /api/posts] 未找到學校: ${schoolId}`);
          }
        }
      }
    }
    
    // 3. 建立 PostBoard 關聯（去重，避免重複）
    const uniqueBoardIds = [...new Set(boardIds)];
    if (uniqueBoardIds.length > 0) {
      const postBoardInserts = uniqueBoardIds.map((boardId: string) => ({
        id: crypto.randomUUID(),
        postId: postId,
        boardId: boardId,
      }));
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: postBoardError } = await (supabase as any)
        .from('PostBoard')
        .insert(postBoardInserts);
      
      if (postBoardError) {
        console.error("Error creating post-board relations:", postBoardError);
        // 不影響貼文建立，只記錄錯誤
      } else {
        console.log(`[POST /api/posts] 成功建立 ${postBoardInserts.length} 個 PostBoard 關聯`);
      }
    }

    // 獲取完整的貼文資料（包含作者資訊）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fullPost, error: fetchError } = await (supabase as any)
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
  } catch (error: unknown) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
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
    // 獲取登入 session
    const session = await auth();
    const userId = session?.user ? (session.user as { id: string }).id : null;

    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get("filter") || "all";
    const limit = parseInt(searchParams.get("limit") || "10");
    const cursor = searchParams.get("cursor");
    const boardId = searchParams.get("boardId");
    const hashtag = searchParams.get("hashtag");
    const schoolId = searchParams.get("schoolId");
    const authorId = searchParams.get("authorId"); // Filter by author
    const sort = (searchParams.get("sort") || "latest") as "latest" | "popular";
    const filterType = searchParams.get("filterType"); // "rating" for rating posts only
    const type = searchParams.get("type"); // 'general' or 'review'

    console.log('[GET /api/posts] 請求參數:', {
      filter,
      limit,
      cursor,
      boardId,
      hashtag,
      schoolId,
      sort,
      filterType,
      type,
      userId: userId ? '有' : '無',
    });

    const supabase = getSupabaseServer();
    
    // 如果 Supabase 未配置，返回空列表
    if (!supabase) {
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    // 收集所有過濾條件下的 postIds，然後取交集
    let filterPostIds: string[] | null = null;

    // 如果指定了 boardId，先驗證 board 是否存在，然後通過 PostBoard 表查詢
    if (boardId) {
      console.log('[GET /api/posts] 查詢 boardId:', boardId);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: boardData, error: boardError } = await (supabase as any)
        .from('Board')
        .select('id')
        .eq('id', boardId)
        .maybeSingle();

      console.log('[GET /api/posts] Board 查詢結果:', {
        boardData,
        boardError: boardError ? { message: boardError.message, code: boardError.code } : null,
      });

      if (boardError || !boardData) {
        console.log('[GET /api/posts] Board 不存在或查詢失敗，返回空列表');
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }

      // 通過 PostBoard 表查詢該看板的貼文
      console.log('[GET /api/posts] 🔍 開始查詢 PostBoard，boardId:', boardId, '類型:', typeof boardId);
      
      // 先查詢所有PostBoard數據看看有什麼
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allPostBoardData, error: allPostBoardError } = await (supabase as any)
        .from('PostBoard')
        .select('*')
        .limit(10);
      
      console.log('[GET /api/posts] 📋 PostBoard 表所有數據（前10筆）:', {
        count: allPostBoardData?.length || 0,
        error: allPostBoardError ? { message: allPostBoardError.message, code: allPostBoardError.code } : null,
        sampleData: allPostBoardData?.slice(0, 5).map((p: { id: string; postId: string; boardId: string }) => ({
          id: p.id,
          postId: p.postId,
          boardId: p.boardId,
          boardIdType: typeof p.boardId,
        })) || [],
      });
      
      // 查詢特定boardId的PostBoard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: postBoardData, error: postBoardError } = await (supabase as any)
        .from('PostBoard')
        .select('*')
        .eq('boardId', boardId);

      console.log('[GET /api/posts] 🔍 PostBoard 查詢結果（boardId=' + boardId + '）:', {
        postBoardDataCount: postBoardData?.length || 0,
        postBoardError: postBoardError ? { 
          message: postBoardError.message, 
          code: postBoardError.code,
          details: postBoardError.details,
          hint: postBoardError.hint,
        } : null,
        postBoardData: postBoardData || [],
        samplePostIds: postBoardData?.slice(0, 5).map((p: { postId: string }) => p.postId) || [],
      });

      if (postBoardError) {
        console.error('[GET /api/posts] ❌ PostBoard 查詢錯誤:', {
          error: postBoardError,
          message: postBoardError.message,
          code: postBoardError.code,
          details: postBoardError.details,
          hint: postBoardError.hint,
        });
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }

      if (!postBoardData || postBoardData.length === 0) {
        console.log('[GET /api/posts] ⚠️ PostBoard 沒有數據（查詢成功但結果為空）', {
          boardId,
          boardIdType: typeof boardId,
          queryResult: postBoardData,
        });
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }

      const postIds = (postBoardData as { postId: string }[]).map((p) => p.postId);
      filterPostIds = postIds;
      console.log('[GET /api/posts] ✅ 成功從 PostBoard 獲取 postIds:', {
        count: postIds.length,
        sampleIds: postIds.slice(0, 5),
        allPostIds: postIds,
      });
    } else {
      console.log('[GET /api/posts] 沒有 boardId，將查詢所有 Posts');
    }

    // 如果是草稿查詢，只返回當前用戶的草稿
    if (filter === "drafts") {
      if (!userId) {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const draftQuery = (supabase as any)
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
        .eq('authorId', userId)
        .eq('status', 'draft')
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
        .limit(limit);

      const { data: drafts, error: draftError } = await draftQuery;

      if (draftError) {
        console.error("Error fetching drafts:", draftError);
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }

      if (!drafts || drafts.length === 0) {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }

      // 如果是review類型，只返回有評分的貼文；如果是general類型，只返回沒有評分的貼文
      const postIds = (drafts as { id: string }[]).map((d) => d.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ratingsData } = await (supabase as any)
        .from('SchoolRating')
        .select('postId')
        .in('postId', postIds)
        .catch(() => ({ data: [] }));

      const ratedPostIds = new Set((ratingsData || []).map((r: { postId: string }) => r.postId));

      let filteredDrafts = drafts;
      if (type === 'review') {
        filteredDrafts = (drafts as { id: string }[]).filter((d) => ratedPostIds.has(d.id));
      } else if (type === 'general') {
        filteredDrafts = (drafts as { id: string }[]).filter((d) => !ratedPostIds.has(d.id));
      }

      return NextResponse.json({
        success: true,
        posts: filteredDrafts.map((post: { id: string }) => ({
          ...post,
          type: ratedPostIds.has(post.id) ? 'review' : 'general',
        })),
        nextCursor: null,
      });
    }

    // 如果沒有 boardId，查詢所有 Posts（社群主頁）
    console.log('[GET /api/posts] 開始構建查詢，沒有 boardId，查詢所有 Posts');
    
    // 🔍 先檢查 Post 表中的所有數據（用於調試）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allPostsDebug, error: allPostsDebugError } = await (supabase as any)
      .from('Post')
      .select('id, title, status, deletedAt, createdAt, authorId')
      .limit(20);
    
    console.log('[GET /api/posts] 🔍 Post 表所有數據（前20筆，用於調試）:', {
      count: allPostsDebug?.length || 0,
      error: allPostsDebugError ? { message: allPostsDebugError.message, code: allPostsDebugError.code } : null,
      posts: allPostsDebug?.map((p: { id: string; title: string; status: string; deletedAt: string | null; createdAt: string }) => ({
        id: p.id,
        title: p.title?.substring(0, 30) || '(無標題)',
        status: p.status,
        deletedAt: p.deletedAt,
        createdAt: p.createdAt,
      })) || [],
      publishedCount: allPostsDebug?.filter((p: { status: string; deletedAt: string | null }) => 
        p.status === 'published' && !p.deletedAt
      ).length || 0,
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
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
      .is('deletedAt', null)
      .eq('status', 'published');
    
    // Filter by authorId if provided
    if (authorId) {
      query = query.eq('authorId', authorId);
    }
    
    query = query.order('createdAt', { ascending: false }).limit(limit);
    
    console.log('[GET /api/posts] 基礎查詢已構建:', {
      table: 'Post',
      filters: {
        deletedAt: 'is null',
        status: 'published',
        authorId: authorId || 'all',
      },
      orderBy: 'createdAt DESC',
      limit,
    });

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: followedBoards } = await (supabase as any)
        .from('BoardFollow')
        .select('boardId')
        .eq('userId', userId);

      if (followedBoards && followedBoards.length > 0) {
        const boardIds = (followedBoards as { boardId: string }[]).map((b) => b.boardId);
        // 獲取這些看板的貼文
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: postBoardData } = await (supabase as any)
          .from('PostBoard')
          .select('postId')
          .in('boardId', boardIds);

        if (postBoardData && postBoardData.length > 0) {
          const postIds = (postBoardData as { postId: string }[]).map((p) => p.postId);
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
    // 注意：如果已經有 boardId 過濾，filterPostIds 已經在上面設置了

    // 如果指定了 hashtag，只顯示包含該 hashtag 的貼文
    if (hashtag) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: hashtagData } = await (supabase as any)
        .from('Hashtag')
        .select('postId')
        .eq('content', hashtag);

      if (hashtagData && hashtagData.length > 0) {
        const postIds = (hashtagData as { postId: string }[]).map((h) => h.postId);
        if (filterPostIds === null) {
          filterPostIds = postIds;
        } else {
          filterPostIds = (filterPostIds as string[]).filter((id) => postIds.includes(id));
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: postSchoolData } = await (supabase as any)
        .from('PostSchool')
        .select('postId')
        .eq('schoolId', schoolId);

      if (postSchoolData && postSchoolData.length > 0) {
        const postIds = (postSchoolData as { postId: string }[]).map((ps) => ps.postId);
        if (filterPostIds === null) {
          filterPostIds = postIds;
        } else {
          filterPostIds = (filterPostIds as string[]).filter((id) => postIds.includes(id));
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ratingData } = await (supabase as any)
        .from('SchoolRating')
        .select('postId');

      if (ratingData && ratingData.length > 0) {
        const ratingPostIds = (ratingData as { postId: string }[]).map((r) => r.postId);
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
    console.log('[GET /api/posts] 應用過濾條件:', {
      filterPostIds: filterPostIds ? { count: filterPostIds.length, sampleIds: filterPostIds.slice(0, 5) } : null,
      filterPostIdsIsNull: filterPostIds === null,
    });

    if (filterPostIds !== null && filterPostIds.length > 0) {
      // 先檢查這些postId是否真的存在於Post表中，以及它們的狀態
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: postCheckData, error: postCheckError } = await (supabase as any)
        .from('Post')
        .select('id, status, deletedAt')
        .in('id', filterPostIds);
      
      console.log('[GET /api/posts] 🔍 檢查 filterPostIds 對應的 Post 記錄:', {
        requestedPostIds: filterPostIds,
        foundPosts: postCheckData?.length || 0,
        foundPostIds: postCheckData?.map((p: { id: string; status: string; deletedAt: string | null }) => ({
          id: p.id,
          status: p.status,
          deletedAt: p.deletedAt,
        })) || [],
        publishedPosts: postCheckData?.filter((p: { status: string; deletedAt: string | null }) => 
          p.status === 'published' && !p.deletedAt
        ).length || 0,
        error: postCheckError ? { message: postCheckError.message, code: postCheckError.code } : null,
      });
      
      query = query.in('id', filterPostIds);
      console.log('[GET /api/posts] ✅ 已應用 filterPostIds 過濾，將查詢', filterPostIds.length, '個貼文');
    } else if (filterPostIds !== null && filterPostIds.length === 0) {
      console.log('[GET /api/posts] ⚠️ filterPostIds 為空數組，返回空列表');
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    } else {
      console.log('[GET /api/posts] ✅ 沒有過濾條件，將查詢所有已發布的 Posts');
    }

    // 如果有 cursor，從該位置開始
    if (cursor && sort === "latest") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cursorPost } = await (supabase as any)
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
      console.log('[GET /api/posts] 🔍 執行查詢...');
      console.log('[GET /api/posts] 查詢對象類型:', typeof query);
      const result = await query;
      posts = result.data;
      error = result.error;
      
      console.log('[GET /api/posts] 📊 查詢結果:', {
        postsCount: posts?.length || 0,
        postsIsArray: Array.isArray(posts),
        postsIsNull: posts === null,
        postsIsUndefined: posts === undefined,
        error: error ? { 
          message: error.message, 
          code: error.code,
          details: error.details,
          hint: error.hint,
        } : null,
        samplePostIds: posts?.slice(0, 3).map((p: { id: string }) => p.id) || [],
        samplePost: posts?.[0] ? {
          id: posts[0].id,
          title: posts[0].title,
          status: posts[0].status,
          type: posts[0].type,
          hasAuthor: !!posts[0].author,
        } : null,
      });
    } catch (queryError: unknown) {
      console.error("Query error:", queryError);
      // 如果是表不存在的错误，返回空列表
      const errorMessage = queryError instanceof Error ? queryError.message : '';
      const errorCode = (queryError && typeof queryError === 'object' && 'code' in queryError) ? (queryError as { code: string }).code : '';
      if (errorMessage?.includes('relation') ||
          errorMessage?.includes('does not exist') ||
          errorCode === 'PGRST116' ||
          errorCode === '42P01') {
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
      console.log('[GET /api/posts] ⚠️ 查詢結果為空，返回空列表', {
        posts: posts,
        postsLength: posts?.length || 0,
        postsIsNull: posts === null,
        postsIsUndefined: posts === undefined,
        queryApplied: {
          hasFilterPostIds: filterPostIds !== null,
          filterPostIdsCount: filterPostIds?.length || 0,
          hasBoardId: !!boardId,
          hasHashtag: !!hashtag,
          hasSchoolId: !!schoolId,
          filterType,
          filter,
        },
      });
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    console.log('[GET /api/posts] 查詢到貼文:', {
      count: posts.length,
      samplePosts: posts.slice(0, 3).map((p: { id: string; title: string; type?: string }) => ({
        id: p.id,
        title: p.title,
        type: p.type,
      })),
    });

    // 批量獲取互動數據和相關數據
    const postIds = (posts as { id: string }[]).map((p) => p.id);
    
    // 獲取按讚數、轉發數、留言數、hashtags、photos、schools、ratings（使用 try-catch 避免錯誤）
    let likesData = { data: [] };
    let repostsData = { data: [] }; // 現在是 Post 記錄，其中 repostId 指向原始貼文
    let commentsData = { data: [] };
    let userLikes = { data: [] };
    let userReposts = { data: [] }; // 用戶轉發的 Post 記錄
    let hashtagsData = { data: [] };
    let photosData = { data: [] };
    let schoolsData = { data: [] };
    let ratingsData = { data: [] };

    if (supabase && postIds.length > 0) {
      try {
        console.log('[GET /api/posts] 🔍 開始批量查詢相關數據，postIds:', postIds);
        
        // 使用 Promise.allSettled 來處理錯誤，避免一個失敗影響其他查詢
        const results = await Promise.allSettled([
          (supabase as any).from('Like').select('postId').in('postId', postIds).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] Like 查詢失敗:', e);
            return { data: [], error: e };
          }),
          (supabase as any).from('Post').select('repostId').in('repostId', postIds).eq('status', 'published').not('repostId', 'is', null).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] Repost 查詢失敗:', e);
            return { data: [], error: e };
          }),
          (supabase as any).from('Comment').select('postId').in('postId', postIds).is('deletedAt', null).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] Comment 查詢失敗:', e);
            return { data: [], error: e };
          }),
          (userId) ? (supabase as any).from('Like').select('postId').eq('userId', userId).in('postId', postIds).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] UserLike 查詢失敗:', e);
            return { data: [], error: e };
          }) : Promise.resolve({ data: [] }),
          (userId) ? (supabase as any).from('Post').select('repostId').eq('authorId', userId).in('repostId', postIds).eq('status', 'published').not('repostId', 'is', null).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] UserRepost 查詢失敗:', e);
            return { data: [], error: e };
          }) : Promise.resolve({ data: [] }),
          (supabase as any).from('Hashtag').select('postId, content').in('postId', postIds).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] Hashtag 查詢失敗:', e);
            return { data: [], error: e };
          }),
          (supabase as any).from('PostPhoto').select('*').in('postId', postIds).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] PostPhoto 查詢失敗:', e);
            return { data: [], error: e };
          }),
          // 從 PostBoard -> Board 獲取版名（name）和類型（type）
          // 統一邏輯：通過 PostBoard 找到該貼文對應的所有版，然後根據 Board 的 type 和 name 來顯示標籤
          (supabase as any).from('PostBoard').select('postId, board:Board!PostBoard_boardId_fkey(id, name, type, schoolId, country_id)').in('postId', postIds).then((r: any) => {
            console.log('[GET /api/posts] 📋 PostBoard 查詢結果:', {
              count: r.data?.length || 0,
              error: r.error,
              sampleData: r.data?.slice(0, 3) || [],
            });
            return r;
          }).catch((e: any) => {
            console.error('[GET /api/posts] ❌ PostBoard 查詢失敗:', e);
            return { data: [], error: e };
          }),
          (supabase as any).from('SchoolRating').select('*').in('postId', postIds).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] SchoolRating 查詢失敗:', e);
            return { data: [], error: e };
          }),
        ]);

        // 提取結果
        likesData = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
        repostsData = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
        commentsData = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
        userLikes = results[3].status === 'fulfilled' ? results[3].value : { data: [] };
        userReposts = results[4].status === 'fulfilled' ? results[4].value : { data: [] };
        hashtagsData = results[5].status === 'fulfilled' ? results[5].value : { data: [] };
        photosData = results[6].status === 'fulfilled' ? results[6].value : { data: [] };
        schoolsData = results[7].status === 'fulfilled' ? results[7].value : { data: [] };
        ratingsData = results[8].status === 'fulfilled' ? results[8].value : { data: [] };

        console.log('[GET /api/posts] ✅ 批量查詢完成:', {
          likesCount: likesData.data?.length || 0,
          repostsCount: repostsData.data?.length || 0,
          commentsCount: commentsData.data?.length || 0,
          hashtagsCount: hashtagsData.data?.length || 0,
          photosCount: photosData.data?.length || 0,
          postBoardsCount: schoolsData.data?.length || 0,
          ratingsCount: ratingsData.data?.length || 0,
        });
      } catch (err) {
        console.error('[GET /api/posts] ❌ 批量查詢發生錯誤:', err);
        // 繼續執行，使用空數據
      }
    }

    // 計算統計數據
    const likeCounts = new Map<string, number>();
    const repostCounts = new Map<string, number>();
    const commentCounts = new Map<string, number>();
    const userLikedPostIds = new Set(((userLikes.data || []) as { postId: string }[]).map((l) => l.postId));
    const userRepostedPostIds = new Set(((userReposts.data || []) as { repostId: string }[]).map((r) => r.repostId));

    (((likesData.data || []) as { postId: string }[])).forEach((like) => {
      likeCounts.set(like.postId, (likeCounts.get(like.postId) || 0) + 1);
    });

    // 計算轉發數：統計 repostId 指向每個貼文的 Post 記錄數量
    (((repostsData.data || []) as { repostId: string }[])).forEach((repost) => {
      if (repost.repostId) {
        repostCounts.set(repost.repostId, (repostCounts.get(repost.repostId) || 0) + 1);
      }
    });

    (((commentsData.data || []) as { postId: string }[])).forEach((comment) => {
      commentCounts.set(comment.postId, (commentCounts.get(comment.postId) || 0) + 1);
    });

    // 組織相關數據
    const hashtagsByPostId = new Map<string, string[]>();
    const photosByPostId = new Map<string, { postId: string; url: string; order: number }[]>();
    const schoolsByPostId = new Map<string, { id: string; name_zh: string; name_en: string; country: string }[]>();
    const countriesByPostId = new Map<string, string[]>(); // 國家列表
    const ratingsByPostId = new Map<string, { postId: string; livingConvenience: number; costOfLiving: number; courseLoading: number }>();

    (hashtagsData.data || []).forEach((h: { postId: string; content: string }) => {
      if (!hashtagsByPostId.has(h.postId)) {
        hashtagsByPostId.set(h.postId, []);
      }
      hashtagsByPostId.get(h.postId)!.push(h.content);
    });

    (photosData.data || []).forEach((photo: { postId: string; url: string; order: number }) => {
      if (!photosByPostId.has(photo.postId)) {
        photosByPostId.set(photo.postId, []);
      }
      photosByPostId.get(photo.postId)!.push(photo);
    });

    // 統一邏輯：從 PostBoard -> Board 獲取版名（name）
    // 根據 Board 的 type 來判斷是國家版還是學校版
    // type='country' -> 國家標籤，type='school' -> 學校標籤
    console.log('[GET /api/posts] 📋 開始處理 PostBoard 數據:', {
      schoolsDataCount: schoolsData.data?.length || 0,
      schoolsDataError: (schoolsData as any).error,
      sampleData: schoolsData.data?.slice(0, 3) || [],
    });

    // 收集所有需要查詢的 schoolId
    const schoolIdsToFetch = new Set<string | number>();
    const boardDataByPostId = new Map<string, Array<{
      boardId: string;
      boardName: string;
      boardType: 'country' | 'school' | null;
      schoolId: string | number | null;
      country_id: number | null;
    }>>();

    (schoolsData.data || []).forEach((pb: { 
      postId: string; 
      board: { 
        id: string;
        name: string;
        type: 'country' | 'school' | null;
        schoolId: string | number | null; 
        country_id: number | null;
      } | null 
    }) => {
      console.log('[GET /api/posts] 🔍 處理 PostBoard 記錄:', {
        postId: pb.postId,
        board: pb.board ? {
          id: pb.board.id,
          name: pb.board.name,
          type: pb.board.type,
          schoolId: pb.board.schoolId,
          country_id: pb.board.country_id,
        } : null,
      });

      if (pb.board && pb.board.name) {
        if (!boardDataByPostId.has(pb.postId)) {
          boardDataByPostId.set(pb.postId, []);
        }
        boardDataByPostId.get(pb.postId)!.push({
          boardId: pb.board.id,
          boardName: pb.board.name,
          boardType: pb.board.type,
          schoolId: pb.board.schoolId,
          country_id: pb.board.country_id,
        });

        // 收集需要查詢的 schoolId
        if (pb.board.schoolId) {
          schoolIdsToFetch.add(pb.board.schoolId);
        }
      }
    });

    console.log('[GET /api/posts] 📊 處理後的 boardDataByPostId:', {
      postIds: Array.from(boardDataByPostId.keys()),
      boardDataCount: Array.from(boardDataByPostId.values()).reduce((sum, arr) => sum + arr.length, 0),
      schoolIdsToFetch: Array.from(schoolIdsToFetch),
    });

    // 批量查詢學校完整信息
    const schoolsInfoMap = new Map<string | number, { id: string; name_zh: string; name_en: string; country: string }>();
    if (schoolIdsToFetch.size > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: schoolsInfo } = await (supabase as any)
          .from('schools')
          .select('id, name_zh, name_en, country')
          .in('id', Array.from(schoolIdsToFetch));
        
        if (schoolsInfo) {
          schoolsInfo.forEach((school: { id: string | number; name_zh: string; name_en: string; country: string }) => {
            schoolsInfoMap.set(school.id, {
              id: String(school.id),
              name_zh: school.name_zh,
              name_en: school.name_en,
              country: school.country,
            });
          });
        }
      } catch (err) {
        console.warn("Error fetching schools info:", err);
      }
    }

    // 處理每個貼文的版信息
    console.log('[GET /api/posts] 🔄 開始處理每個貼文的版信息...');
    boardDataByPostId.forEach((boards, postId) => {
      console.log(`[GET /api/posts] 📝 處理貼文 ${postId}，有 ${boards.length} 個版`);
      boards.forEach((boardData, index) => {
        console.log(`[GET /api/posts]   - 版 ${index + 1}:`, {
          boardId: boardData.boardId,
          boardName: boardData.boardName,
          boardType: boardData.boardType,
          schoolId: boardData.schoolId,
          country_id: boardData.country_id,
        });

        // 學校版：type='school' 或 schoolId 不為 null
        if (boardData.boardType === 'school' || boardData.schoolId) {
          if (!schoolsByPostId.has(postId)) {
            schoolsByPostId.set(postId, []);
          }
          
          const existingSchools = schoolsByPostId.get(postId)!;
          const schoolIdStr = boardData.schoolId ? String(boardData.schoolId) : null;
          
          // 檢查是否已存在
          const existingSchool = existingSchools.find(s => schoolIdStr && s.id === schoolIdStr);
          if (!existingSchool) {
            // 如果有學校完整信息，使用它；否則使用 Board.name
            if (boardData.schoolId && schoolsInfoMap.has(boardData.schoolId)) {
              const schoolInfo = schoolsInfoMap.get(boardData.schoolId)!;
              console.log(`[GET /api/posts]     ✅ 添加學校（完整信息）:`, schoolInfo);
              existingSchools.push(schoolInfo);
            } else {
              // 使用 Board.name 作為學校名稱
              const schoolInfo = {
                id: schoolIdStr || boardData.boardId,
                name_zh: boardData.boardName,
                name_en: boardData.boardName,
                country: '',
              };
              console.log(`[GET /api/posts]     ✅ 添加學校（使用 Board.name）:`, schoolInfo);
              existingSchools.push(schoolInfo);
            }
          } else {
            console.log(`[GET /api/posts]     ⏭️  學校已存在，跳過`);
          }
        }
        
        // 國家版：type='country' 或 (country_id 不為 null 且 schoolId 為 null)
        if (boardData.boardType === 'country' || (boardData.country_id && !boardData.schoolId)) {
          if (!countriesByPostId.has(postId)) {
            countriesByPostId.set(postId, []);
          }
          // 使用 Board.name 作為國家名稱
          const countryList = countriesByPostId.get(postId)!;
          if (!countryList.includes(boardData.boardName)) {
            console.log(`[GET /api/posts]     ✅ 添加國家: ${boardData.boardName}`);
            countryList.push(boardData.boardName);
          } else {
            console.log(`[GET /api/posts]     ⏭️  國家已存在，跳過`);
          }
        }
      });
    });

    console.log('[GET /api/posts] 📊 處理完成後的統計:', {
      schoolsByPostId: Object.fromEntries(
        Array.from(schoolsByPostId.entries()).map(([id, schools]) => [id, schools.length])
      ),
      countriesByPostId: Object.fromEntries(
        Array.from(countriesByPostId.entries()).map(([id, countries]) => [id, countries.length])
      ),
    });

    (ratingsData.data || []).forEach((rating: { postId: string; livingConvenience: number; costOfLiving: number; courseLoading: number }) => {
      ratingsByPostId.set(rating.postId, rating);
    });

    // 組合數據
    console.log('[GET /api/posts] 🔄 開始組合最終數據...');
    const postsWithStatus = posts.map((post: { id: string; createdAt: string }) => {
      const ratings = ratingsByPostId.get(post.id);
      const schools = schoolsByPostId.get(post.id) || [];
      const countries = countriesByPostId.get(post.id) || [];
      const hashtags = hashtagsByPostId.get(post.id) || [];
      
      console.log(`[GET /api/posts] 📄 組合貼文 ${post.id}:`, {
        title: (post as { title?: string }).title,
        schoolsCount: schools.length,
        schools: schools,
        countriesCount: countries.length,
        countries: countries,
        hashtagsCount: hashtags.length,
        hashtags: hashtags,
      });
      
      return {
        ...post,
        isLiked: userId ? userLikedPostIds.has(post.id) : false,
        isReposted: userId ? userRepostedPostIds.has(post.id) : false, // userRepostedPostIds 現在包含的是 repostId（原始貼文ID）
        likeCount: likeCounts.get(post.id) || 0,
        repostCount: repostCounts.get(post.id) || 0,
        commentCount: commentCounts.get(post.id) || 0,
        schools: schools,
        countries: countries, // 添加國家列表
        hashtags: hashtags,
        photos: (photosByPostId.get(post.id) || []).sort((a, b) => a.order - b.order),
        ratings: ratings || null,
        postType: (post as { type?: string }).type === 'rating' ? 'review' : 'general',
      };
    });

    // 熱門排序：先用互動數排序，暫時不提供 cursor 分頁（避免排序後 cursor 失真）
    let finalPosts = postsWithStatus;
    let nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;

    console.log('[GET /api/posts] 排序前貼文:', {
      count: finalPosts.length,
      samplePosts: finalPosts.slice(0, 3).map((p: { id: string; title: string; postType?: string; author?: unknown }) => ({
        id: p.id,
        title: p.title,
        postType: p.postType,
        hasAuthor: !!p.author,
        authorType: p.author ? typeof p.author : 'none',
      })),
    });

    if (sort === "popular") {
      finalPosts = [...postsWithStatus].sort((a, b) => {
        const aScore = (a.likeCount || 0) + (a.commentCount || 0) + (a.repostCount || 0);
        const bScore = (b.likeCount || 0) + (b.commentCount || 0) + (b.repostCount || 0);
        if (bScore !== aScore) return bScore - aScore;
        // 分數相同時，以時間新舊做次排序
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      nextCursor = null;
    }

    console.log('[GET /api/posts] 準備返回數據:', {
      success: true,
      postsCount: finalPosts.length,
      nextCursor,
      firstPost: finalPosts[0] ? {
        id: finalPosts[0].id,
        title: finalPosts[0].title,
        postType: finalPosts[0].postType,
        hasAuthor: !!finalPosts[0].author,
        author: finalPosts[0].author ? {
          id: (finalPosts[0].author as { id?: string }).id,
          name: (finalPosts[0].author as { name?: string }).name,
        } : null,
        likeCount: finalPosts[0].likeCount,
        repostCount: finalPosts[0].repostCount,
        commentCount: finalPosts[0].commentCount,
      } : null,
    });

    const responseData = {
      success: true,
      posts: finalPosts,
      nextCursor,
    };

    console.log('[GET /api/posts] 返回響應數據結構:', {
      success: responseData.success,
      postsLength: responseData.posts?.length || 0,
      nextCursor: responseData.nextCursor,
      postsIsArray: Array.isArray(responseData.posts),
    });

    return NextResponse.json(responseData);
  } catch (error: unknown) {
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

