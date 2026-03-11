/**
 * 只更新 language_group 欄位為 '中語組'，不動其他欄位
 * 用法: npx tsx scripts/fix-language-group.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(process.cwd(), '.env.local') });
  dotenv.config({ path: path.join(process.cwd(), '.env') });
} catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const raw: any[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scraper/raw_schools_v2_sem2.json'), 'utf-8')
);

const toFix = raw
  .filter(s => (s.eligibility_text || '').includes('中語組'))
  .map(s => ({ id: parseInt(s.id, 10), name: s.name_zh }));

console.log(`準備更新 ${toFix.length} 所學校的 language_group → 中語組\n`);

async function main() {
  let ok = 0, fail = 0;
  for (const { id, name } of toFix) {
    const { error } = await supabase
      .from('schools')
      .update({ language_group: '中語組' })
      .eq('id', id);
    if (error) {
      console.error(`  ❌ id=${id} ${name}: ${error.message}`);
      fail++;
    } else {
      console.log(`  ✓ id=${id} ${name}`);
      ok++;
    }
  }
  console.log(`\n完成：成功 ${ok} / 失敗 ${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
