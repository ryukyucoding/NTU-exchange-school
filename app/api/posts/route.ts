import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";
import { createBoardNewPostNotifications } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/posts
 * 建立新貼文
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 20, 60_000); // 每分鐘最多 20 篇發文
  if (limited) return limited;

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
      ratings,
      repostId // 轉發的原貼文 ID
    } = await req.json();

    // 驗證必填欄位（草稿允許空標題和內容）
    // 確保 content 是字符串類型
    const contentStr = content !== null && content !== undefined ? String(content) : '';
    const trimmedTitle = (title || '').trim() || '未命名草稿';
    const trimmedContent = contentStr.trim();
    
    if (status !== 'draft') {
      if (!title || typeof title !== "string") {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 }
        );
      }

      if (trimmedTitle.length === 0) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }

      // 轉發時可以不輸入內容，但必須有標題
      // 非轉發時必須有內容
      if (!repostId) {
        if (typeof content !== "string") {
          return NextResponse.json(
            { error: "Content is required" },
            { status: 400 }
          );
        }
        
        if (trimmedContent.length === 0) {
          return NextResponse.json(
            { error: "Content cannot be empty" },
            { status: 400 }
          );
        }
      }
    }

    // 如果提供了 repostId，驗證原貼文是否存在
    if (repostId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: originalPost, error: originalPostError } = await (supabase as any)
        .from('Post')
        .select('id')
        .eq('id', repostId)
        .eq('status', 'published')
        .maybeSingle();
      
      if (originalPostError || !originalPost) {
        return NextResponse.json(
          { error: "Original post not found" },
          { status: 404 }
        );
      }
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
          repostId: repostId || null,
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

      // 刪除舊的關聯資料（但保留 PostBoard，因為會在後面重新建立）
      await Promise.all([
        (supabase as any).from('Hashtag').delete().eq('postId', postId),
        (supabase as any).from('PostPhoto').delete().eq('postId', postId),
        (supabase as any).from('SchoolRating').delete().eq('postId', postId),
        (supabase as any).from('PostBoard').delete().eq('postId', postId),
        (supabase as any).from('PostSchool').delete().eq('postId', postId).catch(() => {}),
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
        repostId: repostId || null,
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
        } else {
          try {
            await (supabase as any).from('PostSchool').insert({
              id: crypto.randomUUID(),
              postId,
              schoolId: Number(schoolId),
            });
          } catch {
            /* PostSchool 表可選 */
          }
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
      console.log(`[POST /api/posts] 開始處理學校看板，schoolIds:`, schoolIds);
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
          console.log(`[POST /api/posts] 找到學校板: schoolId=${schoolId}, boardId=${schoolBoard.id}`);
        } else {
          // 如果學校版不存在，嘗試創建
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: schoolInfo } = await (supabase as any)
            .from('schools')
            .select('name_zh, country_id')
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
    // 注意：無論是草稿還是已發布的貼文，都需要建立 PostBoard 關聯
    const uniqueBoardIds = [...new Set(boardIds)];
    if (uniqueBoardIds.length > 0) {
      // 如果是更新，先刪除現有的 PostBoard 關聯（已在上面刪除，這裡確保）
      // 但為了安全起見，再次檢查並刪除
      if (isUpdate) {
        try {
          await (supabase as any)
            .from('PostBoard')
            .delete()
            .eq('postId', postId);
        } catch (error) {
          console.error("Error deleting old PostBoard relations:", error);
        }
      }
      
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
        console.log(`[POST /api/posts] 成功建立 ${postBoardInserts.length} 個 PostBoard 關聯 (status: ${status}, isUpdate: ${isUpdate})`);
        if (schoolIds && Array.isArray(schoolIds) && schoolIds.length > 0) {
          for (const sid of schoolIds) {
            if (!sid || typeof sid !== 'string') continue;
            try {
              await (supabase as any).from('PostSchool').insert({
                id: crypto.randomUUID(),
                postId,
                schoolId: Number(sid),
              });
            } catch {
              /* 表未建立或重複可略過 */
            }
          }
        }
      }
    } else {
      console.log(`[POST /api/posts] 沒有 boardIds，跳過 PostBoard 關聯建立 (status: ${status})`);
    }

    // 如果是新發布的貼文（非草稿、非更新），通知追蹤這些看板的用戶
    if (status === 'published' && !isUpdate && uniqueBoardIds.length > 0) {
      try {
        console.log(`[POST /api/posts] 準備發送通知，postId=${postId}, boardIds=`, uniqueBoardIds);
        await createBoardNewPostNotifications(postId, uniqueBoardIds, userId);
        console.log(`[POST /api/posts] 已發送板新貼文通知給追蹤者`);
      } catch (notifError) {
        console.error('[POST /api/posts] 發送板新貼文通知失敗:', notifError);
        // 通知失敗不影響貼文創建
      }
    } else {
      console.log(`[POST /api/posts] 跳過通知發送: status=${status}, isUpdate=${isUpdate}, boardIds.length=${uniqueBoardIds.length}`);
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
      { error: "伺服器錯誤，請稍後再試" },
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
    const bookmarked = searchParams.get("bookmarked") === "true"; // Filter by bookmarked posts
    const liked = searchParams.get("liked") === "true"; // Filter by liked posts
    const sort = (searchParams.get("sort") || "latest") as "latest" | "popular";
    const filterType = searchParams.get("filterType"); // "rating" for rating posts only
    const type = searchParams.get("type"); // 'general' or 'review'

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
    
    // 如果請求的是收藏的貼文，先查詢收藏的 postIds
    let bookmarkedPostIdsOrdered: string[] = []; // 按收藏時間倒序
    if (bookmarked && userId) {
      const supabase = getSupabaseServer();
      if (supabase) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userBookmarks } = await (supabase as any)
          .from('Bookmark')
          .select('postId, createdAt')
          .eq('userId', userId)
          .order('createdAt', { ascending: false }); // 最新收藏的在最上面
        bookmarkedPostIdsOrdered = ((userBookmarks || []) as { postId: string }[]).map((b) => b.postId);
        
        if (bookmarkedPostIdsOrdered.length === 0) {
          return NextResponse.json({
            success: true,
            posts: [],
            nextCursor: null,
          });
        }
        filterPostIds = bookmarkedPostIdsOrdered;
      } else {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
    }

    // 如果請求的是按讚的貼文，先查詢按讚的 postIds
    let likedPostIdsOrdered: string[] = []; // 按按讚時間倒序
    if (liked && userId) {
      const supabase = getSupabaseServer();
      if (supabase) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userLikes } = await (supabase as any)
          .from('Like')
          .select('postId, createdAt')
          .eq('userId', userId)
          .order('createdAt', { ascending: false }); // 最新按讚的在最上面
        likedPostIdsOrdered = ((userLikes || []) as { postId: string }[]).map((l) => l.postId);
        
        if (likedPostIdsOrdered.length === 0) {
          return NextResponse.json({
            success: true,
            posts: [],
            nextCursor: null,
          });
        }
        filterPostIds = likedPostIdsOrdered;
      } else {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }
    }

    // 如果指定了 boardId，先驗證 board 是否存在，然後通過 PostBoard 表查詢
    if (boardId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: boardData, error: boardError } = await (supabase as any)
        .from('Board')
        .select('id')
        .eq('id', boardId)
        .maybeSingle();

      if (boardError || !boardData) {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }

      // 通過 PostBoard 表查詢該看板的貼文
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: postBoardData, error: postBoardError } = await (supabase as any)
        .from('PostBoard')
        .select('postId')
        .eq('boardId', boardId);

      if (postBoardError) {
        console.error('[GET /api/posts] PostBoard 查詢錯誤:', postBoardError);
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }

      if (!postBoardData || postBoardData.length === 0) {
        return NextResponse.json({
          success: true,
          posts: [],
          nextCursor: null,
        });
      }

      const postIds = (postBoardData as { postId: string }[]).map((p) => p.postId);
      filterPostIds = postIds;
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
      
      // 使用 try-catch 而不是 .catch()，因為 Supabase query builder 不返回 Promise
      let ratingsData: { data: any[] | null } = { data: [] };
      if (postIds.length > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (supabase as any)
            .from('SchoolRating')
            .select('postId')
            .in('postId', postIds);
          ratingsData = result;
        } catch (error) {
          console.error('[GET /api/posts] Error fetching ratings:', error);
          ratingsData = { data: [] };
        }
      }

      const ratedPostIds = new Set((ratingsData.data || []).map((r: { postId: string }) => r.postId));

      // 批量獲取草稿的相關資料
      // 使用 Promise.allSettled 和 try-catch 來處理錯誤
      const fetchHashtags = async () => {
        try {
          if (postIds.length === 0) return { data: [] };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (supabase as any)
            .from('Hashtag')
            .select('postId, content')
            .in('postId', postIds);
          return result;
        } catch (error) {
          console.error('[GET /api/posts] Error fetching hashtags:', error);
          return { data: [] };
        }
      };
      
      const fetchSchools = async () => {
        try {
          if (postIds.length === 0) return { data: [] };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (supabase as any)
            .from('PostSchool')
            .select('postId, school:schools!PostSchool_schoolId_fkey(id, name_zh, name_en, country_id)')
            .in('postId', postIds);
          return result;
        } catch (error) {
          console.error('[GET /api/posts] Error fetching schools:', error);
          return { data: [] };
        }
      };
      
      const fetchPostBoards = async () => {
        try {
          if (postIds.length === 0) return { data: [] };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (supabase as any)
            .from('PostBoard')
            .select('postId, board:Board!PostBoard_boardId_fkey(country_id, Country:country_id(id, country_zh))')
            .in('postId', postIds);
          return result;
        } catch (error) {
          console.error('[GET /api/posts] Error fetching post boards:', error);
          return { data: [] };
        }
      };
      
      const [hashtagsResult, schoolsResult, postBoardResult] = await Promise.allSettled([
        fetchHashtags(),
        fetchSchools(),
        fetchPostBoards(),
      ]);

      const hashtagsData = hashtagsResult.status === 'fulfilled' ? hashtagsResult.value : { data: [] };
      const schoolsData = schoolsResult.status === 'fulfilled' ? schoolsResult.value : { data: [] };
      const postBoardData = postBoardResult.status === 'fulfilled' ? postBoardResult.value : { data: [] };

      // 組織資料
      const draftHashtagsMap = new Map<string, string[]>();
      const draftSchoolsMap = new Map<string, { id: string; name_zh: string; name_en: string; country: string }[]>();
      const draftCountriesMap = new Map<string, string[]>();

      (hashtagsData.data || []).forEach((h: { postId: string; content: string }) => {
        if (!draftHashtagsMap.has(h.postId)) {
          draftHashtagsMap.set(h.postId, []);
        }
        draftHashtagsMap.get(h.postId)!.push(h.content);
      });

      (schoolsData.data || []).forEach((ps: { postId: string; school: { id: string; name_zh: string; name_en: string; country: string } | null }) => {
        if (ps.school) {
          if (!draftSchoolsMap.has(ps.postId)) {
            draftSchoolsMap.set(ps.postId, []);
          }
          draftSchoolsMap.get(ps.postId)!.push(ps.school);
          if (!draftCountriesMap.has(ps.postId)) {
            draftCountriesMap.set(ps.postId, []);
          }
          const countryList = draftCountriesMap.get(ps.postId)!;
          if (ps.school.country && !countryList.includes(ps.school.country)) {
            countryList.push(ps.school.country);
          }
        }
      });

      (postBoardData.data || []).forEach((pb: {
        postId: string;
        board: { Country: { country_zh: string } | null } | null;
      }) => {
        const cn = pb.board?.Country?.country_zh;
        if (cn) {
          if (!draftCountriesMap.has(pb.postId)) {
            draftCountriesMap.set(pb.postId, []);
          }
          const countryList = draftCountriesMap.get(pb.postId)!;
          if (!countryList.includes(cn)) {
            countryList.push(cn);
          }
        }
      });
      
      let filteredDrafts = drafts;
      if (type === 'review') {
        filteredDrafts = (drafts as { id: string }[]).filter((d) => ratedPostIds.has(d.id));
      } else if (type === 'general') {
        filteredDrafts = (drafts as { id: string }[]).filter((d) => !ratedPostIds.has(d.id));
      }

      const finalDrafts = filteredDrafts.map((post: any) => {
        const postId = post.id;
        const schools = draftSchoolsMap.get(postId) || [];
        const countries = draftCountriesMap.get(postId) || [];
        return {
          ...post,
          type: ratedPostIds.has(postId) ? 'review' : 'general',
          hashtags: draftHashtagsMap.get(postId) || [],
          schools,
          countries,
        };
      });

      return NextResponse.json({
        success: true,
        posts: finalDrafts,
        nextCursor: null,
      });
    }

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
    // 優先 PostSchool；表不存在時用 SchoolRating + 學校版 PostBoard
    if (schoolId) {
      const sid = parseInt(String(schoolId), 10);
      const schoolIdStr = String(schoolId);
      let postIdsFromSchool: string[] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postSchoolRes = await (supabase as any)
        .from('PostSchool')
        .select('postId')
        .eq('schoolId', schoolIdStr);
      if (!postSchoolRes.error && postSchoolRes.data?.length) {
        postIdsFromSchool = (postSchoolRes.data as { postId: string }[]).map((p) => p.postId);
      } else if (postSchoolRes.error?.message?.includes('schema cache') || postSchoolRes.error?.code === 'PGRST205') {
        // PostSchool 表不存在：心得文的 schoolId 在 SchoolRating；一般文可能在學校看板 PostBoard
        const [ratingRes, boardRes] = await Promise.all([
          (supabase as any).from('SchoolRating').select('postId').eq('schoolId', sid),
          (supabase as any)
            .from('Board')
            .select('id')
            .eq('type', 'school')
            .eq('schoolId', sid)
            .maybeSingle(),
        ]);
        const fromRating = ((ratingRes.data || []) as { postId: string }[]).map((r) => r.postId);
        postIdsFromSchool = [...new Set(fromRating)];
        if (boardRes.data?.id) {
          const pb = await (supabase as any)
            .from('PostBoard')
            .select('postId')
            .eq('boardId', boardRes.data.id);
          const fromBoard = ((pb.data || []) as { postId: string }[]).map((p) => p.postId);
          postIdsFromSchool = [...new Set([...postIdsFromSchool, ...fromBoard])];
        }
      } else if (postSchoolRes.data?.length) {
        postIdsFromSchool = (postSchoolRes.data as { postId: string }[]).map((p) => p.postId);
      }

      if (postIdsFromSchool.length > 0) {
        if (filterPostIds === null) {
          filterPostIds = postIdsFromSchool;
        } else {
          filterPostIds = (filterPostIds as string[]).filter((id) => postIdsFromSchool.includes(id));
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

    if (filterPostIds !== null && filterPostIds.length > 0) {
      query = query.in('id', filterPostIds);
    } else if (filterPostIds !== null && filterPostIds.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    // 如果有 cursor（createdAt 時間戳），從該位置開始
    if (cursor && sort === "latest") {
      query = query.lt('createdAt', cursor);
    }

    let posts, error;
    try {
      const result = await query;
      posts = result.data;
      error = result.error;
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
      return NextResponse.json({
        success: true,
        posts: [],
        nextCursor: null,
      });
    }

    // 批量獲取互動數據和相關數據
    const postIds = (posts as { id: string }[]).map((p) => p.id);
    
    // 獲取按讚數、轉發數、留言數、hashtags、photos、schools、ratings、bookmarks（使用 try-catch 避免錯誤）
    let likesData = { data: [] };
    let repostsData = { data: [] }; // 現在是 Post 記錄，其中 repostId 指向原始貼文
    let commentsData = { data: [] };
    let userLikes = { data: [] };
    let userReposts = { data: [] }; // 用戶轉發的 Post 記錄
    let hashtagsData = { data: [] };
    let photosData = { data: [] };
    let schoolsData = { data: [] };
    let ratingsData = { data: [] };
    let userBookmarksData = { data: [] };

    if (supabase && postIds.length > 0) {
      try {
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
          (supabase as any).from('PostBoard').select('postId, board:Board!PostBoard_boardId_fkey(id, name, type, schoolId, country_id)').in('postId', postIds).then((r: any) => r).catch((e: any) => {
            console.error('[GET /api/posts] ❌ PostBoard 查詢失敗:', e);
            return { data: [], error: e };
          }),
          (supabase as any).from('SchoolRating').select('*').in('postId', postIds).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] SchoolRating 查詢失敗:', e);
            return { data: [], error: e };
          }),
          // [9] Bookmark 查詢（與其他查詢並行）
          (userId) ? (supabase as any).from('Bookmark').select('postId').eq('userId', userId).in('postId', postIds).then((r: any) => r).catch((e: any) => {
            console.warn('[GET /api/posts] Bookmark 查詢失敗:', e);
            return { data: [], error: e };
          }) : Promise.resolve({ data: [] }),
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
        userBookmarksData = results[9].status === 'fulfilled' ? results[9].value : { data: [] };

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
    const userBookmarkedPostIds = new Set(((userBookmarksData.data || []) as { postId: string }[]).map((b) => b.postId));

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

    // 批量查詢學校完整信息
    const schoolsInfoMap = new Map<string | number, { id: string; name_zh: string; name_en: string; country: string }>();
    if (schoolIdsToFetch.size > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: schoolsInfo } = await (supabase as any)
          .from('schools')
          .select('id, name_zh, name_en, country_id')
          .in('id', Array.from(schoolIdsToFetch));

        if (schoolsInfo) {
          schoolsInfo.forEach((school: { id: string | number; name_zh: string; name_en: string; country_id: string }) => {
            schoolsInfoMap.set(school.id, {
              id: String(school.id),
              name_zh: school.name_zh,
              name_en: school.name_en,
              country: school.country_id,
            });
          });
        }
      } catch (err) {
        console.warn("Error fetching schools info:", err);
      }
    }

    // 處理每個貼文的版信息
    boardDataByPostId.forEach((boards, postId) => {
      boards.forEach((boardData) => {

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
              existingSchools.push(schoolInfo);
            } else {
              // 使用 Board.name 作為學校名稱
              const schoolInfo = {
                id: schoolIdStr || boardData.boardId,
                name_zh: boardData.boardName,
                name_en: boardData.boardName,
                country: '',
              };
              existingSchools.push(schoolInfo);
            }
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
            countryList.push(boardData.boardName);
          }
        }
      });
    });


    (ratingsData.data || []).forEach((rating: { postId: string; livingConvenience: number; costOfLiving: number; courseLoading: number }) => {
      ratingsByPostId.set(rating.postId, rating);
    });

    // 批量獲取原貼文數據（對於有 repostId 的貼文）
    const originalPostIds = new Set<string>();
    posts.forEach((post: { repostId?: string }) => {
      if (post.repostId) {
        originalPostIds.add(post.repostId);
      }
    });

    const originalPostsMap = new Map<string, any>();
    if (originalPostIds.size > 0 && supabase) {
      try {
        const originalPostIdsArray = Array.from(originalPostIds);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: originalPostsData, error: originalPostsError } = await (supabase as any)
          .from('Post')
          .select(`
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
          `)
          .in('id', originalPostIdsArray)
          .eq('status', 'published')
          .is('deletedAt', null);

        if (!originalPostsError && originalPostsData) {
          // 獲取原貼文的 hashtags, schools, countries
          const originalPostIdsForDetails = originalPostsData.map((p: { id: string }) => p.id);
          const [originalHashtagsResult, originalSchoolsResult] = await Promise.allSettled([
            (supabase as any).from('Hashtag').select('postId, content').in('postId', originalPostIdsForDetails).then((r: any) => r).catch(() => ({ data: [] })),
            (supabase as any).from('PostSchool').select('postId, school:schools!PostSchool_schoolId_fkey(id, name_zh, name_en, country_id)').in('postId', originalPostIdsForDetails).then((r: any) => r).catch(() => ({ data: [] })),
          ]);

          const originalHashtags = originalHashtagsResult.status === 'fulfilled' ? originalHashtagsResult.value.data || [] : [];
          const originalSchools = originalSchoolsResult.status === 'fulfilled' ? originalSchoolsResult.value.data || [] : [];

          // 組織原貼文的 hashtags 和 schools
          const originalHashtagsByPostId = new Map<string, string[]>();
          originalHashtags.forEach((h: { postId: string; content: string }) => {
            if (!originalHashtagsByPostId.has(h.postId)) {
              originalHashtagsByPostId.set(h.postId, []);
            }
            originalHashtagsByPostId.get(h.postId)!.push(h.content);
          });

          const originalSchoolsByPostId = new Map<string, any[]>();
          originalSchools.forEach((ps: { postId: string; school: any }) => {
            if (ps.school) {
              if (!originalSchoolsByPostId.has(ps.postId)) {
                originalSchoolsByPostId.set(ps.postId, []);
              }
              originalSchoolsByPostId.get(ps.postId)!.push(ps.school);
            }
          });

          // 組合原貼文數據
          originalPostsData.forEach((originalPost: any) => {
            const originalPostId = originalPost.id;
            const originalPostHashtags = originalHashtagsByPostId.get(originalPostId) || [];
            const originalPostSchools = originalSchoolsByPostId.get(originalPostId) || [];
            const originalPostCountries = [...new Set(originalPostSchools.map((s: any) => s.country).filter(Boolean))];
            // 獲取原貼文的 boards
            const originalPostBoards = (boardDataByPostId.get(originalPostId) || []).map((boardData) => ({
              id: boardData.boardId,
              name: boardData.boardName,
              type: boardData.boardType || (boardData.schoolId ? 'school' : 'country'),
              country_id: boardData.country_id,
              schoolId: boardData.schoolId,
            }));

            originalPostsMap.set(originalPostId, {
              ...originalPost,
              hashtags: originalPostHashtags,
              schools: originalPostSchools,
              countries: originalPostCountries,
              boards: originalPostBoards, // 新增：原貼文的 boards
            });
          });
        }
      } catch (error) {
        console.error('[GET /api/posts] 獲取原貼文數據失敗:', error);
      }
    }

    // 組合數據
    const postsWithStatus = posts.map((post: { id: string; createdAt: string; repostId?: string }) => {
      const ratings = ratingsByPostId.get(post.id);
      const schools = schoolsByPostId.get(post.id) || [];
      const countries = countriesByPostId.get(post.id) || [];
      const hashtags = hashtagsByPostId.get(post.id) || [];
      const boards = (boardDataByPostId.get(post.id) || []).map((boardData) => ({
        id: boardData.boardId,
        name: boardData.boardName,
        type: boardData.boardType || (boardData.schoolId ? 'school' : 'country'),
        country_id: boardData.country_id,
        schoolId: boardData.schoolId,
      }));
      
      const originalPost = post.repostId ? originalPostsMap.get(post.repostId) : null;

      return {
        ...post,
        isLiked: userId ? userLikedPostIds.has(post.id) : false,
        isReposted: userId ? userRepostedPostIds.has(post.id) : false, // userRepostedPostIds 現在包含的是 repostId（原始貼文ID）
        isBookmarked: userId ? userBookmarkedPostIds.has(post.id) : false,
        likeCount: likeCounts.get(post.id) || 0,
        repostCount: repostCounts.get(post.id) || 0,
        commentCount: commentCounts.get(post.id) || 0,
        schools: schools,
        countries: countries, // 添加國家列表
        hashtags: hashtags,
        boards: boards, // 新增：boards 陣列
        photos: (photosByPostId.get(post.id) || []).sort((a, b) => a.order - b.order),
        ratings: ratings || null,
        postType: (post as { type?: string }).type === 'rating' ? 'review' : 'general',
        originalPost: originalPost || null, // 原貼文數據
      };
    });

    // 如果是收藏的貼文，按收藏時間排序（最新收藏的在最上面）
    if (bookmarked && userId && bookmarkedPostIdsOrdered.length > 0) {
      // 創建一個順序映射
      const orderMap = new Map<string, number>(bookmarkedPostIdsOrdered.map((id: string, index: number) => [id, index]));
      postsWithStatus.sort((a: { id: string }, b: { id: string }) => {
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      });
    }
    
    // 熱門排序：先用互動數排序，暫時不提供 cursor 分頁（避免排序後 cursor 失真）
    let finalPosts = postsWithStatus;
    // cursor 直接使用 createdAt 時間戳，省去下次分頁時的 ID 查詢
    let nextCursor = posts.length === limit ? (posts[posts.length - 1] as { createdAt: string }).createdAt : null;

    if (sort === "popular") {
      finalPosts = [...postsWithStatus].sort((a, b) => {
        // 熱門排序：按照「按讚＋留言數」由高到低排序
        const aScore = (a.likeCount || 0) + (a.commentCount || 0);
        const bScore = (b.likeCount || 0) + (b.commentCount || 0);
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

