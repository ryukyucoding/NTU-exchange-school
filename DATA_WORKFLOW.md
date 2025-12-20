# 資料處理流程文件

## 整體流程架構

### 階段一：資料爬取與清洗 (本地處理)
```
爬蟲 (scraper/) → 原始 CSV → 清洗腳本 → 乾淨的 CSV → Git 版本控制
```

### 階段二：應用程式使用 (彈性切換)
```
選項 A (開發): 應用程式直接讀取 CSV
選項 B (生產): CSV → Supabase → 應用程式從 DB 讀取
```

---

## 詳細步驟

### 1. 爬蟲與資料產出
**位置:** `scraper/`
**輸出:** `public/data/schools_raw.csv`

```bash
cd scraper
python your_scraper.py  # 產生原始資料
```

### 2. 資料清洗與驗證
**位置:** `scripts/data-cleaning/`
**輸入:** `public/data/schools_raw.csv`
**輸出:** `public/data/schools.csv` (最終版本)

建議的清洗步驟：
1. 移除重複資料
2. 標準化欄位格式（國家名、地區名）
3. 驗證必填欄位
4. 統一編碼格式
5. 檢查經緯度有效性
6. 產生清洗報告

### 3. 資料驗證腳本
建立自動化驗證：
- 檢查必填欄位是否完整
- 驗證資料格式（GPA、語言成績）
- 檢查異常值
- 統計資料品質指標

### 4. 版本控制
```bash
git add public/data/schools.csv
git commit -m "data: update school data from scraper"
```

### 5. 應用程式資料來源切換

#### 開發模式 (使用 CSV)
**目前狀態** ✅
- 直接從 `public/data/schools.csv` 讀取
- 快速迭代，無需資料庫
- 適合開發和測試

#### 生產模式 (使用 Supabase)
當資料穩定後，執行匯入腳本：
```bash
npm run import-to-supabase
```

然後修改 `SchoolContext.tsx` 使用 Supabase

---

## 目錄結構建議

```
NTU-exchange-school/
├── scraper/                    # 爬蟲程式
│   ├── main.py                # 主要爬蟲腳本
│   ├── requirements.txt       # Python 依賴
│   └── output/                # 原始輸出
│       └── schools_raw.csv    # 未清洗的資料
│
├── scripts/
│   ├── data-cleaning/         # 資料清洗
│   │   ├── clean.py          # 清洗腳本
│   │   ├── validate.py       # 驗證腳本
│   │   └── report.py         # 產生報告
│   │
│   └── import-to-supabase.ts  # 匯入資料庫 (已存在)
│
├── public/data/
│   ├── schools_raw.csv        # 原始資料 (gitignore)
│   └── schools.csv            # 清洗後的資料 (追蹤)
│
└── src/
    └── contexts/
        └── SchoolContext.tsx  # 資料來源邏輯

```

---

## 重新爬蟲的流程

### 定期更新流程
```bash
# 1. 執行爬蟲
cd scraper
python main.py

# 2. 清洗資料
cd ../scripts/data-cleaning
python clean.py

# 3. 驗證資料
python validate.py

# 4. 檢查差異
git diff public/data/schools.csv

# 5. 如果資料正確，提交
git add public/data/schools.csv
git commit -m "data: update schools data $(date +%Y-%m-%d)"

# 6. (可選) 更新到 Supabase
npm run import-to-supabase
```

---

## 資料來源切換機制

### 環境變數控制
在 `.env.local` 加入：
```env
# 資料來源：'csv' 或 'supabase'
NEXT_PUBLIC_DATA_SOURCE=csv
```

### SchoolContext 自動切換
```typescript
const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE || 'csv';

const loadSchools = async () => {
  if (dataSource === 'supabase') {
    return await loadFromSupabase();
  } else {
    return await loadFromCSV();
  }
};
```

---

## 建議的開發流程

### 現在 (開發階段)
1. ✅ 使用 CSV 作為資料來源
2. ✅ 快速開發和測試功能
3. 建立資料清洗腳本
4. 建立資料驗證機制

### 未來 (部署前)
1. 資料穩定後匯入 Supabase
2. 切換到 Supabase 資料源
3. 測試資料庫效能
4. 部署到生產環境

### 長期維護
1. 定期執行爬蟲更新
2. CSV 版本控制追蹤變更
3. 定期同步到 Supabase
4. 監控資料品質

---

## 優點分析

### CSV 為主要資料源 (推薦給你)
✅ 可以輕鬆 diff 和檢視變更
✅ 可以用 Excel/Google Sheets 手動修正
✅ 版本控制友好
✅ 不需要擔心資料庫連線問題
✅ 團隊協作容易

### Supabase 為備選方案
✅ 可擴展性好
✅ 支援複雜查詢
✅ 可以做資料分析
✅ 部署到生產環境時效能更好

---

## 下一步建議

1. **立即執行** - 建立資料清洗腳本
2. **短期目標** - 完善 CSV 資料品質
3. **中期目標** - 建立自動化驗證流程
4. **長期目標** - 部署前切換到 Supabase
