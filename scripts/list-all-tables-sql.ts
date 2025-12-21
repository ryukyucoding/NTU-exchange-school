/**
 * 使用 SQL 查詢列出 Supabase 資料庫中的所有表格
 * 這個腳本會嘗試多種方法來獲取所有表格
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

async function queryAllTablesUsingSQL() {
  // 方法 1: 嘗試使用 Supabase REST API 查詢 information_schema
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/information_schema.tables?table_schema=eq.public&table_type=eq.BASE TABLE&select=table_name&order=table_name`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (response.ok) {
      const tables = await response.json();
      return tables.map((t: any) => t.table_name);
    }
  } catch (error) {
    // 繼續嘗試其他方法
  }

  // 方法 2: 嘗試常見的表格名稱
  const commonTables = [
    'schools',
    'User', 'Account', 'Session', 'VerificationToken',
    'user_qualifications',
    'Post', 'Comment', 'Like', 'Repost',
    'Draft', 'Follow', 'Notification',
    'Wishlist', 'Application',
  ];

  const existingTables: string[] = [];

  for (const tableName of commonTables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      // 如果沒有錯誤或錯誤是表格為空，則表格存在
      if (!error || error.code === 'PGRST116') {
        existingTables.push(tableName);
      }
    } catch (e) {
      // 表格不存在
    }
  }

  return existingTables;
}

async function getTableInfo(tableName: string) {
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

  // 查詢所有表格
  console.log('📋 正在查詢所有表格...\n');
  const tableNames = await queryAllTablesUsingSQL();

  if (tableNames.length === 0) {
    console.log('⚠️  無法自動查詢所有表格');
    console.log('\n💡 請使用以下方法查看所有表格：');
    console.log('\n方法 1: Supabase Dashboard（最簡單）');
    console.log('   1. 前往 https://supabase.com/dashboard');
    console.log('   2. 選擇你的專案');
    console.log('   3. 點選左側選單「Table Editor」');
    console.log('   4. 可以看到所有表格列表');
    
    console.log('\n方法 2: SQL Editor');
    console.log('   1. 前往 Supabase Dashboard → SQL Editor');
    console.log('   2. 執行以下 SQL：');
    console.log('\n   SELECT table_name');
    console.log('   FROM information_schema.tables');
    console.log('   WHERE table_schema = \'public\'');
    console.log('     AND table_type = \'BASE TABLE\'');
    console.log('   ORDER BY table_name;');
    return;
  }

  console.log(`✅ 找到 ${tableNames.length} 個表格：\n`);

  // 顯示每個表格的詳細資訊
  let totalRecords = 0;
  for (const tableName of tableNames) {
    const info = await getTableInfo(tableName);
    totalRecords += info.count;
    
    console.log(`📊 ${tableName}`);
    console.log(`   記錄數: ${info.count}`);
    if (info.columns.length > 0) {
      console.log(`   欄位數: ${info.columns.length}`);
      if (info.columns.length <= 10) {
        console.log(`   欄位: ${info.columns.join(', ')}`);
      } else {
        console.log(`   欄位: ${info.columns.slice(0, 10).join(', ')} ... (共 ${info.columns.length} 個)`);
      }
    } else if (info.count === 0) {
      console.log(`   欄位: (表格為空，無法推斷欄位)`);
    }
    if (info.error) {
      console.log(`   ⚠️  錯誤: ${info.error}`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('📋 總結：');
  console.log(`   總表格數: ${tableNames.length}`);
  console.log(`   總記錄數: ${totalRecords}`);
  
  console.log('\n💡 提示：');
  console.log('   如需查看更詳細的表格結構，請：');
  console.log('   1. 前往 Supabase Dashboard → Table Editor');
  console.log('   2. 或在 SQL Editor 中執行查詢查看欄位詳情');
}

main().catch(error => {
  console.error('❌ 執行失敗:', error);
  if (error instanceof Error) {
    console.error('錯誤訊息:', error.message);
  }
  process.exit(1);
});

