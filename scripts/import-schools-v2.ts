/**
 * 將 raw_schools_v2_sem{N}.json 匯入 Supabase
 * 用法:
 *   npx tsx scripts/import-schools-v2.ts              # 匯入 semester 2（預設）
 *   npx tsx scripts/import-schools-v2.ts --semester 1 # 匯入 semester 1
 *   npx tsx scripts/import-schools-v2.ts --dry-run    # 預覽不實際寫入
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
  dotenv.config({ path: path.join(process.cwd(), '.env') });
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 請設定 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── CLI 參數 ────────────────────────────────────────────────
const args = process.argv.slice(2);
const semIdx = args.indexOf('--semester');
const SEMESTER = semIdx >= 0 ? parseInt(args[semIdx + 1]) : 2;
const DRY_RUN = args.includes('--dry-run');

const JSON_FILE = path.join(
  process.cwd(), 'scraper', `raw_schools_v2_sem${SEMESTER}.json`
);

// ── 型別 ────────────────────────────────────────────────────
interface RawSchool {
  id: string;
  name_zh: string;
  name_zh_detail?: string;
  name_en?: string;
  country: string;
  url: string;
  semester: number;
  contract_quota: number | null;
  selection_quota: number | null;
  selection_count: number | null;
  is_updated: boolean;
  // structured fields
  language_group?: string;
  gpa_min?: number | null;
  toefl_ibt?: number | null;
  ielts?: number | null;
  toeic?: number | null;
  gept?: string | null;
  language_cefr?: string | null;
  jlpt?: string | null;
  no_fail_required?: boolean;
  second_exchange_eligible?: boolean;
  quota?: number | null;
  semesters?: string;
  // sections
  sections_ordered?: Array<{ label: string; text: string; links: Array<{ text: string; href: string }> }>;
  // raw texts (keep for backward compat)
  eligibility_text?: string;
  quota_text?: string;
  calendar_text?: string;
  notes_text?: string;
  housing_text?: string;
  // extracted structured text fields
  grade_requirement?: string | null;
  restricted_colleges?: string | null;
  // coordinates (carry over from old data if available)
  latitude?: number | null;
  longitude?: number | null;
}

// ── 國家映射 ─────────────────────────────────────────────────
async function buildCountryMap(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('Country').select('id, country_zh');
  if (error || !data) throw new Error(`無法載入 Country 表: ${error?.message}`);
  const map = new Map<string, number>();
  data.forEach((c: any) => { if (c.country_zh) map.set(c.country_zh, c.id); });
  // 別名：爬蟲用的名稱 → DB 裡的名稱
  const ALIASES: Record<string, string> = { '大陸地區': '中國' };
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (map.has(canonical)) map.set(alias, map.get(canonical)!);
  }
  console.log(`✅ 載入 ${map.size} 個國家（含別名）`);
  return map;
}

/**
 * 轉換為「只更新新欄位」的 patch 物件
 * 不包含：latitude, longitude（舊資料有座標，新資料沒有，不可覆蓋）
 */
