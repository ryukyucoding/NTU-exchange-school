#!/usr/bin/env tsx
/**
 * 檢查已遷移的 Post
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkPost() {
  const postId = 'c5ee2f18-7852-4ecb-83d2-36ee32cc2ca3';

  const { data, error } = await supabase
    .from('Post')
    .select('id, title, content')
    .eq('id', postId)
    .single();

  if (error) {
    console.error('❌ 查詢錯誤:', error.message);
    return;
  }

  console.log(`📄 Post: ${data.title}`);
  console.log(`ID: ${data.id}\n`);

  // 檢查 Cloudinary URLs
  const cloudinaryUrls = data.content.match(/https:\/\/res\.cloudinary\.com\/[^\s)]+/g);
  console.log(`✓ Cloudinary 圖片: ${cloudinaryUrls?.length || 0} 個`);
  if (cloudinaryUrls && cloudinaryUrls.length > 0) {
    cloudinaryUrls.slice(0, 3).forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
  }

  // 檢查 Supabase Storage URLs
  const supabaseUrls = data.content.match(/https:\/\/[^\/]+\.supabase\.co\/storage\/v1\/object\/public\/experience-images\/[^\s)]+/g);
  console.log(`\n⚠️  Supabase Storage 圖片: ${supabaseUrls?.length || 0} 個`);
  if (supabaseUrls && supabaseUrls.length > 0) {
    supabaseUrls.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
  }
}

checkPost().catch(console.error);
