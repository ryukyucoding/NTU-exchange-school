/**
 * 列出 Supabase 資料庫中的所有表格
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// 手動載入 .env.local
const env: Record<string, string> = {};
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  });
} catch (error) {
  console.error('❌ 無法讀取 .env.local 文件');
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少必要的環境變數！');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function getAllTables() {
  // 使用 PostgreSQL 系統表查詢所有表格
  const query = `
    SELECT 
      table_name,
      (SELECT COUNT(*) FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  try {
    // 嘗試使用 REST API 直接查詢
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        sql: query,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    // 如果 exec_sql 不存在，嘗試其他方法
  }

  // 回退方法：使用已知的表格名稱，然後逐一檢查
  const knownTables = [
    'schools', 'User', 'Account', 'Session', 'VerificationToken', 
    'user_qualifications', 'Post', 'Comment', 'Like', 'Repost',
    'Draft', 'Follow', 'Notification'
  ];

  const existingTables: Array<{ table_name: string; column_count: number }> = [];

  for (const tableName of knownTables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error || error.code === 'PGRST116') {
        // 表格存在，獲取欄位數
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        const columnCount = data && data.length > 0 ? Object.keys(data[0]).length : 0;
        existingTables.push({ table_name: tableName, column_count: columnCount });
      }
    } catch (e) {
      // 表格不存在，跳過
    }
  }

  return existingTables;
}

async function getTableDetails(tableName: string) {
  try {
    // 獲取記錄數
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // 獲取一筆資料來查看欄位
    const { data } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

    return {
      count: count || 0,
      columns: columns,
    };
  } catch (error) {
    return {
      count: 0,
      columns: [],
      error: error instanceof Error ? error.message : '未知錯誤',
    };
  }
}

async function main() {
  console.log('🔍 查詢 Supabase 資料庫中的所有表格...\n');
  console.log('='.repeat(80));
  console.log(`📍 URL: ${supabaseUrl}`);
  console.log(`🔑 使用: ${env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key ✅' : 'Anon Key ⚠️'}`);
  console.log('='.repeat(80));
  console.log('');

  // 獲取所有表格
  console.log('📋 正在查詢所有表格...\n');
  const tables = await getAllTables();

  if (tables.length === 0) {
    console.log('⚠️  無法自動查詢所有表格');
    console.log('\n💡 建議使用以下方法查看所有表格：');
    console.log('   1. 前往 Supabase Dashboard → Table Editor');
    console.log('   2. 或在 SQL Editor 中執行：');
    console.log('      SELECT table_name FROM information_schema.tables');
    console.log('      WHERE table_schema = \'public\' AND table_type = \'BASE TABLE\';');
    return;
  }

  console.log(`✅ 找到 ${tables.length} 個表格：\n`);

  // 顯示每個表格的詳細資訊
  for (const table of tables) {
    const details = await getTableDetails(table.table_name);
    
    console.log(`📊 ${table.table_name}`);
    console.log(`   記錄數: ${details.count}`);
    if (details.columns.length > 0) {
      console.log(`   欄位數: ${details.columns.length}`);
      console.log(`   欄位: ${details.columns.join(', ')}`);
    } else if (details.count === 0) {
      console.log(`   欄位: (表格為空，無法推斷欄位)`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('📋 總結：');
  console.log(`   總表格數: ${tables.length}`);
  console.log(`   總記錄數: ${tables.reduce((sum, t) => {
    const details = getTableDetails(t.table_name);
    return sum;
  }, 0)}`);
  
  console.log('\n💡 提示：');
  console.log('   如需查看更詳細的表格結構，請使用：');
  console.log('   - Supabase Dashboard → Table Editor');
  console.log('   - 或執行: npx tsx scripts/view-database-schema.ts');
}

main().catch(error => {
  console.error('❌ 執行失敗:', error);
  if (error instanceof Error) {
    console.error('錯誤訊息:', error.message);
  }
  process.exit(1);
});

