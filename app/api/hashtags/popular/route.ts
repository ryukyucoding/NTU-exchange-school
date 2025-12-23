import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/db';

/**
 * GET /api/hashtags/popular
 * 获取热门标签（前10名，按使用次数排序）
 * 只统计已发布（published）且未删除的贴文中的hashtag，不包含草稿（draft）
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

    // 先查询所有已发布的贴文的 id（不包含草稿和已删除的）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: publishedPosts, error: postsError } = await (supabase as any)
      .from('Post')
      .select('id')
      .eq('status', 'published')
      .is('deletedAt', null);

    if (postsError) {
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
    const postIdsSet = new Set(postIds); // 使用Set提高查找效率

    // 方法1: 如果postIds数量较少，直接查询
    // 方法2: 如果postIds数量较多，分批查询
    // 方法3: 如果分批查询有问题，查询所有hashtag然后过滤
    
    let allHashtags: { content: string; postId: string }[] = [];
    
    // 由于Supabase的.in()查询可能有限制，我们使用更保守的方法
    // 先尝试查询所有hashtag，然后过滤出属于已发布贴文的
    if (postIds.length > 200) {
      // 查询所有hashtag，然后过滤
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allHashtagsData, error: allHashtagsError } = await (supabase as any)
        .from('Hashtag')
        .select('content, postId');
      
      if (allHashtagsError) {
        // 如果查询所有hashtag失败，回退到分批查询
        const batchSize = 100;
        for (let i = 0; i < postIds.length; i += batchSize) {
          const batch = postIds.slice(i, i + batchSize);
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: hashtags, error: hashtagsError } = await (supabase as any)
              .from('Hashtag')
              .select('content, postId')
              .in('postId', batch);
            
            if (!hashtagsError && hashtags) {
              allHashtags = allHashtags.concat(hashtags);
            }
          } catch (error) {
            // 继续处理下一批次
          }
        }
      } else {
        // 过滤出属于已发布贴文的hashtag
        allHashtags = (allHashtagsData || []).filter((h: { postId: string }) => 
          postIdsSet.has(h.postId)
        );
      }
    } else {
      // postIds数量较少，直接查询
      const batchSize = 100;
      for (let i = 0; i < postIds.length; i += batchSize) {
        const batch = postIds.slice(i, i + batchSize);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: hashtags, error: hashtagsError } = await (supabase as any)
            .from('Hashtag')
            .select('content, postId')
            .in('postId', batch);
          
          if (!hashtagsError && hashtags) {
            allHashtags = allHashtags.concat(hashtags);
          }
        } catch (error) {
          // 继续处理下一批次
        }
      }
    }

    // 统计每个标签的使用次数
    const tagCounts = new Map<string, number>();
    (allHashtags || []).forEach((item: { content: string }) => {
      const tag = item.content;
      if (tag && typeof tag === 'string' && tag.trim().length > 0) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

