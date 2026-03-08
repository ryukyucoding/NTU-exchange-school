#!/usr/bin/env tsx
/**
 * 從 Supabase Posts 出發的圖片遷移腳本
 *
 * 流程：
 * 1. 查詢所有已發布的 Posts
 * 2. 從 Post content 中提取 Supabase Storage 圖片 URL
 * 3. 找到對應的本地圖片文件
 * 4. 上傳到 Cloudinary
 * 5. 更新 Post content 中的 URL
 * 6. 更新對應的 content.json
 * 7. 從 Supabase Storage 刪除圖片
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少 Supabase 環境變數');
  process.exit(1);
}

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.error('❌ 缺少 Cloudinary 環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ImageMapping {
  oldUrl: string;
  newUrl: string;
  studentId: string;
  filename: string;
  localPath: string;
}

interface MigrationResult {
  postId: string;
  postTitle: string;
  imagesFound: number;
  imagesMigrated: number;
  imagesFailed: number;
  errors: string[];
}

/**
 * 從 Post content 中提取 Supabase Storage 圖片 URL
 */
function extractSupabaseImageUrls(content: string): string[] {
  const regex = /https:\/\/[^\/]+\.supabase\.co\/storage\/v1\/object\/public\/experience-images\/([^\/]+)\/([^\s\)]+)/g;
  const urls: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    urls.push(match[0]);
  }

  return [...new Set(urls)]; // 去重
}

/**
 * 從 URL 解析學生 ID 和檔案名稱
 */
function parseImageUrl(url: string): { studentId: string; filename: string } | null {
  const match = url.match(/\/experience-images\/([^\/]+)\/(.+)$/);
  if (!match) return null;

  return {
    studentId: match[1],
    filename: decodeURIComponent(match[2]),
  };
}

/**
 * 找到本地圖片文件
 */
