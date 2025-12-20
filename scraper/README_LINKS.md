# 保留連結的爬蟲解決方案

## 問題說明

原本的爬蟲使用 `page.inner_text()` 只抓取純文字，導致：
- 住宿資訊的連結丟失
- 學校年曆的PDF連結丟失
- 注意事項的相關連結丟失
- 學校網址丟失

## 解決方案

### 方案一：結構化提取（推薦）

使用 `fetch_schools_with_links.py` 提取資料：

**優點：**
- 保留所有連結
- 結構化儲存（JSON 格式）
- 可以分別處理文字和連結
- 適合資料庫儲存

**資料格式：**
```json
{
  "id": "123",
  "name_zh": "東京大學",
  "structured_data": {
    "住宿資訊": [
      {
        "text": "宿舍申請表",
        "url": "https://example.com/dorm.pdf"
      }
    ],
    "學校年曆": [
      {
        "text": "2024-2025學年曆",
        "url": "https://example.com/calendar.pdf"
      }
    ]
  }
}
```

### 方案二：內嵌連結格式

在 CSV 中使用特殊格式儲存連結：

**格式：** `文字 [URL]`

**範例：**
```
住宿資訊: "宿舍申請表 [https://example.com/dorm.pdf] | 宿舍介紹 [https://example.com/info.html]"
```

## 使用流程

### 步驟 1: 安裝依賴

```bash
cd scraper
pip install beautifulsoup4
```

### 步驟 2: 執行爬蟲

```bash
python3 fetch_schools_with_links.py
```

這會產生 `raw_schools_with_links.json`

### 步驟 3: 轉換為 CSV

```bash
python process_links_to_csv.py
```

這會產生 `schools_with_links.csv`

### 步驟 4: 檢查資料

查看 CSV 檔案，確認連結都被正確保留：

```bash
head -n 5 schools_with_links.csv
```

## 資料結構

### JSON 格式 (raw_schools_with_links.json)

```json
[
  {
    "id": "123",
    "name_zh": "東京大學",
    "country": "日本",
    "url": "https://oia.ntu.edu.tw/outgoing/view/sn/123",
    "text_content": "完整的頁面文字...",
    "structured_data": {
      "住宿資訊": [
        {"text": "宿舍申請", "url": "https://..."}
      ],
      "學校年曆": [
        {"text": "2024-2025", "url": "https://..."}
      ],
      "注意事項": "文字說明",
      "學校網址": [
        {"text": "官網", "url": "https://..."}
      ]
    }
  }
]
```

### CSV 格式 (schools_with_links.csv)

| 欄位名 | 說明 | 範例 |
|--------|------|------|
| id | 學校ID | 123 |
| name_zh | 中文校名 | 東京大學 |
| country | 國家 | 日本 |
| url | OIA 頁面 | https://oia.ntu.edu.tw/... |
| accommodation_info | 住宿資訊（含連結） | 宿舍申請 [https://...] |
| academic_calendar | 學校年曆（含連結） | 2024-2025 [https://...] |
| notes | 注意事項（含連結） | 說明文字 [https://...] |
| school_website | 學校網址 | 官網 [https://...] |
| text_content | 完整文字 | 完整的頁面文字... |

## 應用程式整合

### 在前端顯示連結

```typescript
// 解析連結格式: "文字 [URL]"
function parseLinks(text: string) {
  const linkRegex = /([^[\]]+)\s*\[([^\]]+)\]/g;
  const links = [];
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    links.push({
      text: match[1].trim(),
      url: match[2].trim()
    });
  }

  return links;
}

// React 元件範例
function AccommodationInfo({ info }: { info: string }) {
  const links = parseLinks(info);

  return (
    <div>
      <h3>住宿資訊</h3>
      {links.map((link, idx) => (
        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer">
          {link.text}
        </a>
      ))}
    </div>
  );
}
```

### 在資料庫中儲存

**選項 1: 使用 JSONB (PostgreSQL/Supabase)**

```sql
CREATE TABLE schools (
  id TEXT PRIMARY KEY,
  name_zh TEXT,
  -- 其他欄位...
  accommodation_links JSONB,  -- [{"text": "...", "url": "..."}]
  calendar_links JSONB,
  note_links JSONB
);
```

**選項 2: 使用文字欄位**

```sql
CREATE TABLE schools (
  id TEXT PRIMARY KEY,
  name_zh TEXT,
  accommodation_info TEXT,  -- "文字1 [URL1] | 文字2 [URL2]"
  academic_calendar TEXT,
  notes TEXT
);
```

## 與現有流程整合

### 更新資料流程

```
舊流程:
爬蟲 (text only) → JSON → LLM 處理 → CSV

新流程:
爬蟲 (text + links) → JSON (含連結) → CSV (保留連結) → 應用程式
                                    ↓
                              LLM 處理其他欄位
```

### 建議的工作流程

1. **爬取資料**
   ```bash
   python fetch_schools_with_links.py
   ```

2. **轉換為 CSV**
   ```bash
   python process_links_to_csv.py
   ```

3. **檢查連結**
   手動檢查幾個學校的連結是否正確

4. **使用 LLM 處理其他欄位**
   對於 GPA、語言要求等，仍使用 LLM 從 text_content 提取

5. **合併資料**
   將連結欄位和 LLM 處理的欄位合併

6. **匯入應用程式**
   更新到 `public/data/schools.csv`

## 欄位處理建議

| 欄位類型 | 處理方式 | 原因 |
|---------|---------|------|
| 住宿資訊 | **爬蟲提取連結** | 通常是 PDF 或外部網站 |
| 學校年曆 | **爬蟲提取連結** | 通常是 PDF 檔案 |
| 注意事項 | **爬蟲提取連結** | 可能包含重要連結 |
| 學校網址 | **爬蟲提取連結** | 直接的 URL |
| GPA 要求 | LLM 提取 | 需要理解和正規化 |
| 語言要求 | LLM 提取 | 需要理解和正規化 |
| 申請組別 | LLM 提取 | 需要分類 |
| 名額 | LLM 提取 | 可能有複雜格式 |

## 常見問題

### Q1: 連結無法正常顯示？
**A:** 檢查是否有相對路徑，確保已補全為完整的 URL。

### Q2: 有些學校沒有連結？
**A:** 這是正常的，不是所有學校都有提供這些資料。在顯示時要做 null 檢查。

### Q3: 連結格式不一致？
**A:** 使用 `format_links()` 函數統一格式化。

### Q4: 如何在前端渲染連結？
**A:** 參考上方的「應用程式整合」範例。

## 下一步

1. ✅ 執行新的爬蟲腳本
2. ✅ 檢查產出的 JSON 和 CSV
3. 📝 修改前端元件以顯示連結
4. 📝 更新 TypeScript 類型定義
5. 📝 更新資料庫 schema（如果使用 Supabase）

## 測試檢查清單

- [ ] 爬蟲成功執行
- [ ] JSON 包含 structured_data 欄位
- [ ] CSV 的連結欄位有內容
- [ ] 連結格式正確（URL 可以點擊）
- [ ] 沒有遺漏重要的連結欄位
- [ ] 相對路徑已轉換為絕對路徑
