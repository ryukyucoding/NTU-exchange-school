import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: dbSchools } = await supabase
    .from('schools')
    .select('id, name_zh, latitude, longitude')
    .not('latitude', 'is', null);

  const jsonSchools: any[] = JSON.parse(fs.readFileSync('./scraper/raw_schools_v2_sem2.json', 'utf-8'));
  const jsonById = new Map(jsonSchools.map((s: any) => [parseInt(s.id), s]));

  console.log(`DB schools with coords: ${dbSchools?.length}`);

  let same = 0, different = 0;
  const diffs: any[] = [];

  for (const db of dbSchools ?? []) {
    const js = jsonById.get(db.id);
    if (!js?.latitude) continue;
    const latDiff = Math.abs(db.latitude - js.latitude);
    const lonDiff = Math.abs(db.longitude - js.longitude);
    if (latDiff > 0.01 || lonDiff > 0.01) {
      different++;
      diffs.push({ name: db.name_zh, db: [db.latitude, db.longitude], json: [js.latitude, js.longitude], diff: [latDiff, lonDiff] });
    } else {
      same++;
    }
  }

  const dbNoCoord = (await supabase.from('schools').select('id', {count: 'exact', head: true}).is('latitude', null)).count;
  console.log(`DB schools WITHOUT coords: ${dbNoCoord}`);
  console.log(`Same (< 0.01°): ${same}`);
  console.log(`Different (> 0.01°): ${different}`);

  if (diffs.length > 0) {
    console.log('\nDifferences:');
    diffs.forEach((d: any) => {
      console.log(`  ${d.name}`);
      console.log(`    DB:   ${d.db[0].toFixed(4)}, ${d.db[1].toFixed(4)}`);
      console.log(`    JSON: ${d.json[0].toFixed(4)}, ${d.json[1].toFixed(4)}`);
    });
  }
}
main().catch(console.error);
