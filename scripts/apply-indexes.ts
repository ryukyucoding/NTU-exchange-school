import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
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

function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function main() {
  console.log('🔧 開始建立資料庫索引...\n');
  console.log('='.repeat(60));

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 請設定環境變數');
    process.exit(1);
  }

  const supabase = createSupabaseClient();

  // 讀取 SQL 檔案
  const sqlPath = path.join(process.cwd(), 'supabase', 'add-indexes.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ 找不到 SQL 檔案：${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  console.log(`\n📄 讀取 SQL 檔案: ${sqlPath}`);
  console.log(`📏 檔案大小: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);
  console.log('='.repeat(60) + '\n');

  // 分割 SQL 語句（以分號結尾且換行）
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s !== '');

  console.log(`📊 總共 ${statements.length} 個 SQL 語句\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ statement: string; error: string }> = [];

  // 逐一執行 SQL 語句
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // 提取索引名稱（如果有）
    const indexNameMatch = statement.match(/idx_[\w]+/);
    const indexName = indexNameMatch ? indexNameMatch[0] : `語句 ${i + 1}`;

    process.stdout.write(`[${i + 1}/${statements.length}] ${indexName}...`);

    try {
      const { error } = await (supabase as any).rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        // 嘗試直接執行（fallback）
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ sql: statement + ';' })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      }

      console.log(' ✅');
      successCount++;
    } catch (err: any) {
      console.log(` ❌ ${err.message}`);
      errorCount++;
      errors.push({
        statement: statement.substring(0, 100) + '...',
        error: err.message
      });
    }
  }

  // 顯示結果
  console.log('\n' + '='.repeat(60));
  console.log('📊 執行結果');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${successCount} 個`);
  console.log(`❌ 失敗: ${errorCount} 個`);
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ 錯誤詳情:\n');
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.statement}`);
      console.log(`   錯誤: ${err.error}\n`);
    });
  }

  console.log('\n💡 提示: Supabase 可能不支援透過 API 直接執行 DDL 語句');
  console.log('建議: 請到 Supabase Dashboard > SQL Editor 直接執行 add-indexes.sql\n');
  console.log(`📍 檔案位置: ${sqlPath}\n`);
}

main();
