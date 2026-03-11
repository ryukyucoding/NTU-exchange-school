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

const updates: { id: number; name: string; old: string; new: string }[] =
  JSON.parse(fs.readFileSync('/tmp/multi_group_updates.json', 'utf-8'));

async function main() {
  let ok = 0, fail = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from('schools')
      .update({ language_group: u.new })
      .eq('id', u.id);
    if (error) {
      console.error(`  ❌ id=${u.id} ${u.name}: ${error.message}`);
      fail++;
    } else {
      console.log(`  ✓ id=${u.id} ${u.name}: ${u.old} → ${u.new}`);
      ok++;
    }
  }
  console.log(`\n完成：成功 ${ok} / 失敗 ${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