function findLocalImage(studentId: string, filename: string): string | null {
  const possiblePaths = [
    path.join(__dirname, '..', 'scraper', 'experiences', 'pdf_extracts', studentId, 'images', filename),
    path.join(__dirname, '..', 'scraper', 'experiences', 'pdf_extracts', studentId, filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * 壓縮圖片（使用與前端相同的邏輯）
 * 最大尺寸: 1920px
 * 目標大小: 5MB
 */
async function compressImage(imagePath: string): Promise<Buffer> {
  const maxDimension = 1920;
  const maxSizeMB = 5;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  let imageBuffer = fs.readFileSync(imagePath);
  const metadata = await sharp(imageBuffer).metadata();

  let width = metadata.width || 0;
  let height = metadata.height || 0;

  // 如果圖片太大，先縮小尺寸
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }
  }

  // 嘗試不同的質量，直到文件大小小於目標大小
  let quality = 90;
  let compressed: Buffer;

  while (quality >= 10) {
    compressed = await sharp(imageBuffer)
      .resize(width, height, { fit: 'inside' })
      .jpeg({ quality })
      .toBuffer();

    if (compressed.length <= maxSizeBytes || quality <= 10) {
      return compressed;
    }

    quality -= 10;
  }

  return compressed!;
}

/**
 * 上傳圖片到 Cloudinary
 */
async function uploadToCloudinary(imagePath: string, filename: string): Promise<string | null> {
  try {
    const stats = fs.statSync(imagePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    let imageBuffer: Buffer;

    // 如果圖片超過 5MB，先壓縮
    if (fileSizeInMB > 5) {
      console.log(`  🔧 壓縮圖片 ${filename} (${fileSizeInMB.toFixed(2)} MB)...`);
      imageBuffer = await compressImage(imagePath);
      const compressedSizeMB = imageBuffer.length / (1024 * 1024);
      console.log(`  ✓ 壓縮完成: ${compressedSizeMB.toFixed(2)} MB`);

      // 即使壓縮後仍超過 10MB，跳過
      if (compressedSizeMB > 10) {
        console.error(`  ⚠️  壓縮後仍過大 ${filename} (${compressedSizeMB.toFixed(2)} MB > 10 MB)`);
        return null;
      }
    } else {
      imageBuffer = fs.readFileSync(imagePath);
    }

    const base64Data = imageBuffer.toString('base64');
    const ext = path.extname(filename).slice(1).toLowerCase();
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext;
    const dataUri = `data:image/${mimeType};base64,${base64Data}`;

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const safeFilename = `exp_${timestamp}_${randomStr}`;

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const response = await axios.post(cloudinaryUrl, {
      file: dataUri,
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
      filename_override: safeFilename,
      folder: 'experience-images',
    });

    return response.data.secure_url;
  } catch (error) {
    console.error(`  ❌ 上傳失敗 ${filename}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * 從 Supabase Storage 刪除圖片
 */
async function deleteFromSupabaseStorage(studentId: string, filename: string): Promise<boolean> {
  try {
    const filePath = `${studentId}/${filename}`;
    const { error } = await supabase.storage
      .from('experience-images')
      .remove([filePath]);

    if (error) {
      console.error(`  ⚠️  刪除失敗 ${filePath}:`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`  ❌ 刪除錯誤 ${studentId}/${filename}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 更新 content.json
 */
function updateContentJson(studentId: string, oldUrl: string, newUrl: string): boolean {
  try {
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
      console.error(`  ⚠️  找不到 content.json: ${contentPath}`);
      return false;
    }

    const contentData = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
    let updated = false;

    for (const img of contentData.images || []) {
      if (img.url === oldUrl || img.migrated_from_url === oldUrl) {
        img.migrated_from_url = oldUrl;
        img.url = newUrl;
        img.migrated_from = 'supabase';
        img.migrated_at = Math.floor(Date.now() / 1000);
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(contentPath, JSON.stringify(contentData, null, 2), 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`  ❌ 更新 content.json 失敗:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 遷移單個 Post 的圖片
 */
async function migratePostImages(
  postId: string,
  postTitle: string,
  content: string,
  dryRun: boolean = false
): Promise<MigrationResult> {
  const result: MigrationResult = {
    postId,
    postTitle,
    imagesFound: 0,
    imagesMigrated: 0,
    imagesFailed: 0,
    errors: [],
  };

  // 提取所有 Supabase Storage 圖片 URL
  const imageUrls = extractSupabaseImageUrls(content);
  result.imagesFound = imageUrls.length;

  if (imageUrls.length === 0) {
    return result;
  }

  console.log(`\n📄 Post: ${postTitle} (ID: ${postId})`);
  console.log(`   找到 ${imageUrls.length} 個 Supabase Storage 圖片`);

  const imageMappings: ImageMapping[] = [];

  // 處理每個圖片
  for (const oldUrl of imageUrls) {
    const parsed = parseImageUrl(oldUrl);
    if (!parsed) {
      result.errors.push(`無法解析 URL: ${oldUrl}`);
      result.imagesFailed++;
      continue;
    }

    const { studentId, filename } = parsed;

    // 找到本地圖片
    const localPath = findLocalImage(studentId, filename);
    if (!localPath) {
      result.errors.push(`找不到本地圖片: ${studentId}/${filename}`);
      result.imagesFailed++;
      console.log(`  ❌ 找不到本地圖片: ${studentId}/${filename}`);
      continue;
    }

    if (dryRun) {
      console.log(`  🔍 [DRY RUN] 會遷移: ${studentId}/${filename}`);
      result.imagesMigrated++;
      continue;
    }

    // 上傳到 Cloudinary
    console.log(`  ☁️  上傳中: ${studentId}/${filename}`);
    const newUrl = await uploadToCloudinary(localPath, filename);

    if (!newUrl) {
      result.errors.push(`上傳失敗: ${studentId}/${filename}`);
      result.imagesFailed++;
      continue;
    }

    console.log(`  ✓ 已上傳: ${filename}`);

    // 記錄映射
    imageMappings.push({
      oldUrl,
      newUrl,
      studentId,
      filename,
      localPath,
    });

    // 更新 content.json
    updateContentJson(studentId, oldUrl, newUrl);

    result.imagesMigrated++;
  }

  // 更新 Post content
  if (!dryRun && imageMappings.length > 0) {
    let updatedContent = content;

    for (const mapping of imageMappings) {
      updatedContent = updatedContent.replaceAll(mapping.oldUrl, mapping.newUrl);
    }

    const { error } = await supabase
      .from('Post')
      .update({ content: updatedContent })
      .eq('id', postId);

    if (error) {
      result.errors.push(`更新 Post 失敗: ${error.message}`);
      console.error(`  ❌ 更新 Post 失敗:`, error.message);
    } else {
      console.log(`  ✓ 已更新 Post content (${imageMappings.length} 個圖片)`);

      // 刪除 Supabase Storage 中的圖片
      console.log(`  🗑️  刪除 Supabase Storage 圖片...`);
      for (const mapping of imageMappings) {
        const deleted = await deleteFromSupabaseStorage(mapping.studentId, mapping.filename);
        if (deleted) {
          console.log(`  ✓ 已刪除: ${mapping.studentId}/${mapping.filename}`);
        }
      }
    }
  }

  return result;
}

// 日誌相關
let logStream: fs.WriteStream | null = null;
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

function initLogger(filename: string = 'migration-log.txt') {
  const logPath = path.join(__dirname, '..', filename);
  logStream = fs.createWriteStream(logPath, { flags: 'a' });

  const timestamp = new Date().toISOString();
  logStream.write(`\n${'='.repeat(60)}\n`);
  logStream.write(`Migration started at: ${timestamp}\n`);
  logStream.write(`${'='.repeat(60)}\n\n`);

  // 覆蓋 console.log 和 console.error
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    originalConsoleLog(...args);
    if (logStream) {
      logStream.write(message + '\n');
    }
  };

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    originalConsoleError(...args);
    if (logStream) {
      logStream.write('[ERROR] ' + message + '\n');
    }
  };
}

function closeLogger() {
  if (logStream) {
    const timestamp = new Date().toISOString();
    logStream.write(`\n${'='.repeat(60)}\n`);
    logStream.write(`Migration ended at: ${timestamp}\n`);
    logStream.write(`${'='.repeat(60)}\n\n`);
    logStream.end();
  }

  // 恢復原始 console 函數
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}

/**
 * 主函數
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1] || '10') : undefined;

  // 初始化日誌
  initLogger();

  console.log('='.repeat(60));
  if (dryRun) {
    console.log('🔍 DRY RUN 模式 - 只顯示將要遷移的圖片');
  } else {
    console.log('🚀 開始從 Posts 遷移圖片到 Cloudinary');
  }
  console.log(`Cloudinary Cloud: ${CLOUDINARY_CLOUD_NAME}`);
  console.log('='.repeat(60));

  // 查詢所有已發布的 Posts
  console.log('\n📊 查詢 Posts...');
  let query = supabase
    .from('Post')
    .select('id, title, content')
    .eq('status', 'published')
    .like('content', '%supabase.co/storage%');

  if (limit) {
    query = query.limit(limit);
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error('❌ 查詢 Posts 失敗:', error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log('✓ 沒有需要遷移的 Posts（或所有圖片已遷移）');
    return;
  }

  console.log(`✓ 找到 ${posts.length} 個需要遷移的 Posts`);

  // 遷移統計
  const results: MigrationResult[] = [];
  let totalImages = 0;
  let totalMigrated = 0;
  let totalFailed = 0;

  // 處理每個 Post
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] 處理 Post...`);

    const result = await migratePostImages(post.id, post.title, post.content, dryRun);
    results.push(result);

    totalImages += result.imagesFound;
    totalMigrated += result.imagesMigrated;
    totalFailed += result.imagesFailed;

    // 避免請求過於頻繁
    if (!dryRun && i < posts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 顯示總結
  console.log('\n' + '='.repeat(60));
  console.log('📊 遷移總結');
  console.log('='.repeat(60));
  console.log(`處理的 Posts: ${posts.length}`);
  console.log(`找到的圖片: ${totalImages}`);
  console.log(`成功遷移: ${totalMigrated}`);
  console.log(`失敗: ${totalFailed}`);

  // 顯示錯誤
  const postsWithErrors = results.filter(r => r.errors.length > 0);
  if (postsWithErrors.length > 0) {
    console.log('\n⚠️  錯誤詳情:');
    for (const result of postsWithErrors) {
      console.log(`\n📄 ${result.postTitle} (${result.postId}):`);
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  if (dryRun) {
    console.log('✓ DRY RUN 完成');
  } else {
    console.log('✓ 遷移完成');
  }
  console.log('='.repeat(60));

  // 關閉日誌
  closeLogger();
}

main().catch((error) => {
  console.error(error);
  closeLogger();
  process.exit(1);
});
