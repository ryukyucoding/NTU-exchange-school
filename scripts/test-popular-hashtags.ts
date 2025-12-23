/**
 * 测试热门话题API
 * 运行方式: npx tsx scripts/test-popular-hashtags.ts
 */

import { getSupabaseServer } from '../src/lib/db';

async function testPopularHashtags() {
  console.log('=== 测试热门话题API ===\n');

  const supabase = getSupabaseServer();
  
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }

  try {
    // 1. 检查已发布的贴文数量
    console.log('1. 检查已发布的贴文...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: publishedPosts, error: postsError } = await (supabase as any)
      .from('Post')
      .select('id, status, deletedAt')
      .eq('status', 'published')
      .is('deletedAt', null);

    if (postsError) {
      console.error('❌ 查询贴文失败:', postsError);
      return;
    }

    console.log(`✅ 找到 ${publishedPosts?.length || 0} 篇已发布的贴文`);

    if (!publishedPosts || publishedPosts.length === 0) {
      console.log('⚠️  没有已发布的贴文，无法统计热门话题');
      return;
    }

    // 2. 检查Hashtag表的总数
    console.log('\n2. 检查Hashtag表...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allHashtags, error: hashtagsError } = await (supabase as any)
      .from('Hashtag')
      .select('postId, content')
      .limit(100);

    if (hashtagsError) {
      console.error('❌ 查询Hashtag失败:', hashtagsError);
      return;
    }

    console.log(`✅ Hashtag表中共有数据（前100条）: ${allHashtags?.length || 0} 条`);

    // 3. 检查已发布贴文的hashtag
    const postIds = (publishedPosts as { id: string }[]).map((p) => p.id);
    console.log(`\n3. 检查这 ${postIds.length} 篇贴文的hashtag...`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hashtags, error: hashtagsQueryError } = await (supabase as any)
      .from('Hashtag')
      .select('postId, content')
      .in('postId', postIds.slice(0, 100)); // 先查前100个

    if (hashtagsQueryError) {
      console.error('❌ 查询hashtag失败:', hashtagsQueryError);
      return;
    }

    console.log(`✅ 找到 ${hashtags?.length || 0} 个hashtag（前100篇贴文）`);

    if (hashtags && hashtags.length > 0) {
      // 统计每个标签的使用次数
      const tagCounts = new Map<string, number>();
      hashtags.forEach((item: { content: string }) => {
        const tag = item.content;
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });

      // 转换为数组并按使用次数排序，取前10名
      const popularTags = Array.from(tagCounts.entries())
        .map(([content, count]) => ({ content, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      console.log('\n4. 热门话题（前10名）:');
      if (popularTags.length > 0) {
        popularTags.forEach((tag, index) => {
          console.log(`   ${index + 1}. #${tag.content} (${tag.count}次)`);
        });
      } else {
        console.log('   ⚠️  没有找到热门话题');
      }
    } else {
      console.log('⚠️  没有找到hashtag数据');
    }

    // 4. 检查是否有草稿包含hashtag
    console.log('\n5. 检查草稿中的hashtag...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: draftPosts, error: draftError } = await (supabase as any)
      .from('Post')
      .select('id')
      .eq('status', 'draft')
      .limit(10);

    if (!draftError && draftPosts && draftPosts.length > 0) {
      const draftPostIds = draftPosts.map((p: { id: string }) => p.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: draftHashtags } = await (supabase as any)
        .from('Hashtag')
        .select('postId, content')
        .in('postId', draftPostIds);

      console.log(`   草稿中有 ${draftHashtags?.length || 0} 个hashtag（这些不会被统计）`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testPopularHashtags();

