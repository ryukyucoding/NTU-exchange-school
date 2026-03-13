# 學校資料同步指令

## 快速開始

```bash
# 1. 增量同步（只爬新 updated 的學校）+ 差異報告
npm run sync            # semester 2
npm run sync:sem1       # semester 1

# 2. 看完報告後，匯入 DB
npm run sync:apply              # 匯入全部有變更的
npx tsx scripts/sync-schools.ts --semester 2 --apply --ids 42,78  # 只匯入指定 ID
```

## 流程說明

### Step 1: 增量爬蟲 + 比對

`npm run sync` 會自動：

1. 讀取 DB 現有 `is_updated` 狀態
2. 爬 OIA 列表頁，找出**新標記 updated** 的學校（DB 是 false → 列表是 true）
3. 只爬那些新 updated 學校的詳細頁（省時間）
4. 與 DB 比對，在終端顯示哪些學校的哪些欄位有變更
5. 存完整報告到 `scraper/diff_report_sem{N}.json`

### Step 2: 確認後匯入

```bash
npm run sync:apply                                              # 全部匯入
npx tsx scripts/sync-schools.ts --semester 2 --apply --ids 42,78  # 指定 ID
```

## 選項

| 選項 | 說明 |
|------|------|
| `--semester 1` | 指定學期（預設 2） |
| `--full` | 強制全部重爬（不只爬新 updated 的） |
| `--apply` | 將變更寫入 DB |
| `--ids 1,2,3` | 搭配 `--apply`，只匯入指定 ID |

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

注意：經緯度不列入差異比對。

## 手動爬蟲（不透過 sync）

```bash
npm run scrape          # 完整爬蟲 semester 2
npm run scrape:sem1     # 完整爬蟲 semester 1
npm run import-schools-v2       # 直接匯入（不比對）
npm run import-schools-v2:dry   # dry-run
```
