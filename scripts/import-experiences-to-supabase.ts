import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 嘗試載入環境變數
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
  dotenv.config({ path: path.join(process.cwd(), '.env') });
} catch (e) {
  console.log('ℹ️  使用系統環境變數');
}

// ============ 環境變數 ============
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const EXPERIENCES_DIR = path.join(process.cwd(), 'scraper', 'experiences', 'pdf_extracts');
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');

// ============ 介面定義 ============
interface ExperienceData {
  student_info: {
    name: string;
    school: string;
    country: string;
    year_info: string;
    college: string;
    department: string;
    degree: string;
  };
  markdown: string;
  images: Array<{
    id: string;
    filename: string;
    local_path: string;
    url: string;
    format: string;
  }>;
}

interface SchoolMapping {
  id: number;
  name_zh: string;
  name_en: string | null;
  country_id: number;
}

interface BoardInfo {
  schoolBoard: { id: string; slug: string } | null;
  countryBoard: { id: string; slug: string } | null;
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ directory: string; reason: string }>;
}

// ============ 工具函數 ============
function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * 轉換圖片引用：![image_id] → ![](url)
 */
function transformImageReferences(markdown: string, images: ExperienceData['images']): string {
  const imageMap = new Map<string, string>();
  images.forEach(img => imageMap.set(img.id, img.url));

  return markdown.replace(/!\[([^\]]+)\]/g, (match, imageId) => {
    const url = imageMap.get(imageId);
    if (url) {
      return `![](${url})`;
    }
    console.warn(`   ⚠️  找不到圖片引用: ${imageId}`);
    return match;
  });
}

/**
 * 建立學校映射表
 */
async function buildSchoolMap(supabase: any): Promise<Map<string, SchoolMapping>> {
  console.log('🔍 載入學校資料...\n');

  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, name_zh, name_en, country_id');

  if (error) {
    console.error('❌ 載入學校失敗：', error);
    throw error;
  }

  if (!schools || schools.length === 0) {
    console.error('❌ 找不到任何學校資料');
    throw new Error('找不到學校資料');
  }

  console.log(`✅ 載入 ${schools.length} 個學校\n`);

  const schoolMap = new Map<string, SchoolMapping>();

  schools.forEach((school: any) => {
    // 1. 完整中文名稱
    schoolMap.set(school.name_zh, school);

    // 2. 去除括號內容的簡化名稱
    const simplified = school.name_zh.replace(/[（(].*?[）)]/g, '').trim();
    if (simplified !== school.name_zh && simplified) {
      schoolMap.set(simplified, school);
    }

    // 3. 括號內的別名
    const aliasMatch = school.name_zh.match(/[（(]([^）)]+)[）)]/);
    if (aliasMatch && aliasMatch[1]) {
      schoolMap.set(aliasMatch[1], school);
    }

    // 4. 英文名稱
    if (school.name_en) {
      schoolMap.set(school.name_en, school);
    }
  });

  return schoolMap;
}

/**
 * 查找學校（支援多層級匹配）
 */
function findSchoolByName(
  schoolName: string,
  schoolMap: Map<string, SchoolMapping>
): SchoolMapping | null {
  // 1. 直接匹配
  let school = schoolMap.get(schoolName);
  if (school) return school;

  // 2. 去除空白後匹配
  school = schoolMap.get(schoolName.trim());
  if (school) return school;

  // 3. 模糊匹配（包含關係）
  for (const [key, value] of schoolMap.entries()) {
    if (key.includes(schoolName) || schoolName.includes(key)) {
      console.log(`   📍 模糊匹配: "${schoolName}" → "${key}"`);
      return value;
    }
  }

  return null;
}

/**
 * 查找對應的 Board（學校看板 + 國家看板）
 */
async function findBoards(
  schoolId: number,
  countryId: number,
  supabase: any
): Promise<BoardInfo> {
  // 查詢學校看板
  const { data: schoolBoards } = await supabase
    .from('Board')
    .select('id, slug')
    .eq('type', 'school')
    .eq('schoolId', schoolId)
    .limit(1);

  // 查詢國家看板
  const { data: countryBoards } = await supabase
    .from('Board')
    .select('id, slug')
    .eq('type', 'country')
    .eq('country_id', countryId)
    .limit(1);

  return {
    schoolBoard: schoolBoards?.[0] || null,
    countryBoard: countryBoards?.[0] || null
  };
}

/**
 * 確保作者帳號存在
 */
async function ensureAuthorUser(supabase: any): Promise<string> {
  const authorEmail = 'tangyuan@tangyuan.com';
  const authorName = '心得小幫手';

  // 檢查是否已存在
  const { data: existingUsers } = await supabase
    .from('User')
    .select('id')
    .eq('email', authorEmail)
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    console.log(`✅ 作者帳號已存在: ${authorEmail}\n`);
    return existingUsers[0].id;
  }

  // 建立新帳號
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await supabase.from('User').insert({
    id: userId,
    name: authorName,
    email: authorEmail,
    createdAt: now,
    updatedAt: now
  });

  if (error) {
    console.error('❌ 建立作者帳號失敗：', error);
    throw error;
  }

  console.log(`✅ 建立作者帳號: ${authorEmail}\n`);
  return userId;
}

