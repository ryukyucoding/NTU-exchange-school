# 學校資料同步指令

## 自動化（GitHub Actions + Discord）

每天台灣 21:00 自動執行增量同步，結果發到 Discord。
有差異時會附上 Approve 按鈕，一鍵觸發匯入。

### 設定步驟（一次性）

#### 1. Discord Bot

1. 到 [Discord Developer Portal](https://discord.com/developers/applications) → New Application
2. 左側 **Bot** → Reset Token → 複製 Token（這是 `DISCORD_BOT_TOKEN`）
3. 同頁面開啟 **Message Content Intent**
4. 左側 **OAuth2** → URL Generator：
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`
   - 複製產生的 URL，貼到瀏覽器邀請 Bot 進你的 Server
5. 在 Discord 開啟開發者模式（設定 → 進階 → 開發者模式）
6. 對目標頻道右鍵 → 複製頻道 ID（這是 `DISCORD_CHANNEL_ID`）
7. 左側 **General Information** → 複製 Application ID 和 Public Key
8. 左側 **General Information** → Interactions Endpoint URL 填入：
   `https://你的域名/api/discord-interaction`

#### 2. Discord Webhook（用於無差異 & apply 結果通知）

1. 頻道設定 → 整合 → Webhook → 新增，複製 Webhook URL

#### 3. GitHub PAT

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. 只選這個 repo，權限：Actions (Read and write)
3. 複製 Token（這是 `GITHUB_PAT`）

#### 4. GitHub Secrets

到 GitHub repo → Settings → Secrets → Actions，加入：

| Secret | 說明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DISCORD_WEBHOOK_URL` | Discord channel Webhook URL |
| `DISCORD_BOT_TOKEN` | Discord Bot Token |
| `DISCORD_CHANNEL_ID` | Discord 頻道 ID |
| `GITHUB_PAT` | GitHub Fine-grained PAT |

#### 5. Vercel 環境變數

在 Vercel 專案 Settings → Environment Variables 加入：

| 變數 | 說明 |
|------|------|
| `DISCORD_PUBLIC_KEY` | Discord Application Public Key（驗證簽章用） |
| `GITHUB_PAT` | 同上，用於 API route 觸發 workflow |

### 自動流程

1. 每天 21:00，GitHub Actions 自動跑 `sync.yml`
2. Discord 收到差異報告訊息（含 ✅ Approve 按鈕）
3. 點 Approve → 自動觸發 GitHub Actions `sync-apply.yml`
4. 匯入完成後 Discord 再次通知結果

### 手動觸發

GitHub Actions → Sync Schools → Run workflow（手動跑一次同步）

---

## 本機操作

```bash
# 增量同步（只爬新 updated 的學校）+ 差異報告
npm run sync            # semester 2
npm run sync:sem1       # semester 1

# 看完報告後，匯入 DB
npm run sync:apply              # 匯入全部有變更的
npx tsx scripts/sync-schools.ts --semester 2 --apply --ids 42,78  # 只匯入指定 ID
```

## 選項

| 選項 | 說明 |
|------|------|
| `--semester 1` | 指定學期（預設 2） |
| `--full` | 強制全部重爬（不只爬新 updated 的） |
| `--apply` | 將變更寫入 DB |
| `--ids 1,2,3` | 搭配 `--apply`，只匯入指定 ID |
| `--ci` | CI 模式（用系統 Python，不用 venv） |

## 差異報告

報告存在 `scraper/diff_report_sem{N}.json`，終端輸出格式：

```
🆕 新學校 (2 所):
  #301 某某大學 (日本)

📝 有變更 (3 所):
  #42 早稻田大學: gpa_min, toefl_ibt
  #78 柏林自由大學: ielts, language_group

✅ 無變更: 284 所
```

注意：經緯度不列入差異比對。Apply 時只更新有變更的欄位，不會覆蓋其他欄位。

## 手動爬蟲（不透過 sync）

```bash
npm run scrape          # 完整爬蟲 semester 2
npm run scrape:sem1     # 完整爬蟲 semester 1
npm run import-schools-v2       # 直接匯入（不比對）
npm run import-schools-v2:dry   # dry-run
```
