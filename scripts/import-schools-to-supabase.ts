import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

// 嘗試載入環境變數（如果 dotenv 可用）
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
  dotenv.config({ path: path.join(process.cwd(), '.env') });
} catch (e) {
  // dotenv 不可用，直接使用 process.env（環境變數應該已經設定）
  console.log('ℹ️  使用系統環境變數');
}

// Supabase 設定
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 錯誤：請設定 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 環境變數');
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
  accommodation_info: string;
  注意事項: string;
  latitude: string;
  longitude: string;
}

interface SchoolRecord {
  id: number;  // 改為 INT8 (number)
  name_zh: string;
  name_en: string;
  country_id: number;
  url: string | null;
  second_exchange_eligible: boolean;
  application_group: string | null;
  gpa_requirement: string | null;
  grade_requirement: string | null;
  language_requirement: string | null;
  restricted_colleges: string | null;
  quota: string | null;
  academic_calendar: string | null;
  registration_fee: string | null;
  accommodation_info: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
}

// 建立國家名稱到 ID 的映射
async function buildCountryMap(): Promise<Map<string, number>> {
  console.log('🔍 從 Supabase 載入國家資料...\n');
  
  // 嘗試不同的表名（PostgreSQL 區分大小寫）
  let countries, error;
  
  // 先嘗試 "Country"（大寫）
  const result1 = await supabase
    .from('Country')
    .select('id, country_zh, country_en');
  
  if (!result1.error) {
    countries = result1.data;
    error = null;
  } else {
    // 如果失敗，嘗試 "countries"（小寫）
    const result2 = await supabase
      .from('countries')
      .select('id, country_zh, country_en');
    countries = result2.data;
    error = result2.error;
  }

  if (error) {
    console.error('❌ 載入國家資料失敗：', error);
    throw error;
  }

  if (!countries || countries.length === 0) {
    console.error('❌ 找不到任何國家資料，請先匯入 countries 表');
    process.exit(1);
  }

  console.log(`✅ 載入 ${countries.length} 個國家\n`);

  // 建立映射：country_zh -> id, country_en -> id
  const countryMap = new Map<string, number>();
  
  countries.forEach((country: any) => {
    // 使用 country_zh 作為 key
    if (country.country_zh) {
      countryMap.set(country.country_zh, country.id);
    }
    // 使用 country_en 作為 key
    if (country.country_en) {
      countryMap.set(country.country_en, country.id);
    }
  });

  return countryMap;
}

function parseCSVRow(row: CSVRow, countryMap: Map<string, number>): SchoolRecord | null {
  // 嘗試根據 country_en 匹配
  let countryId = countryMap.get(row.country_en);
  
  // 如果 country_en 找不到，嘗試用 country (中文)
  if (!countryId) {
    countryId = countryMap.get(row.country);
  }

  // 如果還是找不到，記錄錯誤
  if (!countryId) {
    console.warn(`⚠️  無法找到國家 ID：${row.country} / ${row.country_en}`);
    return null;
  }

  return {
    id: parseInt(row.id, 10),  // 將 id 轉換為數字
    name_zh: row.name_zh || '',
    name_en: row.name_en || '',
    country_id: countryId,
    url: row.url || null,
    second_exchange_eligible: row.開放第二次出國交換之同學選填 === '是',
    application_group: row.申請組別 || null,
    gpa_requirement: row.GPA要求 || null,
    grade_requirement: row.年級限制 || null,
    language_requirement: row.語言要求 || null,
    restricted_colleges: row.不接受申請之學院 || null,
    quota: row.名額 || null,
    academic_calendar: row.學校年曆 || null,
    registration_fee: row.註冊繳費 || null,
    accommodation_info: row.accommodation_info || null,
    notes: row.注意事項 || null,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
  };
}

async function importData() {
  console.log('🚀 開始匯入學校資料到 Supabase...\n');

  // 1. 建立國家映射
  const countryMap = await buildCountryMap();

  // 2. 讀取 CSV 檔案
  const csvPath = path.join(process.cwd(), 'public', 'data', 'school_map.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ 找不到 CSV 檔案：${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // 3. 解析 CSV
  const parseResult = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parseResult.errors.length > 0) {
    console.error('❌ CSV 解析錯誤：', parseResult.errors);
    process.exit(1);
  }

  // 4. 轉換資料並匹配 country_id
  const schools: SchoolRecord[] = [];
  const unmatchedCountries = new Set<string>();

  parseResult.data.forEach((row) => {
    const school = parseCSVRow(row, countryMap);
    if (school) {
      schools.push(school);
    } else {
      unmatchedCountries.add(`${row.country} / ${row.country_en}`);
    }
  });

  console.log(`📊 共讀取 ${parseResult.data.length} 筆學校資料`);
  console.log(`✅ 成功匹配 ${schools.length} 筆`);
  if (unmatchedCountries.size > 0) {
    console.log(`⚠️  無法匹配的國家：${unmatchedCountries.size} 個`);
    unmatchedCountries.forEach(country => {
      console.log(`   - ${country}`);
    });
  }
  console.log();

  if (schools.length === 0) {
    console.error('❌ 沒有可匯入的資料');
    process.exit(1);
  }

  // 5. 先清空現有資料（可選）
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

  // 6. 批次匯入資料（每次 100 筆）
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
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 匯入失敗：`, error);
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
  if (unmatchedCountries.size > 0) {
    console.log(`   無法匹配：${unmatchedCountries.size} 筆`);
  }
  console.log('='.repeat(50));

  // 7. 驗證資料
  console.log('\n🔍 驗證資料...');
  const { count, error: countError } = await supabase
    .from('schools')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ 驗證失敗：', countError);
  } else {
    console.log(`✅ 資料庫中共有 ${count} 筆學校資料`);
  }

  // 8. 驗證外鍵關係
  console.log('\n🔍 驗證外鍵關係...');
  const { data: invalidSchools, error: fkError } = await supabase
    .from('schools')
    .select('id, name_zh, country_id')
    .not('country_id', 'is', null);

  if (fkError) {
    console.error('❌ 驗證外鍵失敗：', fkError);
  } else {
    console.log(`✅ 所有學校都有有效的 country_id`);
  }
}

// 執行匯入
importData().catch((error) => {
  console.error('❌ 匯入過程發生錯誤：', error);
  process.exit(1);
});

