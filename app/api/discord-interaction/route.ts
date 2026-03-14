import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/discord-interaction
 * 接收 Discord Interactive Button 點擊，觸發 GitHub Actions sync-apply workflow
 *
 * Discord 要求：
 *  1. 驗證 Ed25519 簽章
 *  2. PING (type=1) 回 PONG
 *  3. Button (type=3) 觸發 workflow_dispatch
 */

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_PAT || "";
const GITHUB_REPO = "ryukyucoding/NTU-exchange-school";

// --- Ed25519 signature verification ---
async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  if (!DISCORD_PUBLIC_KEY) return false;

  const encoder = new TextEncoder();
  const keyBytes = hexToUint8Array(DISCORD_PUBLIC_KEY);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "Ed25519", namedCurve: "Ed25519" },
    false,
    ["verify"]
  );

  const message = encoder.encode(timestamp + body);
  const sig = hexToUint8Array(signature);

  return crypto.subtle.verify("Ed25519", cryptoKey, sig, message);
}

function hexToUint8Array(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return arr;
}

// --- GitHub API: trigger workflow ---
async function triggerWorkflow(semester: string, ids: string = "") {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/sync-apply.yml/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      ref: "main",
      inputs: { semester, ids },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";

  // 1. 驗證簽章
  const isValid = await verifyDiscordSignature(body, signature, timestamp);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const interaction = JSON.parse(body);

  // 2. PING → PONG (Discord 註冊 endpoint 時的驗證)
  if (interaction.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  // 3. Message Component interaction (Button click)
  if (interaction.type === 3) {
    const customId: string = interaction.data?.custom_id || "";

    // custom_id 格式: "sync_apply:semester"  例如 "sync_apply:2"
    if (customId.startsWith("sync_apply:")) {
      const semester = customId.split(":")[1] || "2";

      try {
        await triggerWorkflow(semester);

        // 回覆 Discord（更新訊息）
        return NextResponse.json({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: `✅ 已觸發 Sync Apply (Semester ${semester})，等待 GitHub Actions 執行...`,
            flags: 64, // EPHEMERAL — 只有點擊者看到
          },
        });
      } catch (err: any) {
        return NextResponse.json({
          type: 4,
          data: {
            content: `❌ 觸發失敗: ${err.message}`,
            flags: 64,
          },
        });
      }
    }
  }

  // 未知的 interaction type
  return NextResponse.json({ type: 1 });
}
