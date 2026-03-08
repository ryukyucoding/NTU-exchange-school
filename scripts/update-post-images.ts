#!/usr/bin/env tsx
/**
 * 更新 Supabase Post 中的圖片 URL (從 Supabase Storage 到 Cloudinary)
 * 基於已遷移的 content.json 檔案
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updatePostImages(studentId: string) {
  // 讀取 content.json
  const contentPath = path.join(
    __dirname,
    '..',
    'scraper',
    'experiences',
    'pdf_extracts',
    studentId,
    'content.json'
  );

  if (!fs.existsSync(contentPath)) {
    console.error(`❌ 找不到 ${contentPath}`);
    return;
  }

  const contentData = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  const studentName = contentData.student_info.name;
  const schoolName = contentData.student_info.school;

  console.log(`\n🔍 處理學生: ${studentName} (${schoolName})`);

  // 搜尋對應的 Post
  const { data: posts, error } = await supabase
    .from('Post')
    .select('id, title, content')
    .ilike('content', `%${studentName}%`)
    .ilike('content', `%${schoolName}%`)
    .eq('status', 'published');

  if (error) {
    console.error('❌ 查詢錯誤:', error.message);
    return;
  }

  if (!posts || posts.length === 0) {
    console.log(`⚠️  未找到對應的 Post`);
    return;
  }

  console.log(`✓ 找到 ${posts.length} 個匹配的 Post`);

  // 更新每個 Post
  for (const post of posts) {
    let updatedContent = post.content;
    let replacementCount = 0;

    // 替換圖片 URL
    for (const img of contentData.images) {
      if (img.migrated_from === 'supabase' && img.migrated_from_url) {
        const oldUrl = img.migrated_from_url;
        const newUrl = img.url;

        if (updatedContent.includes(oldUrl)) {
          updatedContent = updatedContent.replaceAll(oldUrl, newUrl);
          replacementCount++;
        }
      }
    }

    if (replacementCount > 0) {
      // 更新 Post
      const { error: updateError } = await supabase
        .from('Post')
        .update({
          content: updatedContent,
        })
        .eq('id', post.id);

      if (updateError) {
        console.error(`❌ 更新 Post ${post.id} 失敗:`, updateError.message);
      } else {
        console.log(`✓ 已更新 Post ${post.id} (${replacementCount} 個圖片 URL)`);
      }
    } else {
      console.log(`ℹ️  Post ${post.id} 沒有需要替換的圖片 URL`);
    }
  }
}

// 主程式
const studentId = process.argv[2] || '12894';
console.log(`📝 更新學生 ${studentId} 的 Post 圖片 URL...`);

updatePostImages(studentId).catch(console.error);
