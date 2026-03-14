/**
 * 自動化爬蟲 + 差異比對 + 選擇性匯入
 *
 * 流程:
 *   1. 爬列表頁，比對 DB 找出新 updated 的學校
 *   2. 只爬那些學校的詳細頁
 *   3. 比對新爬的資料與 DB，產出差異報告
 *   4. 確認後用 --apply 匯入
 *
 * 用法:
 *   npx tsx scripts/sync-schools.ts                          # 增量爬蟲 + 差異報告
 *   npx tsx scripts/sync-schools.ts --semester 1             # semester 1
 *   npx tsx scripts/sync-schools.ts --full                   # 全部重爬 + 比對全部
 *   npx tsx scripts/sync-schools.ts --apply                  # 匯入全部有變更的
 *   npx tsx scripts/sync-schools.ts --apply --ids 42,78      # 只匯入指定 ID
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
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
const APPLY = args.includes('--apply');
const FULL = args.includes('--full');
const CI = args.includes('--ci');
const idsIdx = args.indexOf('--ids');
const ONLY_IDS = idsIdx >= 0
  ? new Set(args[idsIdx + 1].split(',').map(s => parseInt(s.trim())))
  : null;

const SCRAPER_DIR = path.join(process.cwd(), 'scraper');
const PYTHON = CI ? 'python3' : path.join(SCRAPER_DIR, 'venv', 'bin', 'python3');
const SCRAPER = path.join(SCRAPER_DIR, 'fetch_schools_v2.py');
const JSON_FILE = path.join(SCRAPER_DIR, `raw_schools_v2_sem${SEMESTER}.json`);
const REPORT_FILE = path.join(SCRAPER_DIR, `diff_report_sem${SEMESTER}.json`);

// ── 型別 ────────────────────────────────────────────────────
interface RawSchool {
  id: string;
  name_zh: string;
  name_en?: string;
  country: string;
  url: string;
  semester: number;
  contract_quota: number | null;
  selection_quota: number | null;
  selection_count: number | null;
  is_updated: boolean;
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
  sections_ordered?: Array<{ label: string; text: string; links: Array<{ text: string; href: string }> }>;
  quota_text?: string;
  grade_requirement?: string | null;
  restricted_colleges?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface FieldChange { old: unknown; new: unknown }

interface DiffReport {
  generated_at: string;
  semester: number;
  summary: { new: number; changed: number; unchanged: number };
  new_schools: Array<{ id: number; name_zh: string; country: string; record: Record<string, any> }>;
  changed_schools: Array<{
    id: number;
    name_zh: string;
    changes: Record<string, FieldChange>;
    record: Record<string, any>;
  }>;
}

// ── 國家映射 ─────────────────────────────────────────────────
async function buildCountryMap(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('Country').select('id, country_zh');
  if (error || !data) throw new Error(`無法載入 Country 表: ${error?.message}`);
  const map = new Map<string, number>();
  data.forEach((c: any) => { if (c.country_zh) map.set(c.country_zh, c.id); });
  const ALIASES: Record<string, string> = { '大陸地區': '中國' };
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (map.has(canonical)) map.set(alias, map.get(canonical)!);
  }
  return map;
}

// ── 轉換 ────────────────────────────────────────────────────
function toPatchRecord(school: RawSchool, countryId: number): Record<string, any> {
  return {
    id: parseInt(school.id, 10),
    name_zh: school.name_zh,
    name_en: school.name_en || null,
    country_id: countryId,
    url: school.url || null,
    contract_quota: school.contract_quota ?? null,
    selection_quota: school.selection_quota ?? null,
    selection_count: school.selection_count ?? null,
    is_updated: school.is_updated ?? false,
    second_exchange_eligible: school.second_exchange_eligible ?? false,
    no_fail_required: school.no_fail_required ?? false,
    language_group: school.language_group || '一般組',
    gpa_min: school.gpa_min ?? null,
    toefl_ibt: school.toefl_ibt ?? null,
    ielts: school.ielts ?? null,
    toeic: school.toeic ?? null,
    gept: school.gept ?? null,
    language_cefr: school.language_cefr ?? null,
    jlpt: school.jlpt ?? null,
    sections: school.sections_ordered ?? null,
    quota: school.quota_text || null,
    grade_requirement: school.grade_requirement ?? null,
    restricted_colleges: school.restricted_colleges || '無',
    latitude: school.latitude ?? null,
    longitude: school.longitude ?? null,
  };
}

// ── 比對工具 ─────────────────────────────────────────────────
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 0.0001;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => isEqual(item, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => isEqual(a[k], b[k]));
  }
  return String(a) === String(b);
}

const IGNORE_FIELDS = new Set(['id', 'latitude', 'longitude']);

function runScraper(extraArgs: string) {
  try {
    execSync(`"${PYTHON}" "${SCRAPER}" --semester ${SEMESTER} ${extraArgs}`, {
      stdio: 'inherit',
      cwd: SCRAPER_DIR,
    });
  } catch {
    console.error('❌ 爬蟲執行失敗');
    process.exit(1);
  }
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(55));
  console.log(`🔄 Sync Schools  Semester ${SEMESTER}${APPLY ? '  [APPLY]' : '  [DIFF]'}${FULL ? '  [FULL]' : ''}`);
  console.log('='.repeat(55));

  if (APPLY) {
    await applyChanges();
    return;
  }

  // ── Step 1: 讀 DB ─────────────────────────────────────────
  console.log('\n📡 讀取 DB 現有資料...');
  const { data: dbRows, error } = await supabase.from('schools').select('*');
  if (error) throw new Error(`讀取 DB 失敗: ${error.message}`);
  const dbMap = new Map<number, Record<string, any>>();
  for (const row of dbRows || []) {
    dbMap.set(row.id, row);
  }
  console.log(`   DB 共 ${dbMap.size} 筆`);

  if (FULL) {
    // ── 完整模式：全部重爬，比對所有學校 ──────────────────────
    console.log('\n📥 完整爬蟲模式（爬所有詳細頁）...');
    runScraper('');

    const raw: RawSchool[] = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    await diffAndReport(raw, dbMap);
  } else {
    // ── 增量模式 ─────────────────────────────────────────────
    // Step 2: 爬列表頁（存到暫存檔 _list_only.json）
    console.log('\n📥 爬取列表頁...');
    runScraper('--list-only');

    const listFile = JSON_FILE.replace('.json', '_list_only.json');
    const listData: RawSchool[] = JSON.parse(fs.readFileSync(listFile, 'utf-8'));

    // 找出新 updated 的學校
    const newlyUpdated: string[] = [];
    for (const school of listData) {
      const id = parseInt(school.id, 10);
      const dbRow = dbMap.get(id);
      if (school.is_updated && (!dbRow || !dbRow.is_updated)) {
        newlyUpdated.push(school.id);
      }
    }

    if (newlyUpdated.length === 0) {
      console.log('\n✅ 沒有新更新的學校。');
      console.log('   （加 --full 可強制重爬全部）');
      return;
    }

    // Step 3: 只爬新 updated 學校的詳細頁
    console.log(`\n🔍 發現 ${newlyUpdated.length} 所新更新的學校，爬取詳細頁...`);
    runScraper(`--ids ${newlyUpdated.join(',')}`);

    // Step 4: 只比對這些學校
    const raw: RawSchool[] = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    const updatedSet = new Set(newlyUpdated);
    const targetSchools = raw.filter(s => updatedSet.has(s.id));

    await diffAndReport(targetSchools, dbMap);
  }
}

// ── 比對 + 報告 ──────────────────────────────────────────────
async function diffAndReport(schools: RawSchool[], dbMap: Map<number, Record<string, unknown>>) {
  const countryMap = await buildCountryMap();

  const report: DiffReport = {
    generated_at: new Date().toISOString(),
    semester: SEMESTER,
    summary: { new: 0, changed: 0, unchanged: 0 },
    new_schools: [],
    changed_schools: [],
  };

  const unmatchedCountry: string[] = [];

  for (const school of schools) {
    const countryId = countryMap.get(school.country);
    if (!countryId) {
      unmatchedCountry.push(`${school.name_zh} (${school.country})`);
      continue;
    }

    const record = toPatchRecord(school, countryId);
    const id = record.id;
    const dbRow = dbMap.get(id);

    if (!dbRow) {
      report.new_schools.push({ id, name_zh: school.name_zh, country: school.country, record });
      report.summary.new++;
      continue;
    }

    const changes: Record<string, FieldChange> = {};
    for (const [key, newVal] of Object.entries(record)) {
      if (IGNORE_FIELDS.has(key)) continue;
      const oldVal = dbRow[key];
      if (!isEqual(oldVal, newVal)) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }

    if (Object.keys(changes).length > 0) {
      report.changed_schools.push({ id, name_zh: school.name_zh, changes, record });
      report.summary.changed++;
    } else {
      report.summary.unchanged++;
    }
  }

  // ── 輸出報告 ──────────────────────────────────────────────
  if (unmatchedCountry.length > 0) {
    console.log(`\n⚠️  無法匹配國家 ${unmatchedCountry.length} 筆:`);
    unmatchedCountry.forEach(s => console.log(`   - ${s}`));
  }

  console.log('\n' + '='.repeat(55));
  console.log(`📊 差異報告 Semester ${SEMESTER}`);
  console.log('='.repeat(55));

  if (report.new_schools.length > 0) {
    console.log(`\n🆕 新學校 (${report.new_schools.length} 所):`);
    for (const s of report.new_schools) {
      console.log(`  #${s.id} ${s.name_zh} (${s.country})`);
    }
  }

  if (report.changed_schools.length > 0) {
    console.log(`\n📝 有變更 (${report.changed_schools.length} 所):`);
    for (const s of report.changed_schools) {
      const fields = Object.keys(s.changes).join(', ');
      console.log(`  #${s.id} ${s.name_zh}: ${fields}`);
    }
  }

  if (report.summary.new + report.summary.changed === 0) {
    console.log('\n✅ 沒有差異。');
  } else {
    console.log(`\n✅ 無變更: ${report.summary.unchanged} 所`);
  }
  console.log('='.repeat(55));

  // 存報告
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n📄 報告已存: ${REPORT_FILE}`);

  if (report.summary.new + report.summary.changed > 0) {
    console.log(`\n匯入全部: npx tsx scripts/sync-schools.ts --semester ${SEMESTER} --apply`);
    console.log(`匯入指定: npx tsx scripts/sync-schools.ts --semester ${SEMESTER} --apply --ids <id1,id2,...>`);
  }
}

// ── Apply ────────────────────────────────────────────────────
async function applyChanges() {
  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`❌ 找不到差異報告: ${REPORT_FILE}`);
    console.error(`   請先執行: npx tsx scripts/sync-schools.ts --semester ${SEMESTER}`);
    process.exit(1);
  }

  const report: DiffReport = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
  console.log(`📄 讀取報告: ${report.generated_at}`);

  const allSchools = [
    // 新學校：寫入完整 record
    ...report.new_schools.map(s => ({ id: s.id, name_zh: s.name_zh, record: s.record })),
    // 既有學校：只寫入有差異的欄位 + id
    ...report.changed_schools.map(s => {
      const patch: Record<string, unknown> = { id: s.id };
      for (const key of Object.keys(s.changes)) {
        patch[key] = s.changes[key].new;
      }
      return { id: s.id, name_zh: s.name_zh, record: patch };
    }),
  ];

  const toApply = ONLY_IDS
    ? allSchools.filter(s => ONLY_IDS.has(s.id))
    : allSchools;

  if (toApply.length === 0) {
    console.log('沒有需要匯入的學校。');
    return;
  }

  console.log(`\n將匯入 ${toApply.length} 所學校:`);
  for (const s of toApply) {
    console.log(`  #${s.id} ${s.name_zh}`);
  }
  console.log();

  const BATCH = 100;
  let success = 0, fail = 0;
  const records = toApply.map(s => s.record);

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
      console.log(`  ✓ ${i + 1}–${Math.min(i + BATCH, records.length)} 筆`);
    }
  }

  console.log('\n' + '='.repeat(55));
  console.log(`✅ 匯入完成！成功 ${success} 筆 / 失敗 ${fail} 筆`);
  console.log('='.repeat(55));
}

main().catch(e => { console.error(e); process.exit(1); });
