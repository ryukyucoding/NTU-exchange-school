#!/usr/bin/env tsx
/**
 * 測試 Post 更新邏輯
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testPostUpdate() {
  const studentName = '董同學';
  const schoolName = '九州大學';

  console.log(`🔍 搜尋包含 "${studentName}" 和 "${schoolName}" 的 Post...`);

  // 使用修正後的搜尋邏輯
  const { data, error } = await supabase
    .from('Post')
    .select('id, title, content')
    .ilike('content', `%${studentName}%`)
    .ilike('content', `%${schoolName}%`)
    .eq('status', 'published');

  if (error) {
    console.error('❌ 查詢錯誤:', error.message);
    return;
  }

  console.log(`✓ 找到 ${data?.length || 0} 個匹配的 Post`);

  data?.forEach((post) => {
    console.log(`\n📄 Post ID: ${post.id}`);
    console.log(`   標題: ${post.title}`);

    // 檢查是否包含 Supabase Storage URL
    const supabaseUrls = post.content.match(/https:\/\/dvqlakvtakiwhwgjmsgu\.supabase\.co\/storage\/v1\/object\/public\/experience-images\/12894\/\d+\.jpg/g);

    if (supabaseUrls) {
      console.log(`   🖼️  找到 ${supabaseUrls.length} 個 Supabase Storage 圖片 URL`);
      console.log(`   範例: ${supabaseUrls[0]}`);
    } else {
      console.log(`   ℹ️  沒有找到 Supabase Storage 圖片 URL`);

      // 檢查是否已經是 Cloudinary URL
      const cloudinaryUrls = post.content.match(/https:\/\/res\.cloudinary\.com\/[^)]+/g);
      if (cloudinaryUrls) {
        console.log(`   ✓ 找到 ${cloudinaryUrls.length} 個 Cloudinary 圖片 URL（可能已遷移）`);
      }
    }
  });
}

testPostUpdate().catch(console.error);
