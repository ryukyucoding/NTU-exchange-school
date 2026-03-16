/**
 * 連 Supabase 逐項測試 API 會用到的查詢，找出 schema 不符處
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const env: Record<string, string> = {};
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const [k, ...v] = t.split('=');
      if (k && v.length) env[k] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch {
  console.error('無法讀取 .env.local');
  process.exit(1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run(name: string, fn: () => Promise<{ error: { message: string } | null }>) {
  const { error } = await fn();
  if (error) console.log(`FAIL ${name}\n  → ${error.message}`);
  else console.log(`OK   ${name}`);
}

async function main() {
  console.log('--- Supabase 診斷 ---\n');

  await run('schools *', () => supabase.from('schools').select('*').limit(1));
  await run('Country id,country_zh', () =>
    supabase.from('Country').select('id, country_zh, country_en, continent').limit(1)
  );
  await run('Board', () => supabase.from('Board').select('id, type, name, slug').limit(1));
  await run('Post id status deletedAt', () =>
    supabase.from('Post').select('id, status, deletedAt').limit(1)
  );
  await run('Post full + author join', () =>
    (supabase as any)
      .from('Post')
      .select(
        `*, author:User!Post_authorId_fkey (id, name, userID, image, email)`
      )
      .limit(1)
  );
  await run('User profile cols', () =>
    supabase.from('User').select('id,name,userID,image,bio,backgroundImage').limit(1)
  );
  await run('SchoolWishList wishlist cols', () =>
    supabase.from('SchoolWishList').select('id, schoolId, note, order, createdAt, updatedAt').limit(1)
  );
  await run('UserQualification', () =>
    supabase
      .from('UserQualification')
      .select('college, grade, gpa, toefl, ielts, toeic, applicationGroup')
      .limit(1)
  );
  await run('SchoolRating', () =>
    supabase.from('SchoolRating').select('schoolId, livingConvenience, courseLoading').limit(1)
  );
  await run('Hashtag', () => supabase.from('Hashtag').select('content, postId').limit(1));
  await run('Bookmark', () => supabase.from('Bookmark').select('postId, createdAt').limit(1));
  await run('Notification', () => supabase.from('Notification').select('id, type').limit(1));

  // Raw SQL: list columns on Post (if rpc not available, skip)
  const { data: cols, error: sqlErr } = await supabase.rpc('exec_sql', {
    q: "select column_name from information_schema.columns where table_schema='public' and table_name='Post'",
  });
  if (!sqlErr && cols) console.log('\nPost columns (rpc):', cols);
  else console.log('\n(無 exec_sql rpc，略過 information_schema)');
}

main().catch(console.error);
