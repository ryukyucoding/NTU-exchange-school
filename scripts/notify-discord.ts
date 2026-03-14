/**
 * 讀取差異報告，發送 Discord 通知
 *
 * 用法:
 *   npx tsx scripts/notify-discord.ts                    # semester 2
 *   npx tsx scripts/notify-discord.ts --semester 1
 *   npx tsx scripts/notify-discord.ts --apply-result     # 匯入完成通知
 */

import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const semIdx = args.indexOf('--semester');
const SEMESTER = semIdx >= 0 ? parseInt(args[semIdx + 1]) : 2;
const IS_APPLY_RESULT = args.includes('--apply-result');

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
if (!WEBHOOK_URL) {
  console.error('❌ 請設定 DISCORD_WEBHOOK_URL');
  process.exit(1);
}

const REPORT_FILE = path.join(process.cwd(), 'scraper', `diff_report_sem${SEMESTER}.json`);
const REPO_URL = 'https://github.com/ryukyucoding/NTU-exchange-school';
const APPLY_WORKFLOW_URL = `${REPO_URL}/actions/workflows/sync-apply.yml`;

interface FieldChange { old: unknown; new: unknown }
interface DiffReport {
  generated_at: string;
  semester: number;
  summary: { new: number; changed: number; unchanged: number };
  new_schools: Array<{ id: number; name_zh: string; country: string }>;
  changed_schools: Array<{ id: number; name_zh: string; changes: Record<string, FieldChange> }>;
}

function formatValue(val: unknown): string {
  if (val == null) return '`null`';
  if (typeof val === 'boolean') return val ? '`true`' : '`false`';
  if (typeof val === 'object') return '`[object]`';
  return `\`${String(val)}\``;
}

async function sendWebhook(payload: Record<string, unknown>) {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`❌ Discord webhook 失敗: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  console.log('✅ Discord 通知已送出');
}

async function notifyDiffReport() {
  if (!fs.existsSync(REPORT_FILE)) {
    console.error(`❌ 找不到報告: ${REPORT_FILE}`);
    process.exit(1);
  }

  const report: DiffReport = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
  const { summary } = report;

  // 沒有差異
  if (summary.new === 0 && summary.changed === 0) {
    await sendWebhook({
      embeds: [{
        title: `📊 學校資料同步 Semester ${SEMESTER}`,
        description: '✅ 沒有新更新的學校，資料無變化。',
        color: 0x2ecc71, // green
        timestamp: report.generated_at,
      }],
    });
    return;
  }

  // 組裝訊息
  const lines: string[] = [];

  if (report.new_schools.length > 0) {
    lines.push(`**🆕 新學校 (${report.new_schools.length} 所)**`);
    for (const s of report.new_schools) {
      lines.push(`> #${s.id} ${s.name_zh} (${s.country})`);
    }
    lines.push('');
  }

  if (report.changed_schools.length > 0) {
    lines.push(`**📝 有變更 (${report.changed_schools.length} 所)**`);
    for (const s of report.changed_schools) {
      lines.push(`> **#${s.id} ${s.name_zh}**`);
      for (const [field, change] of Object.entries(s.changes)) {
        const oldStr = formatValue(change.old);
        const newStr = formatValue(change.new);
        lines.push(`> \u2003${field}：${oldStr} → ${newStr}`);
      }
    }
    lines.push('');
  }

  lines.push(`✅ 無變更: ${summary.unchanged} 所`);
  lines.push('');
  lines.push(`[👉 **Approve — 執行匯入**](${APPLY_WORKFLOW_URL})`);

  await sendWebhook({
    embeds: [{
      title: `📊 學校資料差異報告 Semester ${SEMESTER}`,
      description: lines.join('\n'),
      color: 0xf39c12, // orange
      timestamp: report.generated_at,
    }],
  });
}

async function notifyApplyResult() {
  // 從 GitHub Actions 環境變數取得結果
  const success = process.env.APPLY_SUCCESS || '0';
  const fail = process.env.APPLY_FAIL || '0';
  const isSuccess = parseInt(fail) === 0;

  await sendWebhook({
    embeds: [{
      title: `${isSuccess ? '✅' : '⚠️'} Sync Apply 完成 Semester ${SEMESTER}`,
      description: `成功 **${success}** 筆 / 失敗 **${fail}** 筆`,
      color: isSuccess ? 0x2ecc71 : 0xe74c3c,
      timestamp: new Date().toISOString(),
    }],
  });
}

async function main() {
  if (IS_APPLY_RESULT) {
    await notifyApplyResult();
  } else {
    await notifyDiffReport();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
