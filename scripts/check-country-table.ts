/**
 * 檢查資料庫中的 country 相關表結構
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

async function checkTables() {
  console.log('🔍 檢查資料庫中的表...\n');

  // 嘗試查詢所有可能的表名
  const possibleTableNames = [
    'country',
    'Country',
    'countries',
    'Countries',
    'schools',
  ];

  for (const tableName of possibleTableNames) {
    try {
      console.log(`📋 檢查表: ${tableName}`);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`   ❌ 錯誤: ${error.message}\n`);
      } else {
        console.log(`   ✅ 表存在！`);
        if (data && data.length > 0) {
          console.log(`   📊 欄位: ${Object.keys(data[0]).join(', ')}`);
          console.log(`   📝 樣本資料:`, JSON.stringify(data[0], null, 2));
        } else {
          console.log(`   ⚠️  表存在但沒有資料`);
        }
        console.log();
      }
    } catch (err: any) {
      console.log(`   ❌ 異常: ${err.message}\n`);
    }
  }

  // 如果找到 country 相關的表，查詢更多資料
  console.log('\n🔍 查詢 country 相關表的完整資料...\n');
  
  const countryTableNames = ['country', 'Country', 'countries', 'Countries'];
  
  for (const tableName of countryTableNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(10);

      if (!error && data && data.length > 0) {
        console.log(`✅ 表 ${tableName} 的資料：`);
        console.log(`   總共找到 ${data.length} 筆（顯示前 10 筆）`);
        data.forEach((row, index) => {
          console.log(`   ${index + 1}.`, row);
        });
        console.log();
        break; // 找到就停止
      }
    } catch (err) {
      // 忽略錯誤，繼續嘗試下一個
    }
  }
}

checkTables().catch(console.error);

