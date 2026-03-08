#!/usr/bin/env tsx
/**
 * 重試失敗的 Posts 遷移
 *
 * 使用方法：
 * 1. 從 migration-log.txt 複製失敗的 Post ID
 * 2. 執行: npx tsx scripts/retry-failed-posts.ts <post-id-1> <post-id-2> ...
 *
 * 或者直接在檔案中修改 FAILED_POST_IDS 陣列
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

// 從 migration-log.txt 複製失敗的 Post ID 到這裡
const FAILED_POST_IDS = [
  'cacd307c-6c66-48d2-8db4-a87d704bcd2b', // 諾丁漢大學交換心得
  'ee8de423-199a-4238-aafb-e6eddcae18d4', // 維也納大學交換心得
  '6b32e012-a535-4cdd-ac40-629f2ad90dbc', // 慕尼黑工業大學交換心得
  'c196487b-300a-43cb-a6a4-491e443a306d', // 阿姆斯特丹自由大學交換心得
  '8feb4089-7644-4f51-a1de-05d137fabe0d', // 奈梅亨大學交換心得
];

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

function extractSupabaseImageUrls(content: string): string[] {
  const regex = /https:\/\/[^\/]+\.supabase\.co\/storage\/v1\/object\/public\/experience-images\/([^\/]+)\/([^\s\)]+)/g;
  const urls: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    urls.push(match[0]);
  }

  return [...new Set(urls)];
}

function parseImageUrl(url: string): { studentId: string; filename: string } | null {
  const match = url.match(/\/experience-images\/([^\/]+)\/(.+)$/);
  if (!match) return null;

  return {
    studentId: match[1],
    filename: decodeURIComponent(match[2]),
  };
}

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

async function compressImage(imagePath: string): Promise<Buffer> {
  const maxDimension = 1920;
  const maxSizeMB = 5;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  let imageBuffer = fs.readFileSync(imagePath);
  const metadata = await sharp(imageBuffer).metadata();

  let width = metadata.width || 0;
  let height = metadata.height || 0;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }
  }

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

async function uploadToCloudinary(imagePath: string, filename: string, retries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const stats = fs.statSync(imagePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      let imageBuffer: Buffer;

      if (fileSizeInMB > 5) {
        console.log(`  🔧 壓縮圖片 ${filename} (${fileSizeInMB.toFixed(2)} MB)...`);
        imageBuffer = await compressImage(imagePath);
        const compressedSizeMB = imageBuffer.length / (1024 * 1024);
        console.log(`  ✓ 壓縮完成: ${compressedSizeMB.toFixed(2)} MB`);

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
      }, {
        timeout: 60000, // 60 秒超時
      });

      return response.data.secure_url;
    } catch (error) {
      if (attempt < retries) {
        console.log(`  ⚠️  上傳失敗，重試 ${attempt}/${retries}: ${filename}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒後重試
      } else {
        console.error(`  ❌ 上傳失敗 ${filename}:`, error instanceof Error ? error.message : error);
        return null;
      }
    }
  }

  return null;
}

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

async function migratePostImages(
  postId: string,
  postTitle: string,
  content: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    postId,
    postTitle,
    imagesFound: 0,
    imagesMigrated: 0,
    imagesFailed: 0,
    errors: [],
  };

  const imageUrls = extractSupabaseImageUrls(content);
  result.imagesFound = imageUrls.length;

  if (imageUrls.length === 0) {
    console.log(`\n📄 Post: ${postTitle} (ID: ${postId})`);
    console.log(`   ✓ 沒有需要遷移的圖片（可能已全部遷移）`);
    return result;
  }

  console.log(`\n📄 Post: ${postTitle} (ID: ${postId})`);
  console.log(`   找到 ${imageUrls.length} 個 Supabase Storage 圖片`);

  const imageMappings: ImageMapping[] = [];

  for (const oldUrl of imageUrls) {
    const parsed = parseImageUrl(oldUrl);
    if (!parsed) {
      result.errors.push(`無法解析 URL: ${oldUrl}`);
      result.imagesFailed++;
      continue;
    }

    const { studentId, filename } = parsed;
    const localPath = findLocalImage(studentId, filename);

    if (!localPath) {
      result.errors.push(`找不到本地圖片: ${studentId}/${filename}`);
      result.imagesFailed++;
      console.log(`  ❌ 找不到本地圖片: ${studentId}/${filename}`);
      continue;
    }

    console.log(`  ☁️  上傳中: ${studentId}/${filename}`);
    const newUrl = await uploadToCloudinary(localPath, filename, 3); // 重試 3 次

    if (!newUrl) {
      result.errors.push(`上傳失敗: ${studentId}/${filename}`);
      result.imagesFailed++;
      continue;
    }

    console.log(`  ✓ 已上傳: ${filename}`);

    imageMappings.push({
      oldUrl,
      newUrl,
      studentId,
      filename,
      localPath,
    });

    updateContentJson(studentId, oldUrl, newUrl);
    result.imagesMigrated++;
  }

  if (imageMappings.length > 0) {
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

async function main() {
  const args = process.argv.slice(2);
  const postIds = args.length > 0 ? args : FAILED_POST_IDS;

  if (postIds.length === 0) {
    console.error('❌ 請提供 Post ID 或在檔案中設定 FAILED_POST_IDS');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('🔄 重試失敗的 Posts 遷移');
  console.log(`Cloudinary Cloud: ${CLOUDINARY_CLOUD_NAME}`);
  console.log(`要處理的 Posts: ${postIds.length} 個`);
  console.log('='.repeat(60));

  const results: MigrationResult[] = [];
  let totalImages = 0;
  let totalMigrated = 0;
  let totalFailed = 0;

  for (let i = 0; i < postIds.length; i++) {
    const postId = postIds[i];
    console.log(`\n[${i + 1}/${postIds.length}] 處理 Post ID: ${postId}`);

    const { data: post, error } = await supabase
      .from('Post')
      .select('id, title, content')
      .eq('id', postId)
      .single();

    if (error || !post) {
      console.error(`❌ 找不到 Post: ${postId}`);
      continue;
    }

    const result = await migratePostImages(post.id, post.title, post.content);
    results.push(result);

    totalImages += result.imagesFound;
    totalMigrated += result.imagesMigrated;
    totalFailed += result.imagesFailed;

    if (i < postIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 重試總結');
  console.log('='.repeat(60));
  console.log(`處理的 Posts: ${postIds.length}`);
  console.log(`找到的圖片: ${totalImages}`);
  console.log(`成功遷移: ${totalMigrated}`);
  console.log(`失敗: ${totalFailed}`);

  const postsWithErrors = results.filter(r => r.errors.length > 0);
  if (postsWithErrors.length > 0) {
    console.log('\n⚠️  仍有錯誤的 Posts:');
    for (const result of postsWithErrors) {
      console.log(`\n📄 ${result.postTitle} (${result.postId}):`);
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✓ 重試完成');
  console.log('='.repeat(60));
}

main().catch(console.error);