/**
 * 匯入單個心得
 */
async function importExperience(
  experienceDir: string,
  authorId: string,
  schoolMap: Map<string, SchoolMapping>,
  supabase: any,
  dryRun: boolean = false
): Promise<{ success: boolean; error?: string }> {

  try {
    // 1. 讀取 content.json
    const contentPath = path.join(experienceDir, 'content.json');
    const contentText = fs.readFileSync(contentPath, 'utf-8');
    const content: ExperienceData = JSON.parse(contentText);

    // 2. 尋找對應的學校
    const school = findSchoolByName(content.student_info.school, schoolMap);
    if (!school) {
      return {
        success: false,
        error: `找不到學校: ${content.student_info.school}`
      };
    }

    // 3. 查詢對應的 Boards
    const boards = await findBoards(school.id, school.country_id, supabase);
    if (!boards.schoolBoard && !boards.countryBoard) {
      return {
        success: false,
        error: `找不到看板 (schoolId: ${school.id}, countryId: ${school.country_id})`
      };
    }

    // 4. 轉換圖片引用
    const transformedContent = transformImageReferences(
      content.markdown,
      content.images
    );

    // 5. 生成 Title 和最終 Content
    const title = `${content.student_info.school}交換心得`;
    const finalContent = `${transformedContent}\n\nby ${content.student_info.name}\n\n（此文轉載自台大國際事務處交換生心得）`;

    // 6. Dry Run 模式 - 只顯示不執行
    if (dryRun) {
      console.log(`   [DRY RUN] ${title}`);
      console.log(`   學校: ${school.name_zh} (ID: ${school.id})`);
      console.log(`   看板: ${boards.schoolBoard?.slug || '無'}, ${boards.countryBoard?.slug || '無'}`);
      return { success: true };
    }

    // 7. 建立 Post
    const postId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error: postError } = await supabase.from('Post').insert({
      id: postId,
      title: title,
      content: finalContent,
      authorId: authorId,
      status: 'published',
      type: 'normal',
      createdAt: now,
      updatedAt: now
    });

    if (postError) {
      return { success: false, error: `建立 Post 失敗: ${postError.message}` };
    }

    // 8. 建立 PostBoard 關聯
    const postBoardRecords = [];
    if (boards.schoolBoard) {
      postBoardRecords.push({
        id: crypto.randomUUID(),
        postId: postId,
        boardId: boards.schoolBoard.id,
        createdAt: now
      });
    }
    if (boards.countryBoard) {
      postBoardRecords.push({
        id: crypto.randomUUID(),
        postId: postId,
        boardId: boards.countryBoard.id,
        createdAt: now
      });
    }

    const { error: postBoardError } = await supabase
      .from('PostBoard')
      .insert(postBoardRecords);

    if (postBoardError) {
      // 清理失敗的 Post
      await supabase.from('Post').delete().eq('id', postId);
      return { success: false, error: `建立 PostBoard 失敗: ${postBoardError.message}` };
    }

    console.log(`   ✅ ${title}`);
    console.log(`   學校: ${school.name_zh} (ID: ${school.id})`);
    console.log(`   看板: ${boards.schoolBoard?.slug || '無'}, ${boards.countryBoard?.slug || '無'}`);
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 匯入所有心得
 */
async function importAllExperiences(
  experiencesDir: string,
  testMode: boolean = false,
  dryRun: boolean = false
): Promise<ImportResult> {

  const result: ImportResult = { success: 0, failed: 0, skipped: 0, errors: [] };

  // 讀取所有目錄
  const directories = fs.readdirSync(experiencesDir)
    .filter(dir => {
      const fullPath = path.join(experiencesDir, dir);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort();

  const dirsToProcess = testMode ? directories.slice(0, 3) : directories;

  console.log(`\n📊 總共 ${directories.length} 個目錄`);
  console.log(`${testMode ? '🧪 測試模式' : '🚀 完整模式'}: 處理 ${dirsToProcess.length} 個`);
  console.log(`${dryRun ? '🔍 Dry Run 模式（不寫入資料庫）' : '💾 實際寫入模式'}\n`);
  console.log('='.repeat(60) + '\n');

  // 初始化
  const supabase = createSupabaseClient();
  const authorId = await ensureAuthorUser(supabase);
  const schoolMap = await buildSchoolMap(supabase);

  console.log('='.repeat(60) + '\n');

  // 逐一處理
  let processedCount = 0;
  for (const dir of dirsToProcess) {
    processedCount++;
    const experienceDir = path.join(experiencesDir, dir);

    // 檢查 content.json
    if (!fs.existsSync(path.join(experienceDir, 'content.json'))) {
      console.log(`⏭️  [${processedCount}/${dirsToProcess.length}] 跳過 ${dir}: 無 content.json\n`);
      result.skipped++;
      continue;
    }

    console.log(`[${processedCount}/${dirsToProcess.length}] 處理: ${dir}`);

    const importResult = await importExperience(
      experienceDir, authorId, schoolMap, supabase, dryRun
    );

    if (importResult.success) {
      result.success++;
    } else {
      result.failed++;
      result.errors.push({
        directory: dir,
        reason: importResult.error || '未知錯誤'
      });
      console.log(`   ❌ ${importResult.error}`);
    }

    console.log();

    // 每 10 筆暫停，避免 API rate limiting
    if (!dryRun && processedCount % 10 === 0 && processedCount < dirsToProcess.length) {
      console.log(`⏸️  已處理 ${processedCount} 筆，暫停 1 秒...\n`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return result;
}

/**
 * 儲存無法匹配的學校
 */
function saveUnmatchedSchools(errors: ImportResult['errors'], outputPath: string): void {
  const unmatchedSchools = errors
    .filter(e => e.reason.startsWith('找不到學校:'))
    .map(e => ({
      directory: e.directory,
      school: e.reason.replace('找不到學校: ', '')
    }));

  if (unmatchedSchools.length === 0) {
    console.log('✅ 所有學校都成功匹配！');
    return;
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      count: unmatchedSchools.length,
      unmatched: unmatchedSchools
    }, null, 2)
  );

  console.log(`📝 無法匹配的學校已儲存: ${outputPath}`);
  console.log(`   共 ${unmatchedSchools.length} 筆`);
}

/**
 * 儲存所有錯誤
 */
function saveImportErrors(errors: ImportResult['errors'], outputPath: string): void {
  if (errors.length === 0) return;

  fs.writeFileSync(
    outputPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      count: errors.length,
      errors: errors
    }, null, 2)
  );

  console.log(`📝 錯誤記錄已儲存: ${outputPath}`);
}

/**
 * 驗證匯入結果
 */
async function verifyImport(
  authorId: string,
  supabase: any
): Promise<void> {
  console.log('🔍 驗證匯入結果...\n');

  // 1. 統計 Posts
  const { count: postCount } = await supabase
    .from('Post')
    .select('*', { count: 'exact', head: true })
    .eq('authorId', authorId);
  console.log(`📊 Post 總數: ${postCount}`);

  // 2. 統計 PostBoard
  const { data: posts } = await supabase
    .from('Post')
    .select('id')
    .eq('authorId', authorId);

  if (posts && posts.length > 0) {
    const postIds = posts.map(p => p.id);
    const { count: pbCount } = await supabase
      .from('PostBoard')
      .select('*', { count: 'exact', head: true })
      .in('postId', postIds);
    console.log(`📊 PostBoard 關聯數: ${pbCount}`);
  }

  // 3. 隨機抽查
  const { data: samplePosts } = await supabase
    .from('Post')
    .select('id, title, content')
    .eq('authorId', authorId)
    .limit(3);

  if (samplePosts && samplePosts.length > 0) {
    console.log('\n📋 隨機抽查:');
    for (let i = 0; i < samplePosts.length; i++) {
      const post = samplePosts[i];
      console.log(`\n${i + 1}. ${post.title}`);
      console.log(`   內容長度: ${post.content.length} 字元`);

      // 查詢關聯的 Board
      const { data: postBoards } = await supabase
        .from('PostBoard')
        .select('Board(type, slug, name)')
        .eq('postId', post.id);

      if (postBoards && postBoards.length > 0) {
        const boards = postBoards.map((pb: any) => pb.Board?.slug || '未知').join(', ');
        console.log(`   關聯看板: ${boards}`);
      }
    }
  }
}

// ============ 主程式 ============
async function main() {
  console.log('🚀 開始匯入學生交換心得...\n');
  console.log('='.repeat(60));

  // 環境檢查
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 請設定 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 環境變數');
    process.exit(1);
  }

  if (!fs.existsSync(EXPERIENCES_DIR)) {
    console.error(`❌ 找不到目錄: ${EXPERIENCES_DIR}`);
    process.exit(1);
  }

  // 建立輸出目錄
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 解析參數
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const dryRun = args.includes('--dry-run');

  try {
    // 執行匯入
    const result = await importAllExperiences(EXPERIENCES_DIR, testMode, dryRun);

    // 顯示結果
    console.log('='.repeat(60));
    console.log('📊 匯入結果');
    console.log('='.repeat(60));
    console.log(`✅ 成功: ${result.success} 筆`);
    console.log(`❌ 失敗: ${result.failed} 筆`);
    console.log(`⏭️  跳過: ${result.skipped} 筆`);
    console.log('='.repeat(60) + '\n');

    // 儲存錯誤記錄
    if (result.errors.length > 0) {
      saveUnmatchedSchools(
        result.errors,
        path.join(OUTPUT_DIR, 'unmatched-schools.json')
      );
      console.log();
      saveImportErrors(
        result.errors,
        path.join(OUTPUT_DIR, 'import-errors.json')
      );
      console.log();
    }

    // 驗證
    if (!dryRun && result.success > 0) {
      const supabase = createSupabaseClient();
      const authorId = await ensureAuthorUser(supabase);
      await verifyImport(authorId, supabase);
    }

    console.log('\n✨ 完成！\n');

  } catch (error: any) {
    console.error('\n❌ 錯誤:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