function toPatchRecord(school: RawSchool, countryId: number) {
  return {
    id: parseInt(school.id, 10),
    // 基本資訊
    name_zh: school.name_zh,
    name_en: school.name_en || null,
    country_id: countryId,
    url: school.url || null,
    // 學期相關
    contract_quota: school.contract_quota ?? null,
    selection_quota: school.selection_quota ?? null,
    selection_count: school.selection_count ?? null,
    is_updated: school.is_updated ?? false,
    // 篩選用布林
    second_exchange_eligible: school.second_exchange_eligible ?? false,
    no_fail_required: school.no_fail_required ?? false,
    // 語言/GPA 結構化數字
    language_group: school.language_group || '一般組',
    gpa_min: school.gpa_min ?? null,
    toefl_ibt: school.toefl_ibt ?? null,
    ielts: school.ielts ?? null,
    toeic: school.toeic ?? null,
    gept: school.gept ?? null,
    language_cefr: school.language_cefr ?? null,
    jlpt: school.jlpt ?? null,
    // sections JSONB
    sections: school.sections_ordered ?? null,
    // 文字欄位
    quota: school.quota_text || null,
    grade_requirement: school.grade_requirement ?? null,
    restricted_colleges: school.restricted_colleges || '無',
    latitude: school.latitude ?? null,
    longitude: school.longitude ?? null,
  };
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(55));
  console.log(`🚀 匯入學校資料 v2  Semester ${SEMESTER}${DRY_RUN ? '  [DRY RUN]' : ''}`);
  console.log(`📂 來源: ${JSON_FILE}`);
  console.log('='.repeat(55));

  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ 找不到檔案: ${JSON_FILE}`);
    console.error(`   請先執行: cd scraper && python fetch_schools_v2.py --semester ${SEMESTER}`);
    process.exit(1);
  }

  const raw: RawSchool[] = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  console.log(`📊 讀取 ${raw.length} 筆\n`);

  const countryMap = await buildCountryMap();

  const records: ReturnType<typeof toPatchRecord>[] = [];
  const unmatched: string[] = [];

  for (const school of raw) {
    const countryId = countryMap.get(school.country);
    if (!countryId) {
      unmatched.push(`${school.name_zh} (${school.country})`);
      continue;
    }
    records.push(toPatchRecord(school, countryId));
  }

  console.log(`✅ 成功轉換 ${records.length} 筆`);
  if (unmatched.length > 0) {
    console.warn(`⚠️  無法匹配國家 ${unmatched.length} 筆:`);
    unmatched.forEach(s => console.warn(`   - ${s}`));
  }
  console.log();

  // 統計
  const updated = records.filter(r => r.is_updated).length;
  const accepting = records.filter(r => r.selection_quota != null && r.selection_quota > 0).length;
  const noFail = records.filter(r => r.no_fail_required).length;
  console.log(`📈 統計:`);
  console.log(`   已更新本學期資料: ${updated} 所`);
  console.log(`   本學期有名額:     ${accepting} 所`);
  console.log(`   要求無不及格:     ${noFail} 所`);
  console.log();

  if (DRY_RUN) {
    console.log('🔍 DRY RUN 模式，不實際寫入。範例資料:');
    console.log(JSON.stringify(records[0], null, 2));
    console.log('\n⚠️  以下欄位不會被覆蓋（保留舊資料）:');
    console.log('   latitude, longitude');
    return;
  }

  // Upsert（patch 模式：只更新指定欄位，不清空舊資料）
  // 不做 DELETE，改用 upsert with onConflict='id'
  // 這樣 latitude/longitude 等舊欄位不會被碰
  console.log('📝 使用 patch 模式（不覆蓋座標和舊文字欄位）...\n');

  const BATCH = 100;
  let success = 0, fail = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('schools')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })
      .select('id');
    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / BATCH) + 1} 失敗: ${error.message}`);
      fail += batch.length;
    } else {
      success += data?.length ?? 0;
      console.log(`   ✓ ${i + 1}–${Math.min(i + BATCH, records.length)} 筆`);
    }
  }

  console.log('\n' + '='.repeat(55));
  console.log(`✅ 匯入完成！成功 ${success} 筆 / 失敗 ${fail} 筆`);
  console.log('='.repeat(55));

  // ── 同步 Board 記錄 ──────────────────────────────────────────
  console.log('\n🔄 同步 Board 記錄...');

  const { data: countries } = await supabase.from('Country').select('id, country_zh, country_en');
  const { data: allSchools } = await supabase.from('schools').select('id, name_zh, name_en');
  const { data: existingBoards } = await supabase.from('Board').select('id, type, country_id, schoolId');

  const existingCountryIds = new Set(
    (existingBoards || []).filter((b: any) => b.type === 'country' && b.country_id).map((b: any) => b.country_id)
  );
  const existingSchoolIds = new Set(
    (existingBoards || []).filter((b: any) => b.type === 'school' && b.schoolId).map((b: any) => b.schoolId)
  );

  const newCountryBoards = (countries || [])
    .filter((c: any) => !existingCountryIds.has(c.id))
    .map((c: any) => ({
      id: randomUUID(),
      type: 'country',
      name: c.country_zh || c.country_en,
      slug: `country-${c.id}`,
      country_id: c.id,
      schoolId: null,
      description: null,
    }));

  const newSchoolBoards = (allSchools || [])
    .filter((s: any) => !existingSchoolIds.has(s.id))
    .map((s: any) => ({
      id: randomUUID(),
      type: 'school',
      name: s.name_zh || s.name_en,
      slug: `school-${s.id}`,
      country_id: null,
      schoolId: s.id,
      description: null,
    }));

  let boardCreated = 0;
  for (const batch of [newCountryBoards, newSchoolBoards]) {
    if (batch.length === 0) continue;
    const { data, error } = await supabase.from('Board').insert(batch).select('id');
    if (error) {
      console.error(`❌ Board 建立失敗: ${error.message}`);
    } else {
      boardCreated += data?.length ?? 0;
    }
  }

  if (boardCreated > 0) {
    console.log(`✅ 新建 ${boardCreated} 個 Board（國家 ${newCountryBoards.length} + 學校 ${newSchoolBoards.length}）`);
  } else {
    console.log('⏭️  所有 Board 已存在，無需建立');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
