#!/usr/bin/env tsx
/**
 * 在刪除 Supabase Storage bucket 之前的最終驗證
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyBeforeDelete() {
  console.log('='.repeat(60));
  console.log('🔍 Supabase Storage 刪除前最終驗證');
  console.log('='.repeat(60));

  // 1. 檢查所有 Posts
  console.log('\n1️⃣ 檢查所有 Posts...');
  const { data: allPosts, error: postsError } = await supabase
    .from('Post')
    .select('id, title, content, status', { count: 'exact' });

  if (postsError) {
    console.error('❌ 查詢 Posts 失敗:', postsError.message);
    return;
  }

  console.log(`   總 Posts 數量: ${allPosts?.length || 0}`);

  // 檢查包含 Supabase Storage URL 的 Posts
  const postsWithSupabase = allPosts?.filter(post =>
    post.content.includes('supabase.co/storage')
  ) || [];

  console.log(`   包含 Supabase Storage URL 的 Posts: ${postsWithSupabase.length}`);

  if (postsWithSupabase.length > 0) {
    console.log('\n   ⚠️  警告：仍有以下 Posts 包含 Supabase Storage URL:');
    postsWithSupabase.forEach(post => {
      console.log(`      - ${post.title} (${post.id}, ${post.status})`);
    });
  } else {
    console.log('   ✓ 所有 Posts 都不包含 Supabase Storage URL');
  }

  // 2. 檢查 Cloudinary URLs
  console.log('\n2️⃣ 檢查 Cloudinary URLs...');
  const postsWithCloudinary = allPosts?.filter(post =>
    post.content.includes('res.cloudinary.com')
  ) || [];

  console.log(`   包含 Cloudinary URL 的 Posts: ${postsWithCloudinary.length}`);

  // 3. 檢查沒有任何圖片 URL 的 Posts
  const postsWithoutImages = allPosts?.filter(post =>
    !post.content.includes('res.cloudinary.com') &&
    !post.content.includes('supabase.co/storage')
  ) || [];

  console.log(`   沒有圖片 URL 的 Posts: ${postsWithoutImages.length}`);

  // 4. 檢查 Supabase Storage bucket
  console.log('\n3️⃣ 檢查 Supabase Storage bucket...');
  try {
    const { data: files, error: storageError } = await supabase.storage
      .from('experience-images')
      .list('', {
        limit: 1000,
      });

    if (storageError) {
      console.error('   ❌ 無法讀取 Storage:', storageError.message);
    } else {
      console.log(`   Storage 中的檔案數量: ${files?.length || 0}`);
      if (files && files.length > 0) {
        console.log('   前 10 個檔案:');
        files.slice(0, 10).forEach(file => {
          console.log(`      - ${file.name}`);
        });
        if (files.length > 10) {
          console.log(`      ... 還有 ${files.length - 10} 個檔案`);
        }
      }
    }
  } catch (error) {
    console.error('   ❌ Storage 檢查錯誤:', error);
  }

  // 5. 統計總結
  console.log('\n' + '='.repeat(60));
  console.log('📊 最終驗證結果');
  console.log('='.repeat(60));
  console.log(`總 Posts: ${allPosts?.length || 0}`);
  console.log(`包含 Supabase Storage URL: ${postsWithSupabase.length}`);
  console.log(`包含 Cloudinary URL: ${postsWithCloudinary.length}`);
  console.log(`沒有圖片: ${postsWithoutImages.length}`);

  console.log('\n' + '='.repeat(60));

  if (postsWithSupabase.length === 0) {
    console.log('✅ 安全檢查通過！');
    console.log('\n可以安全刪除 Supabase Storage bucket 了！');
    console.log('\n建議步驟：');
    console.log('1. 先在 Supabase Dashboard 中備份 bucket（如果需要）');
    console.log('2. 刪除 experience-images bucket');
    console.log('3. 再次執行 npm run check-supabase-urls 確認');
  } else {
    console.log('⚠️  警告：仍有 Posts 包含 Supabase Storage URL');
    console.log('請先執行遷移或檢查這些 Posts');
  }

  console.log('='.repeat(60));
}

verifyBeforeDelete().catch(console.error);
