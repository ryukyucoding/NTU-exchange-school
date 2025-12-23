import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/db';

/**
 * GET /api/hashtags/debug
 * 调试端点：检查数据库中hashtag的情况
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const results: Record<string, unknown> = {};

    // 1. 检查已发布的贴文数量
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: publishedPosts, error: postsError } = await (supabase as any)
      .from('Post')
      .select('id, status, deletedAt')
      .eq('status', 'published')
      .is('deletedAt', null);

    results.publishedPosts = {
      count: publishedPosts?.length || 0,
      error: postsError || null,
      sampleIds: publishedPosts?.slice(0, 5).map((p: { id: string }) => p.id) || [],
    };

    // 2. 检查草稿数量
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: draftPosts } = await (supabase as any)
      .from('Post')
      .select('id')
      .eq('status', 'draft')
      .limit(10);

    results.draftPosts = {
      count: draftPosts?.length || 0,
      sampleIds: draftPosts?.slice(0, 5).map((p: { id: string }) => p.id) || [],
    };

    // 3. 检查Hashtag表总数
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allHashtags, error: hashtagsError } = await (supabase as any)
      .from('Hashtag')
      .select('postId, content')
      .limit(100);

    results.allHashtags = {
      count: allHashtags?.length || 0,
      error: hashtagsError || null,
      sample: allHashtags?.slice(0, 10) || [],
    };

    // 4. 如果有已发布的贴文，检查它们的hashtag
    if (publishedPosts && publishedPosts.length > 0) {
      const postIds = publishedPosts.slice(0, 100).map((p: { id: string }) => p.id);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: publishedHashtags, error: publishedHashtagsError } = await (supabase as any)
        .from('Hashtag')
        .select('postId, content')
        .in('postId', postIds);

      results.publishedPostHashtags = {
        count: publishedHashtags?.length || 0,
        error: publishedHashtagsError || null,
        sample: publishedHashtags?.slice(0, 10) || [],
      };
    }

    // 5. 如果有草稿，检查它们的hashtag
    if (draftPosts && draftPosts.length > 0) {
      const draftPostIds = draftPosts.map((p: { id: string }) => p.id);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: draftHashtags } = await (supabase as any)
        .from('Hashtag')
        .select('postId, content')
        .in('postId', draftPostIds);

      results.draftPostHashtags = {
        count: draftHashtags?.length || 0,
        sample: draftHashtags?.slice(0, 10) || [],
      };
    }

    return NextResponse.json({
      success: true,
      debug: results,
    });
  } catch (error: unknown) {
    console.error('[hashtags/debug] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

