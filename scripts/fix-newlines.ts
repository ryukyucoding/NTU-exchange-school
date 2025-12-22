import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// 嘗試載入環境變數
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
  dotenv.config({ path: path.join(process.cwd(), '.env') });
} catch (e) {
  console.log('ℹ️  使用系統環境變數');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const AUTHOR_ID = 'b018739e-d206-4096-811c-e170b97b7860';

function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * 處理換行符號
 * 1. \n\n → \n
 * 2. \n → （移除）
 */
function fixNewlines(content: string): string {
  // 使用臨時標記避免衝突
  const TEMP_MARKER = '{{DOUBLE_NEWLINE}}';

  // 步驟 1: 把 \n\n 換成臨時標記
  let fixed = content.replace(/\n\n/g, TEMP_MARKER);

  // 步驟 2: 移除所有剩餘的單獨 \n
  fixed = fixed.replace(/\n/g, '');

  // 步驟 3: 把臨時標記換成單個 \n
  fixed = fixed.replace(new RegExp(TEMP_MARKER, 'g'), '\n');

  return fixed;
}

async function main() {
  console.log('🔧 開始修正換行符號...\n');
  console.log('='.repeat(60));

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 請設定環境變數');
    process.exit(1);
  }

  const supabase = createSupabaseClient();

  // 1. 查詢所有需要處理的 Post
  console.log(`\n🔍 查詢 authorId = ${AUTHOR_ID} 的 Posts...\n`);

  const { data: posts, error } = await supabase
    .from('Post')
    .select('id, title, content')
    .eq('authorId', AUTHOR_ID);

  if (error) {
    console.error('❌ 查詢失敗：', error);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log('⚠️  找不到任何 Post');
    process.exit(0);
  }

  console.log(`📊 找到 ${posts.length} 筆 Posts\n`);
  console.log('='.repeat(60) + '\n');

  // 2. 逐一處理
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i + 1}/${posts.length}] 處理: ${post.title}`);

    // 修正換行
    const originalLength = post.content.length;
    const fixedContent = fixNewlines(post.content);
    const newLength = fixedContent.length;

    // 統計變化
    const originalDoubleNewlines = (post.content.match(/\n\n/g) || []).length;
    const originalSingleNewlines = (post.content.match(/\n/g) || []).length - originalDoubleNewlines * 2;

    console.log(`   原始長度: ${originalLength} 字元`);
    console.log(`   雙換行數: ${originalDoubleNewlines} 個`);
    console.log(`   單換行數: ${originalSingleNewlines} 個`);
    console.log(`   新長度: ${newLength} 字元`);
    console.log(`   減少: ${originalLength - newLength} 字元`);

    // 更新資料庫
    const { error: updateError } = await supabase
      .from('Post')
      .update({ content: fixedContent })
      .eq('id', post.id);

    if (updateError) {
      console.log(`   ❌ 更新失敗: ${updateError.message}`);
      errorCount++;
    } else {
      console.log(`   ✅ 更新成功`);
      successCount++;
    }

    console.log();
  }

  // 3. 顯示結果
  console.log('='.repeat(60));
  console.log('📊 處理結果');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${successCount} 筆`);
  console.log(`❌ 失敗: ${errorCount} 筆`);
  console.log('='.repeat(60));

  console.log('\n✨ 完成！\n');
}

main();
