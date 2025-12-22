import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/db';

/**
 * GET /api/hashtags/popular
 * 获取热门标签（前10名，按使用次数排序）
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // 先查询所有已发布的贴文的 id（限制數量以避免 HeadersOverflowError）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: publishedPosts, error: postsError } = await (supabase as any)
      .from('Post')
      .select('id')
      .eq('status', 'published')
      .is('deletedAt', null)
      .limit(1000); // 限制查詢數量

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
    // 如果 postIds 太多，分批查詢以避免 HeadersOverflowError
    let allHashtags: { content: string }[] = [];
    const batchSize = 500;
    
    for (let i = 0; i < postIds.length; i += batchSize) {
      const batch = postIds.slice(i, i + batchSize);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: hashtags, error: hashtagsError } = await (supabase as any)
          .from('Hashtag')
          .select('content')
          .in('postId', batch);
        
        if (hashtagsError) {
          console.error(`Error fetching hashtags batch ${i / batchSize + 1}:`, hashtagsError);
          continue; // 跳過這個批次，繼續處理其他批次
        }
        
        if (hashtags) {
          allHashtags = allHashtags.concat(hashtags);
        }
      } catch (error) {
        console.error(`Error fetching hashtags batch ${i / batchSize + 1}:`, error);
        continue; // 跳過這個批次
      }
    }
    
    const hashtags = allHashtags;

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

