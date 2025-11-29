# 台大 OIA 交換學校資料爬蟲

## 專案說明

本專案用於爬取台大 OIA 網站的交換學校資料，並轉換為標準化的 CSV 格式。

## 安裝依賴

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
```

## 執行步驟

### 1. 爬取資料
```bash
python fetch_schools.py
```
- 爬取 https://oia.ntu.edu.tw/outgoing/school.list 的所有學校資料
- 輸出：`scraper/raw_schools.json`
- 日誌：`scraper/logs/fetch_log.txt`

### 2. 清理與標準化資料
```bash
python clean_data.py
```
- 讀取 `raw_schools.json` 並進行資料清理
- 標準化學院、地區分類
- 查詢地理座標
- 輸出：`hw3/public/data/schools.csv`


## 輸出檔案結構

```
hw4/
├── scraper/
│   ├── fetch_schools.py       # 爬蟲腳本
│   ├── clean_data.py          # 資料清理腳本
│   ├── validate_data.py       # 資料驗證腳本
│   ├── requirements.txt       # Python 依賴
│   ├── raw_schools.json       # 原始爬取資料
│   ├── logs/
│   │   └── fetch_log.txt      # 爬取日誌
│   └── reports/
│       └── data_quality.txt   # 資料品質報告
└── hw3/
    └── public/
        └── data/
            └── schools.csv    # 最終輸出 CSV
```

## CSV 欄位說明

| 欄位 | 說明 | 範例 |
|------|------|------|
| id | 流水號 | 1 |
| name_zh | 中文名稱 | 巴黎政治學院 |
| name_en | 英文名稱 | Sciences Po |
| country | 國家 | 法國 |
| city | 城市 | Paris |
| region | 地區 | 歐洲 |
| latitude | 緯度 | 48.8566 |
| longitude | 經度 | 2.3522 |
| colleges | 簽約學院 (多個用 \| 分隔) | 社會科學院\|法律學院 |
| departments | 簽約系所 (多個用 \| 分隔) | 政治系\|法律系 |
| grade_requirement | 年級限制 | 大三以上 / 大二以上 / 不限 |
| gpa_min | GPA 最低要求 | 3.3 |
| toefl_ibt | TOEFL iBT 分數 | 95 |
| ielts | IELTS 分數 | 7.0 |
| toeic | TOEIC 分數 | 850 |
| other_language | 其他語言要求 | 日檢 N2 |
| quota | 名額 | 2 |
| semesters | 開放學期 (逗號分隔) | Fall,Spring |
| tuition | 學費狀況 | 免學費 / 部分 / 自費 |
| notes | 特殊注意事項 | 需額外申請法語課程 |
| url | 原始頁面 URL | https://oia.ntu.edu.tw/... |

## 注意事項

1. **速率限制**：每次請求間隔 1.5 秒，避免對伺服器造成負擔
2. **地理查詢**：使用 Nominatim API，每次查詢間隔 1 秒
3. **錯誤處理**：包含重試機制和完整的錯誤日誌
4. **進度顯示**：爬取過程會顯示即時進度

## 疑難排解

### Playwright 安裝失敗
```bash
playwright install --with-deps chromium
```

### 地理座標查詢失敗
- 檢查網路連線
- 確認 Nominatim API 可用
- 考慮增加延遲時間

### CSV 檔案路徑錯誤
確認 `hw3/public/data/` 目錄存在：
```bash
mkdir -p ../hw3/public/data
```
