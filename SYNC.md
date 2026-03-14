# 學校資料同步指令

## 自動化（GitHub Actions + Discord）

每天台灣 21:00 自動執行增量同步，結果發到 Discord。

### 設定步驟（一次性）

1. 建一個 Discord 頻道（如 `#sync-notifications`）
2. 頻道設定 → 整合 → Webhook → 新增，複製 Webhook URL
3. 到 GitHub repo → Settings → Secrets → Actions，加入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DISCORD_WEBHOOK_URL`

### 自動流程

1. 每天 21:00，GitHub Actions 自動跑 `sync.yml`
2. Discord 收到差異報告訊息（含 Approve 按鈕）
3. 點 Approve → 到 GitHub Actions → 點 "Run workflow" → 自動匯入
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
