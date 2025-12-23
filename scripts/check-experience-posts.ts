#!/usr/bin/env tsx
/**
 * 檢查 Supabase 中是否已有心得文章數據
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少必要的環境變數:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkExistingPosts() {
  console.log('🔍 檢查 Supabase 中的心得文章...\n');

  try {
    // 查詢所有已發布的貼文
    const { data: posts, error } = await supabase
      .from('Post')
      .select(`
        id,
        title,
        content,
        createdAt,
        author:User!Post_authorId_fkey (
          id,
          name,
          userID,
          email
        )
      `)
      .eq('status', 'published')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('❌ 查詢失敗:', error);
      return;
    }

    console.log(`📊 找到 ${posts?.length || 0} 篇已發布的貼文\n`);

    if (!posts || posts.length === 0) {
      console.log('ℹ️  Supabase 中沒有心得文章數據');
      return;
    }

    // 分析貼文內容，看是否包含心得相關的內容
    const experiencePosts = posts.filter(post => {
      const content = post.content || '';
      // 檢查是否包含心得相關的關鍵字或格式
      return content.includes('九州大學') ||
             content.includes('交換心得') ||
             content.includes('![12894_') || // 圖片標記
             content.includes('董同學') || // 學生名稱
             content.includes('JLCC'); // 課程名稱
    });

    console.log(`🎯 找到 ${experiencePosts.length} 篇疑似心得文章:\n`);

    experiencePosts.forEach((post, index) => {
      console.log(`${index + 1}. ID: ${post.id}`);
      console.log(`   標題: ${post.title}`);
      console.log(`   作者: ${post.author?.[0]?.name || '未知'} (${post.author?.[0]?.userID || '未知'})`);
      console.log(`   創建時間: ${new Date(post.createdAt).toLocaleString('zh-TW')}`);
      console.log(`   內容長度: ${post.content?.length || 0} 字符`);

      // 檢查是否包含 Supabase Storage URL
      const hasSupabaseUrl = post.content?.includes('supabase.co/storage');
      console.log(`   包含 Supabase URL: ${hasSupabaseUrl ? '✅' : '❌'}`);

      // 檢查是否包含 Cloudinary URL
      const hasCloudinaryUrl = post.content?.includes('cloudinary.com');
      console.log(`   包含 Cloudinary URL: ${hasCloudinaryUrl ? '✅' : '❌'}\n`);
    });

    return experiencePosts;

  } catch (error) {
    console.error('❌ 檢查過程發生錯誤:', error);
  }
}

async function checkLocalData() {
  console.log('📁 檢查本地心得數據...\n');

  const pdfExtractsDir = path.join(process.cwd(), 'scraper', 'experiences', 'pdf_extracts');

  if (!fs.existsSync(pdfExtractsDir)) {
    console.log('❌ 找不到 pdf_extracts 目錄');
    return [];
  }

  const studentDirs = fs.readdirSync(pdfExtractsDir)
    .map(dir => path.join(pdfExtractsDir, dir))
    .filter(dir => fs.statSync(dir).isDirectory());

  console.log(`📊 找到 ${studentDirs.length} 個學生目錄\n`);

  const localData = [];

  for (const studentDir of studentDirs) {
    const contentFile = path.join(studentDir, 'content.json');
    if (!fs.existsSync(contentFile)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(contentFile, 'utf-8'));
      const studentId = path.basename(studentDir);

      localData.push({
        studentId,
        studentInfo: data.student_info,
        imageCount: data.images?.length || 0,
        hasSupabaseUrl: data.images?.some((img: any) => img.url?.includes('supabase.co')),
        hasCloudinaryUrl: data.images?.some((img: any) => img.url?.includes('cloudinary.com')),
      });
    } catch (error) {
      console.error(`❌ 讀取 ${contentFile} 失敗:`, error);
    }
  }

  console.log('📋 本地數據摘要:');
  localData.forEach((item, index) => {
    console.log(`${index + 1}. 學生 ID: ${item.studentId}`);
    console.log(`   學校: ${item.studentInfo?.school || '未知'}`);
    console.log(`   圖片數量: ${item.imageCount}`);
    console.log(`   Supabase URL: ${item.hasSupabaseUrl ? '✅' : '❌'}`);
    console.log(`   Cloudinary URL: ${item.hasCloudinaryUrl ? '✅' : '❌'}\n`);
  });

  return localData;
}

async function main() {
  console.log('🔍 檢查心得數據狀態\n');
  console.log('=' .repeat(60));

  const existingPosts = await checkExistingPosts();
  console.log('-'.repeat(60));
  const localData = await checkLocalData();

  console.log('=' .repeat(60));
  console.log('📋 總結:');
  console.log(`   Supabase 中疑似心得文章: ${existingPosts?.length || 0} 篇`);
  console.log(`   本地學生數據: ${localData.length} 個`);
  console.log(`   需要遷移的圖片: ${localData.filter(d => d.hasSupabaseUrl && !d.hasCloudinaryUrl).length} 個學生`);

  if (existingPosts && existingPosts.length > 0) {
    console.log('\n✅ 發現 Supabase 中已有心得文章，需要更新圖片 URL');
  } else {
    console.log('\nℹ️  Supabase 中沒有心得文章數據');
  }
}

main().catch(console.error);
