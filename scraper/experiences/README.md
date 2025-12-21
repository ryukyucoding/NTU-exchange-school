# NTU Exchange Student Experiences Scraper

這個爬蟲用於抓取台大國際事務處的交換學生心得資料。

## 功能

從 https://oia.ntu.edu.tw/students/outgoing.students.experience.do/ 爬取：

- 交換年度（113, 112, 111）
- 國家
- 交換學校
- 學院
- 系所
- 學位
- 學生姓名
- 心得 PDF 連結（可能多個）
- 照片連結

## 使用方式

1. 確保已安裝必要的套件：
```bash
cd /Users/yu/Desktop/大三/網服/NTU-exchange-school/scraper
source venv/bin/activate  # 啟動虛擬環境
pip install -r requirements.txt
```

2. 如果尚未安裝 Playwright 瀏覽器，執行：
```bash
playwright install chromium
```

3. 執行爬蟲：
```bash
cd experiences
python fetch_experiences.py
```

## 輸出

爬蟲會產生 `experiences_data.json` 檔案，格式如下：

```json
[
  {
    "year": "113",
    "country": "美國",
    "school": "University of California, Berkeley",
    "college": "工學院",
    "department": "資訊工程學系",
    "degree": "學士",
    "name": "王小明",
    "detail_url": "https://oia.ntu.edu.tw/...",
    "pdf_links": [
      {
        "url": "https://oia.ntu.edu.tw/.../report.pdf",
        "text": "心得報告"
      }
    ],
    "image_links": [
      {
        "url": "https://oia.ntu.edu.tw/.../photo1.jpg",
        "alt": "校園照片"
      }
    ]
  }
]
```

## 設定

可以在 `fetch_experiences.py` 中修改以下參數：

- `YEARS`: 要爬取的年度列表（預設: ["113", "112", "111"]）
- `DELAY_BETWEEN_REQUESTS`: 請求之間的延遲時間（秒，預設: 1）

## 注意事項

- 爬蟲使用 Playwright 來處理 JavaScript 渲染的頁面
- 預設使用無頭模式（headless）執行
- 包含適當的延遲以避免對伺服器造成過大負擔
- 所有錯誤都會記錄在 console 中







完成！我已經幫你建立了圖片上傳腳本。以下是完整的使用流程：
📝 使用步驟
1️⃣ 在 Supabase 建立 Storage Bucket
-- 在 Supabase Dashboard 建立一個 public bucket
-- 名稱: experience-images
-- Public access: 啟用
2️⃣ 安裝 Supabase SDK
cd scraper
source venv/bin/activate
pip install supabase
3️⃣ 設定環境變數
# 方式 1: 使用 service_role key（推薦，有完整權限）
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 方式 2: 使用 anon key（需要設定 Storage bucket 的 RLS policy）
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

4️⃣ 執行上傳腳本
cd experiences
python upload_to_supabase.py

⚠️ 如果遇到 403 錯誤（RLS policy violation）：
- 方案 A: 使用 service_role key（推薦）
- 方案 B: 在 Supabase Dashboard 中修改 Storage bucket 的 RLS policy，允許匿名上傳

腳本會做什麼
讀取所有 content.json 中的圖片資訊
上傳圖片到 Supabase Storage：
路徑格式：{student_id}/{filename}
例如：12894/001.jpg
獲取公開 URL：
例如：https://xxx.supabase.co/storage/v1/object/public/experience-images/12894/001.jpg
更新 content.json：將 url: null 更新為實際的 Supabase URL
📦 最終的資料格式
執行後，你的 content.json 會變成：
{
  "student_info": {...},
  "markdown": "文字...\n\n![12894_002_jpg]\n\n文字...",
  "images": [
    {
      "id": "12894_001_jpg",
      "filename": "001.jpg",
      "local_path": "12894/images/001.jpg",
      "url": "https://xxx.supabase.co/storage/v1/object/public/experience-images/12894/001.jpg",
      "format": "jpg"
    }
  ]
}
💾 匯入資料庫時
你可以直接用這些資料：
markdown 欄位存到 experiences.content
images 陣列的每個項目存到 images 表
前端渲染時，將 ![{image_id}] 替換成 <img src="{url}">
這樣就能快速產生可外部瀏覽的圖片 URL 了！

