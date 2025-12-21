/**
 * 查看 Supabase 資料庫表格結構和欄位資訊
 * 
 * 使用方法：
 * npx tsx scripts/view-database-schema.ts
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
  console.warn('⚠️  無法讀取 .env.local 文件，嘗試讀取 .env...');
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
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
  } catch (error2) {
    console.error('❌ 無法讀取環境變數文件！');
    process.exit(1);
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少必要的環境變數！');
  console.error('需要: NEXT_PUBLIC_SUPABASE_URL 或 VITE_SUPABASE_URL');
  console.error('需要: SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('\n💡 請檢查 .env.local 或 .env 文件');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 使用 PostgreSQL 查詢系統表來獲取表格結構
async function getTableSchema(tableName: string) {
  const query = `
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = $1
    ORDER BY ordinal_position;
  `;

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: query,
    params: [tableName]
  }).catch(async () => {
    // 如果 exec_sql 不存在，嘗試直接查詢
    const { data: directData, error: directError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, character_maximum_length, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');
    
    return { data: directData, error: directError };
  });

  if (error) {
    // 使用 SQL 查詢（需要 service role key）
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          sql: query.replace('$1', `'${tableName}'`),
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return { data: result, error: null };
      }
    } catch (e) {
      // 忽略錯誤，繼續使用其他方法
    }
  }

  return { data, error };
}

// 獲取所有表格列表
async function getAllTables() {
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  try {
    // 嘗試使用 SQL 查詢
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
      const result = await response.json();
      return result.map((row: any) => row.table_name);
    }
  } catch (e) {
    // 如果失敗，使用已知的表格名稱
  }

  // 回退：使用已知的表格名稱
  return ['schools', 'User', 'Account', 'Session', 'VerificationToken', 'user_qualifications'];
}

// 獲取表格的記錄數
async function getTableRowCount(tableName: string) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return null;
    }
    return count;
  } catch (e) {
    return null;
  }
}

// 顯示表格結構
async function displayTableSchema(tableName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 表格: ${tableName}`);
  console.log('='.repeat(80));

  // 獲取記錄數
  const rowCount = await getTableRowCount(tableName);
  if (rowCount !== null) {
    console.log(`📈 記錄數: ${rowCount}`);
  }

  // 嘗試獲取表格結構
  try {
    // 使用 Supabase 的 REST API 查詢系統表
    const response = await fetch(
      `${supabaseUrl}/rest/v1/information_schema.columns?table_schema=eq.public&table_name=eq.${tableName}&select=column_name,data_type,character_maximum_length,is_nullable,column_default&order=ordinal_position`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (response.ok) {
      const columns = await response.json();
      
      if (columns.length === 0) {
        console.log('⚠️  無法獲取欄位資訊（可能需要 Service Role Key）');
        console.log('\n💡 建議使用以下方式查看表格結構：');
        console.log('   1. 前往 Supabase Dashboard → Table Editor');
        console.log('   2. 或使用 Supabase Dashboard → SQL Editor 執行：');
        console.log(`      SELECT * FROM information_schema.columns WHERE table_name = '${tableName}';`);
        return;
      }

      console.log('\n📋 欄位列表：');
      console.log('-'.repeat(80));
      console.log(
        '欄位名稱'.padEnd(30) +
        '資料型別'.padEnd(20) +
        '長度'.padEnd(10) +
        '可為空'.padEnd(10) +
        '預設值'
      );
      console.log('-'.repeat(80));

      columns.forEach((col: any) => {
        const name = (col.column_name || '').padEnd(30);
        const type = (col.data_type || '').padEnd(20);
        const length = (col.character_maximum_length ? `(${col.character_maximum_length})` : '').padEnd(10);
        const nullable = (col.is_nullable === 'YES' ? '是' : '否').padEnd(10);
        const defaultValue = col.column_default || '無';
        
        console.log(`${name}${type}${length}${nullable}${defaultValue}`);
      });
    } else {
      throw new Error('API 查詢失敗');
    }
  } catch (error) {
    console.log('⚠️  無法通過 API 獲取欄位資訊');
    console.log('\n💡 建議使用以下方式查看表格結構：');
    console.log('\n方法 1: Supabase Dashboard（最簡單）');
    console.log('   1. 前往 https://supabase.com/dashboard');
    console.log('   2. 選擇你的專案');
    console.log('   3. 點選左側選單「Table Editor」');
    console.log('   4. 選擇表格查看結構和資料');
    
    console.log('\n方法 2: SQL Editor');
    console.log('   1. 前往 Supabase Dashboard → SQL Editor');
    console.log('   2. 執行以下 SQL：');
    console.log(`\n   SELECT \n`);
    console.log(`     column_name as "欄位名稱",\n`);
    console.log(`     data_type as "資料型別",\n`);
    console.log(`     character_maximum_length as "最大長度",\n`);
    console.log(`     is_nullable as "可為空",\n`);
    console.log(`     column_default as "預設值"\n`);
    console.log(`   FROM information_schema.columns\n`);
    console.log(`   WHERE table_schema = 'public'\n`);
    console.log(`     AND table_name = '${tableName}'\n`);
    console.log(`   ORDER BY ordinal_position;`);

    console.log('\n方法 3: 使用資料庫客戶端工具');
    console.log('   連接字串格式：');
    console.log(`   postgresql://postgres:[YOUR-PASSWORD]@db.${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}.supabase.co:5432/postgres`);
    console.log('   可以使用以下工具：');
    console.log('   - DBeaver (免費)');
    console.log('   - pgAdmin (免費)');
    console.log('   - TablePlus (付費，有免費試用)');
  }
}

async function main() {
  console.log('🔍 Supabase 資料庫結構查看工具');
  console.log('='.repeat(80));
  console.log(`📍 URL: ${supabaseUrl}`);
  console.log(`🔑 使用: ${env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key'}`);
  
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n⚠️  建議使用 Service Role Key 以獲取完整的表格結構資訊');
    console.log('   可以在 Supabase Dashboard → Project Settings → API 中找到');
  }

  // 獲取所有表格
  const tables = await getAllTables();
  
  console.log(`\n📋 找到 ${tables.length} 個表格：`);
  tables.forEach((table, index) => {
    console.log(`   ${index + 1}. ${table}`);
  });

  // 顯示每個表格的結構
  for (const table of tables) {
    await displayTableSchema(table);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 完成！');
  console.log('\n💡 提示：');
  console.log('   - 如果無法看到完整欄位資訊，請使用 Supabase Dashboard 查看');
  console.log('   - 或使用 Service Role Key 以獲取更多資訊');
  console.log('   - Supabase Dashboard 網址：https://supabase.com/dashboard');
}

main().catch(console.error);

