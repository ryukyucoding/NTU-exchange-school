import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/db';

/**
 * GET /api/hashtags/popular
 * 获取热门标签（前10名，按使用次数排序）
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // 先查询所有已发布的贴文的 id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: publishedPosts, error: postsError } = await (supabase as any)
      .from('Post')
      .select('id')
      .eq('status', 'published')
      .is('deletedAt', null);

    if (postsError) {
      console.error('Error fetching published posts:', postsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch published posts' },
        { status: 500 }
      );
    }

    if (!publishedPosts || publishedPosts.length === 0) {
      return NextResponse.json({
        success: true,
        tags: [],
      });
    }

    const postIds = (publishedPosts as { id: string }[]).map((p) => p.id);

    // 查询这些贴文的所有标签
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hashtags, error: hashtagsError } = await (supabase as any)
      .from('Hashtag')
      .select('content')
      .in('postId', postIds);

    if (hashtagsError) {
      console.error('Error fetching hashtags:', hashtagsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch hashtags' },
        { status: 500 }
      );
    }

    // 统计每个标签的使用次数
    const tagCounts = new Map<string, number>();
    (hashtags || []).forEach((item: { content: string }) => {
      const tag = item.content;
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });

    // 转换为数组并按使用次数排序，取前10名
    const popularTags = Array.from(tagCounts.entries())
      .map(([content, count]) => ({ content, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => item.content);

    return NextResponse.json({
      success: true,
      tags: popularTags,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/hashtags/popular:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

