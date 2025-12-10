import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

// Supabase 設定（請替換成你的實際值）
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('錯誤：請設定 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 環境變數');
  process.exit(1);
}

// 使用 Service Role Key 以繞過 RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface CSVRow {
  id: string;
  name_zh: string;
  name_en: string;
  country: string;
  country_en: string;
  url: string;
  開放第二次出國交換之同學選填: string;
  申請組別: string;
  GPA要求: string;
  年級限制: string;
  語言要求: string;
  不接受申請之學院: string;
  名額: string;
  學校年曆: string;
  註冊繳費: string;
  住宿資訊: string;
  注意事項: string;
  latitude: string;
  longitude: string;
}

interface SchoolRecord {
  id: string;
  name_zh: string;
  name_en: string;
  country: string;
  country_en: string;
  url: string;
  second_exchange_eligible: boolean;
  application_group: string;
  gpa_requirement: string;
  grade_requirement: string;
  language_requirement: string;
  restricted_colleges: string;
  quota: string;
  academic_calendar: string;
  registration_fee: string;
  accommodation_info: string;
  notes: string;
  latitude: number | null;
  longitude: number | null;
}

function parseCSVRow(row: CSVRow): SchoolRecord {
  return {
    id: row.id,
    name_zh: row.name_zh || '',
    name_en: row.name_en || '',
    country: row.country || '',
    country_en: row.country_en || '',
    url: row.url || '',
    second_exchange_eligible: row.開放第二次出國交換之同學選填 === '是',
    application_group: row.申請組別 || '',
    gpa_requirement: row.GPA要求 || '',
    grade_requirement: row.年級限制 || '',
    language_requirement: row.語言要求 || '',
    restricted_colleges: row.不接受申請之學院 || '',
    quota: row.名額 || '',
    academic_calendar: row.學校年曆 || '',
    registration_fee: row.註冊繳費 || '',
    accommodation_info: row.住宿資訊 || '',
    notes: row.注意事項 || '',
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
  };
}

async function importData() {
  console.log('🚀 開始匯入資料到 Supabase...\n');

  // 讀取 CSV 檔案
  const csvPath = path.join(process.cwd(), 'public', 'data', 'school_map.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ 找不到 CSV 檔案：${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // 解析 CSV
  const parseResult = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parseResult.errors.length > 0) {
    console.error('❌ CSV 解析錯誤：', parseResult.errors);
    process.exit(1);
  }

  const schools = parseResult.data.map(parseCSVRow);
  console.log(`📊 共讀取 ${schools.length} 筆學校資料\n`);

  // 先清空現有資料（可選）
  console.log('🗑️  清空現有資料...');
  const { error: deleteError } = await supabase
    .from('schools')
    .delete()
    .neq('id', ''); // 刪除所有資料

  if (deleteError) {
    console.error('❌ 清空資料失敗：', deleteError);
  } else {
    console.log('✅ 已清空現有資料\n');
  }

  // 批次匯入資料（每次 100 筆）
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < schools.length; i += batchSize) {
    const batch = schools.slice(i, i + batchSize);
    console.log(`📤 匯入第 ${i + 1} - ${Math.min(i + batchSize, schools.length)} 筆...`);

    const { data, error } = await supabase
      .from('schools')
      .insert(batch)
      .select();

    if (error) {
      console.error(`❌ 批次 ${i / batchSize + 1} 匯入失敗：`, error);
      errorCount += batch.length;
    } else {
      console.log(`✅ 成功匯入 ${data?.length || 0} 筆`);
      successCount += data?.length || 0;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ 匯入完成！`);
  console.log(`   成功：${successCount} 筆`);
  console.log(`   失敗：${errorCount} 筆`);
  console.log('='.repeat(50));

  // 驗證資料
  console.log('\n🔍 驗證資料...');
  const { count, error: countError } = await supabase
    .from('schools')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ 驗證失敗：', countError);
  } else {
    console.log(`✅ 資料庫中共有 ${count} 筆學校資料`);
  }
}

// 執行匯入
importData().catch((error) => {
  console.error('❌ 匯入過程發生錯誤：', error);
  process.exit(1);
});
