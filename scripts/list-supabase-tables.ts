import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 載入環境變數
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL) {
  console.error('❌ 錯誤：請設定 NEXT_PUBLIC_SUPABASE_URL 或 VITE_SUPABASE_URL 環境變數');
  process.exit(1);
}

// 檢查 Service Role Key 是否為有效值（不是佔位符）
const isValidServiceKey = SUPABASE_SERVICE_KEY && 
  !SUPABASE_SERVICE_KEY.includes('your-service-role') && 
  SUPABASE_SERVICE_KEY.length > 20;

// 使用有效的 Service Role Key，否則使用 Anon Key
const key = isValidServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
if (!key) {
  console.error('❌ 錯誤：請設定 NEXT_PUBLIC_SUPABASE_ANON_KEY 或 SUPABASE_SERVICE_ROLE_KEY 環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, key);

async function queryTablesViaSQL() {
  // 嘗試使用 SQL 函數查詢系統表
  try {
    // 方法 1: 嘗試使用 list_all_tables 函數
    const { data: tablesData, error: tablesError } = await supabase.rpc('list_all_tables');
    
    if (!tablesError && tablesData) {
      return tablesData;
    }
  } catch (e) {
    // 函數不存在，繼續嘗試其他方法
  }

  // 如果沒有自定義函數，嘗試直接查詢已知表
  return null;
}

async function getTableStructureViaSQL(tableName: string) {
  // 嘗試使用 SQL 函數查詢表結構
  try {
    const { data, error } = await supabase.rpc('get_table_info', {
      table_name_param: tableName
    });
    
    if (!error && data) {
      return data;
    }
  } catch (e) {
    // 函數不存在，返回 null
  }
  
  return null;
}

async function listTables() {
  console.log('🔍 查詢 Supabase 資料庫中的所有表...\n');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`使用 Key: ${isValidServiceKey ? 'Service Role Key' : 'Anon Key'}`);
  console.log(`Key 前綴: ${key.substring(0, 20)}...\n`);

  // 首先嘗試使用 SQL 函數查詢所有表
  const sqlTables = await queryTablesViaSQL();
  
  if (sqlTables && sqlTables.length > 0) {
    console.log('📊 從資料庫查詢到的表：\n');
    sqlTables.forEach((table: any) => {
      console.log(`  - ${table.table_name} (${table.table_type})`);
    });
    console.log();
    
    // 顯示每個表的結構
    for (const table of sqlTables) {
      await showTableStructure(table.table_name);
    }
    return;
  }

  // 如果 SQL 函數不可用，嘗試查詢所有可能的表
  const possibleTables = [
    'schools', 'users', 'profiles', 'wishlists', 'wishlist', 
    'applications', 'application', 'favorites', 'favorite',
    'user_schools', 'user_school', 'comparisons', 'comparison'
  ];
  
  console.log('🔍 掃描可能的表...\n');
  const existingTables: Array<{ name: string; count: number }> = [];
  
  for (const tableName of possibleTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        existingTables.push({ name: tableName, count: count || 0 });
        console.log(`✅ ${tableName}: 存在 (${count || 0} 筆資料)`);
      } else {
        // 檢查是否真的是表不存在的錯誤
        const errorMsg = error.message || '';
        if (!errorMsg.includes('schema cache') && !errorMsg.includes('relation')) {
          // 可能是其他錯誤，表可能存在但無法查詢
        }
      }
    } catch (e) {
      // 表不存在，忽略
    }
  }

  if (existingTables.length > 0) {
    console.log(`\n📊 總結：找到 ${existingTables.length} 個表\n`);
    for (const table of existingTables) {
      await showTableStructure(table.name);
    }
    
    console.log('\n💡 提示：要查看完整的表結構，請：');
    console.log('   1. 在 Supabase Dashboard 的 SQL Editor 中執行 scripts/create-table-info-function.sql');
    console.log('   2. 然後重新執行此腳本，即可看到完整的表結構');
  } else {
    console.log('\n⚠️  沒有找到任何表');
    console.log('   這可能是因為：');
    console.log('   1. 表尚未建立');
    console.log('   2. RLS 政策限制查詢');
    console.log('   3. 表名不在預設列表中');
    console.log('\n💡 建議：在 Supabase Dashboard 的 SQL Editor 中執行 scripts/query-table-structure.sql 來查看所有表\n');
    
    // 至少嘗試查詢 schools 表
    await testKnownTables();
  }
}

