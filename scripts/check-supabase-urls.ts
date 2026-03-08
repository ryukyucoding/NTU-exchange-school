#!/usr/bin/env tsx
/**
 * 檢查所有 Posts 中還有哪些包含 Supabase Storage URL
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface PostWithSupabaseUrls {
  id: string;
  title: string;
  status: string;
  supabaseUrls: string[];
  cloudinaryUrls: string[];
}

function extractSupabaseImageUrls(content: string): string[] {
  const regex = /https:\/\/[^\/]+\.supabase\.co\/storage\/v1\/object\/public\/experience-images\/([^\/]+)\/([^\s\)]+)/g;
  const urls: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    urls.push(match[0]);
  }

  return [...new Set(urls)];
}

function extractCloudinaryUrls(content: string): string[] {
  const regex = /https:\/\/res\.cloudinary\.com\/[^\s\)]+/g;
  const urls: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    urls.push(match[0]);
  }

  return [...new Set(urls)];
}

async function checkAllPosts() {
  console.log('='.repeat(60));
  console.log('🔍 檢查包含 Supabase Storage URL 的 Posts');
  console.log('='.repeat(60));

  // 查詢所有包含 supabase.co/storage 的 Posts
  const { data: posts, error } = await supabase
    .from('Post')
    .select('id, title, content, status')
    .like('content', '%supabase.co/storage%')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('❌ 查詢錯誤:', error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log('\n✓ 太棒了！沒有任何 Post 包含 Supabase Storage URL');
    console.log('所有圖片已成功遷移到 Cloudinary！');
    return;
  }

  console.log(`\n找到 ${posts.length} 個包含 Supabase Storage URL 的 Posts\n`);

  const postsWithUrls: PostWithSupabaseUrls[] = [];

  for (const post of posts) {
    const supabaseUrls = extractSupabaseImageUrls(post.content);
    const cloudinaryUrls = extractCloudinaryUrls(post.content);

    if (supabaseUrls.length > 0) {
      postsWithUrls.push({
        id: post.id,
        title: post.title,
        status: post.status,
        supabaseUrls,
        cloudinaryUrls,
      });
    }
  }

  // 按 Supabase URL 數量排序
  postsWithUrls.sort((a, b) => b.supabaseUrls.length - a.supabaseUrls.length);

  console.log('詳細列表：\n');

  postsWithUrls.forEach((post, index) => {
    console.log(`${index + 1}. ${post.title}`);
    console.log(`   ID: ${post.id}`);
    console.log(`   狀態: ${post.status}`);
    console.log(`   Supabase URLs: ${post.supabaseUrls.length} 個`);
    console.log(`   Cloudinary URLs: ${post.cloudinaryUrls.length} 個`);

    // 顯示前 3 個 Supabase URL
    if (post.supabaseUrls.length > 0) {
      console.log('   範例 URL:');
      post.supabaseUrls.slice(0, 3).forEach((url, i) => {
        // 從 URL 中提取學生 ID 和檔案名稱
        const match = url.match(/\/experience-images\/([^\/]+)\/([^\s\)]+)/);
        if (match) {
          console.log(`     ${i + 1}. ${match[1]}/${match[2]}`);
        } else {
          console.log(`     ${i + 1}. ${url}`);
        }
      });
      if (post.supabaseUrls.length > 3) {
        console.log(`     ... 還有 ${post.supabaseUrls.length - 3} 個`);
      }
    }
    console.log('');
  });

  // 統計資訊
  const totalSupabaseUrls = postsWithUrls.reduce((sum, post) => sum + post.supabaseUrls.length, 0);
  const totalCloudinaryUrls = postsWithUrls.reduce((sum, post) => sum + post.cloudinaryUrls.length, 0);

  console.log('='.repeat(60));
  console.log('📊 統計總結');
  console.log('='.repeat(60));
  console.log(`包含 Supabase URL 的 Posts: ${postsWithUrls.length}`);
  console.log(`總 Supabase URLs: ${totalSupabaseUrls}`);
  console.log(`總 Cloudinary URLs: ${totalCloudinaryUrls}`);

  // 生成重試用的 Post ID 列表
  console.log('\n' + '='.repeat(60));
  console.log('🔄 可用於重試的 Post ID 列表');
  console.log('='.repeat(60));
  console.log('複製以下內容到 retry-failed-posts.ts 的 FAILED_POST_IDS:\n');
  console.log('[');
  postsWithUrls.forEach((post, index) => {
    const comma = index < postsWithUrls.length - 1 ? ',' : '';
    console.log(`  '${post.id}'${comma} // ${post.title}`);
  });
  console.log(']');

  console.log('\n或使用以下指令直接重試所有：\n');
  console.log(`npx tsx scripts/retry-failed-posts.ts ${postsWithUrls.map(p => p.id).join(' ')}`);
  console.log('\n' + '='.repeat(60));
}

checkAllPosts().catch(console.error);
