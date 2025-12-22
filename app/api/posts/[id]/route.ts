import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/posts/[id]
 * 獲取單個貼文詳情
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = id;
    const session = await auth();
    const userId = session?.user ? (session.user as { id: string }).id : null;

    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "資料庫未配置" },
        { status: 500 }
      );
    }

    // 獲取貼文
    const { data: post, error: postError } = await (supabase as any)
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
      .is('deletedAt', null)
      .maybeSingle();

    if (postError) {
      console.error("Error fetching post:", postError);
      return NextResponse.json(
        { success: false, error: "無法獲取貼文" },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { success: false, error: "貼文不存在" },
        { status: 404 }
      );
    }

    // 只返回已發布的貼文
    if (post.status !== 'published') {
      // 如果是作者本人，允許查看草稿
      if (post.authorId !== userId) {
        return NextResponse.json(
          { success: false, error: "貼文不存在" },
          { status: 404 }
        );
      }
    }

    // 批量獲取相關數據
    const [likesResult, repostsResult, commentsResult, userLikesResult, userRepostsResult, userBookmarksResult, hashtagsResult, photosResult, schoolsResult, ratingsResult] = await Promise.allSettled([
      (supabase as any).from('Like').select('postId').eq('postId', postId).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from('Post').select('repostId').eq('repostId', postId).eq('status', 'published').not('repostId', 'is', null).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from('Comment').select('postId').eq('postId', postId).is('deletedAt', null).then((r: any) => r).catch(() => ({ data: [] })),
      userId ? (supabase as any).from('Like').select('postId').eq('userId', userId).eq('postId', postId).then((r: any) => r).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      userId ? (supabase as any).from('Post').select('repostId').eq('authorId', userId).eq('repostId', postId).eq('status', 'published').not('repostId', 'is', null).then((r: any) => r).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      userId ? (supabase as any).from('Bookmark').select('postId').eq('userId', userId).eq('postId', postId).then((r: any) => r).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      (supabase as any).from('Hashtag').select('postId, content').eq('postId', postId).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from('PostPhoto').select('*').eq('postId', postId).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from('PostSchool').select('schoolId, school:schools!PostSchool_schoolId_fkey(id, name_zh, name_en, country)').eq('postId', postId).then((r: any) => r).catch(() => ({ data: [] })),
      (supabase as any).from('SchoolRating').select('*').eq('postId', postId).then((r: any) => r).catch(() => ({ data: [] })),
    ]);

    const likesData = likesResult.status === 'fulfilled' ? likesResult.value : { data: [] };
    const repostsData = repostsResult.status === 'fulfilled' ? repostsResult.value : { data: [] };
    const commentsData = commentsResult.status === 'fulfilled' ? commentsResult.value : { data: [] };
    const userLikes = userLikesResult.status === 'fulfilled' ? userLikesResult.value : { data: [] };
    const userReposts = userRepostsResult.status === 'fulfilled' ? userRepostsResult.value : { data: [] };
    const userBookmarks = userBookmarksResult.status === 'fulfilled' ? userBookmarksResult.value : { data: [] };
    const hashtagsData = hashtagsResult.status === 'fulfilled' ? hashtagsResult.value : { data: [] };
    const photosData = photosResult.status === 'fulfilled' ? photosResult.value : { data: [] };
    const schoolsData = schoolsResult.status === 'fulfilled' ? schoolsResult.value : { data: [] };
    const ratingsData = ratingsResult.status === 'fulfilled' ? ratingsResult.value : { data: [] };

    // 處理數據
    const likeCount = (likesData.data || []).length;
    const repostCount = (repostsData.data || []).length;
    const commentCount = (commentsData.data || []).length;
    const isLiked = userId ? (userLikes.data || []).length > 0 : false;
    const isReposted = userId ? (userReposts.data || []).length > 0 : false;
    const isBookmarked = userId ? (userBookmarks.data || []).length > 0 : false;

    const hashtags = (hashtagsData.data || []).map((h: { content: string }) => h.content);
    const photos = (photosData.data || []).sort((a: { order: number }, b: { order: number }) => a.order - b.order).map((photo: { url: string; alt?: string }) => ({
      id: photo.url,
      url: photo.url,
      alt: photo.alt,
    }));

    const schools: { id: string; name_zh: string; name_en: string; country: string }[] = [];
    const countries: string[] = [];

    (schoolsData.data || []).forEach((ps: { school: { id: string; name_zh: string; name_en: string; country: string } | null }) => {
      if (ps.school) {
        schools.push({
          id: ps.school.id,
          name_zh: ps.school.name_zh,
          name_en: ps.school.name_en,
          country: ps.school.country,
        });
        if (ps.school.country && !countries.includes(ps.school.country)) {
          countries.push(ps.school.country);
        }
      }
    });

    // 獲取國家信息（如果有PostBoard關聯）
    let postBoardData: { data: any[] | null; error: any } = { data: [], error: null };
    try {
      const result = await (supabase as any)
        .from('PostBoard')
        .select('board:Board!PostBoard_boardId_fkey(country_id, Country:country_id(id, name))')
        .eq('postId', postId);
      postBoardData = result;
    } catch (error) {
      console.warn('Error fetching PostBoard data:', error);
      postBoardData = { data: [], error };
    }

    (postBoardData.data || []).forEach((pb: { board: { Country: { name: string } | null } | null }) => {
      if (pb.board?.Country?.name && !countries.includes(pb.board.Country.name)) {
        countries.push(pb.board.Country.name);
      }
    });

    const ratings = (ratingsData.data || []).length > 0 ? {
      schoolId: (ratingsData.data as any[])[0].schoolId,
      livingConvenience: (ratingsData.data as any[])[0].livingConvenience,
      costOfLiving: (ratingsData.data as any[])[0].costOfLiving,
      courseLoading: (ratingsData.data as any[])[0].courseLoading,
    } : null;

    // 如果貼文有 repostId，獲取原貼文數據
    let originalPost = null;
    if (post.repostId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: originalPostData, error: originalPostError } = await (supabase as any)
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
          .eq('id', post.repostId)
          .eq('status', 'published')
          .is('deletedAt', null)
          .maybeSingle();

        if (!originalPostError && originalPostData) {
          // 獲取原貼文的 hashtags, schools, countries
          const [originalHashtagsResult, originalSchoolsResult] = await Promise.allSettled([
            (supabase as any).from('Hashtag').select('postId, content').eq('postId', post.repostId).then((r: any) => r).catch(() => ({ data: [] })),
            (supabase as any).from('PostSchool').select('postId, school:schools!PostSchool_schoolId_fkey(id, name_zh, name_en, country)').eq('postId', post.repostId).then((r: any) => r).catch(() => ({ data: [] })),
          ]);

          const originalHashtags = originalHashtagsResult.status === 'fulfilled' ? originalHashtagsResult.value.data || [] : [];
          const originalSchools = originalSchoolsResult.status === 'fulfilled' ? originalSchoolsResult.value.data || [] : [];

          const originalHashtagsList = originalHashtags.map((h: { content: string }) => h.content);
          const originalSchoolsList: { id: string; name_zh: string; name_en: string; country: string }[] = [];
          const originalCountriesList: string[] = [];

          originalSchools.forEach((ps: { school: { id: string; name_zh: string; name_en: string; country: string } | null }) => {
            if (ps.school) {
              originalSchoolsList.push({
                id: ps.school.id,
                name_zh: ps.school.name_zh,
                name_en: ps.school.name_en,
                country: ps.school.country,
              });
              if (ps.school.country && !originalCountriesList.includes(ps.school.country)) {
                originalCountriesList.push(ps.school.country);
              }
            }
          });

          originalPost = {
            id: originalPostData.id,
            title: originalPostData.title,
            content: originalPostData.content,
            author: originalPostData.author ? {
              id: originalPostData.author.id,
              name: originalPostData.author.name,
              userID: originalPostData.author.userID,
              image: originalPostData.author.image,
            } : null,
            createdAt: originalPostData.createdAt,
            hashtags: originalHashtagsList,
            schools: originalSchoolsList,
            countries: originalCountriesList,
          };
        }
      } catch (error) {
        console.error('Error fetching original post:', error);
      }
    }

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author ? {
          id: post.author.id,
          name: post.author.name,
          userID: post.author.userID,
          image: post.author.image,
        } : null,
        createdAt: post.createdAt,
        hashtags,
        photos,
        schools,
        countries,
        ratings,
        likeCount,
        repostCount,
        commentCount,
        isLiked,
        isReposted,
        repostId: post.repostId || null,
        originalPost: originalPost,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/posts/[id]:", error);
    return NextResponse.json(
      { success: false, error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]
 * 刪除貼文（軟刪除：更新 status 為 'deleted'）
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = id;
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "請先登入" },
        { status: 401 }
      );
    }
    
    const userId = (session.user as { id: string }).id;
    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "資料庫未配置" },
        { status: 500 }
      );
    }

    // 檢查貼文是否存在且屬於當前用戶
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post, error: fetchError } = await (supabase as any)
      .from('Post')
      .select('id, authorId')
      .eq('id', postId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching post:", fetchError);
      return NextResponse.json(
        { success: false, error: "無法獲取貼文" },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { success: false, error: "貼文不存在" },
        { status: 404 }
      );
    }

    if (post.authorId !== userId) {
      return NextResponse.json(
        { success: false, error: "無權限刪除此貼文" },
        { status: 403 }
      );
    }

    // 軟刪除：更新 status 為 'deleted'，並設置 deletedAt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('Post')
      .update({
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', postId);

    if (deleteError) {
      console.error("Error deleting post:", deleteError);
      return NextResponse.json(
        { success: false, error: "刪除失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "貼文已刪除",
    });
  } catch (error) {
    console.error("Error in DELETE /api/posts/[id]:", error);
    return NextResponse.json(
      { success: false, error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}