async function testKnownTables() {
  console.log('🔍 測試已知的表...\n');
  
  const knownTables = ['schools', 'users', 'wishlists', 'applications', 'profiles'];
  const existingTables: Array<{ name: string; count: number }> = [];
  
  for (const tableName of knownTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        existingTables.push({ name: tableName, count: count || 0 });
        console.log(`✅ ${tableName}: 存在 (${count || 0} 筆資料)`);
      } else {
        // 檢查錯誤是否是因為表不存在
        const errorMsg = error.message || JSON.stringify(error);
        const errorCode = error.code || '';
        
        if (errorCode === 'PGRST116' || errorMsg.includes('relation') || errorMsg.includes('does not exist') || errorMsg.includes('無法找到')) {
          console.log(`❌ ${tableName}: 不存在`);
        } else {
          console.log(`⚠️  ${tableName}: 查詢錯誤`);
          console.log(`   錯誤代碼: ${errorCode || '無'}`);
          console.log(`   錯誤訊息: ${errorMsg || '無訊息'}`);
          console.log(`   完整錯誤: ${JSON.stringify(error, null, 2)}`);
        }
      }
    } catch (e: any) {
      console.log(`❌ ${tableName}: 查詢失敗 - ${e.message || '未知錯誤'}`);
      if (e.stack) {
        console.log(`   堆疊: ${e.stack.split('\n')[0]}`);
      }
    }
  }
  
  if (existingTables.length > 0) {
    console.log(`\n📊 總結：找到 ${existingTables.length} 個表`);
    for (const table of existingTables) {
      await showTableStructure(table.name);
    }
  } else {
    console.log('\n⚠️  沒有找到任何表，請檢查：');
    console.log('   1. Supabase URL 和 API Key 是否正確');
    console.log('   2. 資料表是否已建立');
    console.log('   3. RLS 政策是否允許查詢');
  }
  console.log();
}

async function showTableStructure(tableName: string) {
  console.log(`\n📋 ${tableName} 表的結構：`);
  
  try {
    // 首先嘗試使用 SQL 函數查詢表結構
    const sqlStructure = await getTableStructureViaSQL(tableName);
    
    if (sqlStructure && sqlStructure.length > 0) {
      console.log('  欄位列表（從資料庫 schema 查詢）：');
      sqlStructure.forEach((col: any) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`    - ${col.column_name}: ${col.data_type} ${nullable}${defaultValue}`);
      });
    } else {
      // 如果 SQL 函數不可用，嘗試從資料推斷
      const { data: sampleData, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        const errorMsg = error.message || JSON.stringify(error);
        if (errorMsg.includes('schema cache') || errorMsg.includes('relation') || errorMsg.includes('does not exist')) {
          console.log(`  ❌ 表不存在或無法訪問`);
          return;
        } else {
          console.error(`  ⚠️  查詢樣本資料時發生錯誤: ${errorMsg}`);
        }
      }

      if (sampleData && sampleData.length > 0) {
        console.log('  實際欄位（從資料推斷）：');
        Object.keys(sampleData[0]).forEach((key) => {
          const value = sampleData[0][key as keyof typeof sampleData[0]];
          let type = value === null ? 'null' : typeof value;
          if (type === 'object') {
            if (value instanceof Date) {
              type = 'date/timestamp';
            } else if (Array.isArray(value)) {
              type = 'array';
            } else {
              type = 'object/json';
            }
          } else if (type === 'string' && (key.includes('_at') || key.includes('time'))) {
            type = 'timestamp';
          } else if (type === 'number') {
            type = 'number';
          } else if (type === 'boolean') {
            type = 'boolean';
          }
          const sampleValue = value === null ? 'null' : 
                            typeof value === 'string' && value.length > 50 ? 
                            value.substring(0, 50) + '...' : 
                            String(value);
          console.log(`    - ${key}: ${type}${value !== null ? ` (範例: ${sampleValue})` : ''}`);
        });
      } else {
        // 如果表為空，提供 SQL 查詢建議
        console.log('  ⚠️  表為空，無法從資料推斷結構');
        console.log('  💡 建議：在 Supabase Dashboard 的 SQL Editor 中執行以下查詢來查看完整結構：');
        console.log(`     SELECT column_name, data_type, is_nullable, column_default`);
        console.log(`     FROM information_schema.columns`);
        console.log(`     WHERE table_schema = 'public' AND table_name = '${tableName}';`);
        console.log(`\n  或者執行 scripts/create-table-info-function.sql 來建立查詢函數`);
      }
    }
    
    // 獲取總筆數
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`\n  總筆數: ${count || 0}`);
    }
  } catch (error: any) {
    console.error(`  ❌ 查詢詳細資訊失敗: ${error.message}`);
  }
}

async function listTableDetails() {
  await showTableStructure('schools');
}

// 執行查詢
listTables().catch((error) => {
  console.error('❌ 執行過程發生錯誤:', error);
  process.exit(1);
});

