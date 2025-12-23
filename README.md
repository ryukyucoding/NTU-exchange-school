# [114-1] Web Programming Final

## (Group 21) 湯圓｜臺大交換學校查詢與社群平台

## 🌐 Deployed 連結
https://tang-yuan.vercel.app

## 📹 Demo 影片連結
[在此貼上您的 Demo 影片連結，建議使用 YouTube 或 Google Drive]

---

## 📝 專題描述

我們的網站「湯圓」是 一個整合交換學校查詢＋社群交流平臺的 Web Application。
湯圓大幅改善了臺大的交換學校查詢系統，用視覺化的方式簡化呈現繁雜的交換資料，並且加入多重篩選條件，能夠依據不同學生的需求，快速找出符合你心目中的學校清單。並且整合了四散在各處的資格要求以及心得分享，促進各方討論，也透過完整的社群功能，讓交換學生的資訊更透明。一起來搓湯圓吧！

系統提供兩種主要功能：

### 1. 交換學校查詢系統
- **地圖視圖**：在立體地圖上視覺化顯示所有交換學校位置，支援縮放、標記點擊、彈出視窗顯示學校詳細資訊
- **表格視圖**：以表格形式展示學校詳細資訊，支援多欄位排序、篩選功能
- **資格篩選**：根據年級、GPA、語言能力（TOEFL、IELTS、TOEIC）等條件篩選適合的學校
- **收藏功能**：收藏感興趣的學校，輸入個人想法的備注，並且可以預先調整志願序，作爲後續申請的參考
- **學校詳細資訊**：點擊學校可查看完整的申請資格、名額、語言要求等資訊，並連結到社群討論

### 2. 社群交流平台
- **貼文系統**：支援一般貼文與學校心得貼文兩種類型，學校心得會包含體驗評分指標可以填寫
- **看板功能**：依國家、學校建立看板，學校會歸屬在該國家板，方便使用者討論特定學校或地區
- **Hashtag 系統**：標籤功能，顯示多人提及的熱門話題
- **個人頁面**：個人資料管理、貼文管理、按讚文章列表、收藏文章列表
- **即時通知**：按讚、轉發、收藏、留言，使用 Pusher 實現即時通知功能
- **草稿系統**：支援貼文草稿儲存與編輯


## 🚀 使用/操作方式

### 使用者端

1. **註冊/登入**
   - 點擊右上角「登入」按鈕
   - 使用 Google 帳號進行 OAuth 登入
   - 首次登入會自動建立帳號

2. **查詢交換學校**
   - 進入首頁，可選擇「地圖視圖」或「表格視圖」
   - 使用左側篩選面板設定個人資格條件
   - 系統會自動篩選出符合條件的學校
   - 點擊學校標記或表格中的「資訊」按鈕查看詳細資訊
   - 可將感興趣的學校加入收藏

3. **使用社群功能**
   - 進入「社群」頁面
   - 瀏覽所有貼文或追蹤的看板
   - 點擊「發佈貼文」建立新貼文
   - 支援文字格式化（粗體、大小字、連結、圖片）
   - 可選擇關聯的國家/學校，添加 Hashtag
   - 對貼文進行按讚、轉發、收藏、留言
   - 查看個人頁面管理自己的貼文

4. **看板功能**
   - 瀏覽所有看板（依國家或學校分類）
   - 追蹤感興趣的看板
   - 在特定看板中發文討論


---

## 📌 其他說明

### 技術亮點
- **全端 Next.js 應用**：使用 Next.js 15 App Router，實現 SSR/SSG 優化
- **即時通訊**：整合 Pusher 實現即時通知功能
- **響應式設計**：完整的 RWD 設計，支援手機、平板、桌面裝置
- **型別安全**：全面使用 TypeScript 確保程式碼品質
- **現代化 UI**：使用 Tailwind CSS + Radix UI 構建美觀的使用者介面

### 專案架構

本專案採用現代化的全端架構設計，遵循關注點分離原則，將程式碼組織成清晰的模組結構：

#### 前端架構（Next.js 15 App Router）
```
app/                          # Next.js App Router 頁面結構
├── admin/                    # 管理員頁面
├── api/                      # API 路由處理
│   ├── auth/                # 認證相關 API
│   ├── boards/              # 看板管理 API
│   ├── hashtags/            # Hashtag 管理 API
│   ├── notifications/       # 通知管理 API
│   ├── posts/               # 貼文管理 API
│   ├── schools/             # 學校資料 API
│   ├── upload/              # 檔案上傳 API
│   ├── user/                # 使用者管理 API
│   └── wishlist/            # 收藏清單 API
├── social/                  # 社群功能頁面
├── table/                   # 表格視圖頁面
├── wishlist/                # 收藏清單頁面
└── layout.tsx               # 根佈局組件
```

#### 組件架構（模組化設計）
```
src/components/               # React 組件庫
├── application/             # 學校申請相關組件
├── auth/                    # 認證相關組件
├── filters/                 # 篩選器組件
├── layout/                  # 佈局組件
├── notifications/           # 通知組件
├── onboarding/              # 新手引導組件
├── school-display/          # 學校展示組件
├── social/                  # 社群功能組件
├── ui/                      # 通用 UI 組件
├── views/                   # 視圖組件
└── wishlist/                # 收藏功能組件
```

#### 狀態管理與工具
```
src/
├── contexts/                # React Context 狀態管理
│   ├── FilterContext.tsx    # 篩選條件狀態
│   ├── MapZoomContext.tsx   # 地圖縮放狀態
│   ├── NotificationContext.tsx # 通知狀態
│   ├── SchoolContext.tsx    # 學校資料狀態
│   ├── UserContext.tsx      # 使用者狀態
│   └── WishlistContext.tsx  # 收藏清單狀態
├── hooks/                   # 自訂 React Hooks
│   ├── useBoards.ts         # 看板管理 Hook
│   ├── useFilteredSchools.ts # 學校篩選 Hook
│   ├── usePanelManager.ts   # 面板管理 Hook
│   ├── usePopularTags.ts    # 熱門標籤 Hook
│   ├── usePosts.ts          # 貼文管理 Hook
│   └── usePusher.ts         # Pusher 即時通訊 Hook
├── lib/                     # 工具函數庫
├── types/                   # TypeScript 類型定義
└── utils/                   # 通用工具函數
```

#### 資料處理與工具
```
scraper/                     # Python 資料爬蟲
├── experiences/             # 心得資料爬取
├── fetch_schools.py         # 學校資料爬取
├── get_coordinates.py       # 地理座標查詢
└── requirements.txt         # Python 依賴

scripts/                     # 資料處理腳本
├── import-schools-to-supabase.ts # 學校資料匯入
├── import-to-supabase.ts    # 心得資料匯入
└── data-cleaning/           # 資料清理工具

supabase/                    # 資料庫結構
└── schema.sql               # PostgreSQL 資料庫結構

docs/                        # 專案文檔
├── AUTH_SETUP_CHECKLIST.md
├── DATABASE_AUTH_SETUP.md
├── GOOGLE_OAUTH_SETUP.md
└── ...
```

#### 架構特點
- **模組化設計**：將組件按功能分類，提高程式碼可維護性
- **關注點分離**：API 路由、組件邏輯、狀態管理分離清晰
- **型別安全**：全面使用 TypeScript，提供完整的型別檢查
- **可擴展性**：採用 Context + Hooks 模式，方便功能擴展
- **工具化**：整合爬蟲腳本和資料處理工具，自動化資料維護

### 資料來源
- 學校資料來自台大國際事務處（OIA）官方網站
- 使用 Python 爬蟲自動化收集學校資訊
- 地理座標使用 Geopy 自動查詢

---

## 🛠️ 使用與參考之框架/模組/原始碼

### 核心框架
- **Next.js 15.1.0** - React 全端框架，提供 SSR、API Routes、路由等功能
- **React 19.0.0** - UI 框架
- **TypeScript 5.6.2** - 型別系統

### UI 框架與組件庫
- **Tailwind CSS 4.1.14** - 工具優先的 CSS 框架
- **Radix UI** - 無樣式的可訪問性優先組件庫
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-select`
  - `@radix-ui/react-popover`
  - 等
- **Framer Motion 12.23.24** - 動畫庫
- **Lucide React** - 圖標庫

### 資料庫與後端服務
- **Supabase** - 開源 Firebase 替代方案，提供 PostgreSQL 資料庫、認證、即時訂閱
- **NextAuth.js 5.0.0-beta.30** - 認證框架，整合 Google OAuth

### 地圖功能
- **Mapbox GL JS 2.15.0** - 地圖渲染引擎
- **React Map GL 7.1.7** - React 地圖組件

### 狀態管理
- **Zustand 5.0.8** - 輕量級狀態管理
- **React Context API** - 用於跨組件狀態共享

### 其他工具
- **React Hot Toast 2.6.0** - 通知提示
- **Date-fns 4.1.0** - 日期處理
- **Pusher 5.2.0** - 即時通訊服務
- **Cloudinary** - 圖片上傳與處理服務

### 參考資源
- Next.js 官方文件：https://nextjs.org/docs
- Supabase 文件：https://supabase.com/docs
- Tailwind CSS 文件：https://tailwindcss.com/docs

---

## 📦 使用之第三方套件、框架、程式碼

### 生產依賴
```json
{
  "next": "^15.1.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "~5.6.2",
  "@supabase/supabase-js": "^2.39.0",
  "next-auth": "^5.0.0-beta.30",
  "tailwindcss": "^4.1.14",
  "framer-motion": "^12.23.24",
  "mapbox-gl": "^2.15.0",
  "react-map-gl": "^7.1.7",
  "pusher": "^5.2.0",
  "pusher-js": "^8.4.0",
  "react-hot-toast": "^2.6.0",
  "zustand": "^5.0.8",
  "date-fns": "^4.1.0",
  "lucide-react": "^0.545.0",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-popover": "^1.1.15",
  "recharts": "^3.2.1",
  "canvas-confetti": "^1.9.3"
}
```

### 開發依賴
```json
{
  "eslint": "^9.17.0",
  "eslint-config-next": "^15.1.0",
  "tsx": "^4.7.0",
  "autoprefixer": "^10.4.21",
  "postcss": "^8.5.6"
}
```

### 資料處理工具（Python）
- **Playwright** - 網頁自動化
- **BeautifulSoup** - HTML 解析
- **Pandas** - 資料處理
- **Geopy** - 地理座標查詢

---

## 💭 專題製作心得


---

## 🛠️ 如何在 localhost 安裝與測試之詳細步驟

### 前置需求

1. **Node.js**：版本 18.0 或更高
   ```bash
   node --version  # 確認版本
   ```

2. **npm**：版本 9.0 或更高
   ```bash
   npm --version  # 確認版本
   ```

3. **Supabase 帳號**：前往 [Supabase](https://supabase.com/) 註冊免費帳號

4. **Google Cloud 專案**：用於 OAuth 認證（參考 `docs/GOOGLE_OAUTH_SETUP.md`）

5. **Mapbox Token**（可選）：用於地圖功能（參考 `docs/LOGO_SETUP.md`）

6. **Cloudinary 帳號**（可選）：用於圖片上傳功能（參考 `docs/CLOUDINARY_SETUP.md`）

7. **Pusher 帳號**（可選）：用於即時通知功能（參考 `PUSHER_SETUP_GUIDE.md`）

### 步驟 1：複製專案

```bash
# 如果是在 wp1141 repo
cd wp1141/final-project
# 或直接進入專案目錄
cd NTU-exchange-school
```

### 步驟 2：安裝依賴

```bash
npm install
```

### 步驟 3：設定環境變數

在專案根目錄建立 `.env.local` 檔案：

```bash
# Supabase 設定（必填）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth 設定（必填）
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Google OAuth（必填）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Mapbox（可選，地圖功能需要）
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Cloudinary（可選，圖片上傳需要）
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Pusher（可選，即時通知需要）
NEXT_PUBLIC_PUSHER_APP_KEY=your_pusher_app_key
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster
```

**環境變數取得方式：**

1. **Supabase**：
   - 登入 Supabase Dashboard
   - 進入專案設定 > API
   - 複製 `Project URL` 和 `anon public` key
   - Service Role Key 在 `Project Settings > API > service_role key`

2. **NextAuth Secret**：
   ```bash
   openssl rand -base64 32
   ```

3. **Google OAuth**：參考 `docs/GOOGLE_OAUTH_SETUP.md`

4. **Mapbox**：前往 [Mapbox](https://account.mapbox.com/) 註冊並取得 Token

5. **Cloudinary**：參考 `docs/CLOUDINARY_SETUP.md`

6. **Pusher**：參考 `PUSHER_SETUP_GUIDE.md`

### 步驟 4：設定 Supabase 資料庫

1. **建立 Supabase 專案**
   - 登入 Supabase Dashboard
   - 建立新專案（選擇 Southeast Asia (Singapore) 地區以獲得較低延遲）
   - 等待專案建立完成（約 2-3 分鐘）

2. **執行資料庫 Schema**
   - 進入 Supabase Dashboard > SQL Editor
   - 開啟 `supabase/schema.sql` 檔案
   - 複製全部內容並貼到 SQL Editor
   - 點擊「Run」執行

3. **匯入學校資料**
   ```bash
   # 使用提供的 script 匯入資料
   npm run import-data
   ```
   
   或手動匯入：
   - 進入 Supabase Dashboard > Table Editor
   - 選擇 `schools` 表格
   - 點擊「Insert」> 「Import data from CSV」
   - 選擇 `public/data/school_map.csv`

4. **設定 Row Level Security (RLS)**
   - Schema 中已包含 RLS 政策，確認已正確執行
   - 可在 Supabase Dashboard > Authentication > Policies 檢查

### 步驟 5：設定 Google OAuth

1. 參考 `docs/GOOGLE_OAUTH_SETUP.md` 完整指南

2. **重點步驟**：
   - 在 Google Cloud Console 建立 OAuth 2.0 憑證
   - 設定已授權的 JavaScript 來源：`http://localhost:3000`
   - 設定已授權的重新導向 URI：`http://localhost:3000/api/auth/callback/google`
   - 將 Client ID 和 Client Secret 填入 `.env.local`

### 步驟 6：啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器訪問：http://localhost:3000

### 步驟 7：測試功能

#### 基本功能測試

1. **註冊/登入**
   - 點擊右上角「登入」按鈕
   - 使用 Google 帳號登入
   - 確認成功登入並顯示使用者資訊

2. **查詢學校**
   - 進入首頁
   - 測試地圖視圖和表格視圖切換
   - 使用篩選功能篩選學校
   - 點擊學校查看詳細資訊
   - 測試收藏功能

3. **社群功能**
   - 進入「社群」頁面
   - 建立新貼文（一般貼文和心得貼文）
   - 測試文字格式化功能
   - 測試按讚、轉發、收藏、留言功能
   - 測試 Hashtag 功能
   - 查看個人頁面

4. **看板功能**
   - 瀏覽所有看板
   - 追蹤/取消追蹤看板
   - 在特定看板中發文

系統使用 Google OAuth，請使用任何 Google 帳號登入測試。

### 步驟 8：疑難排解

#### 常見問題

1. **無法連接到 Supabase**
   - 確認 `.env.local` 中的 Supabase URL 和 Key 正確
   - 確認 Supabase 專案狀態為「Active」
   - 檢查網路連線

2. **Google OAuth 登入失敗**
   - 確認 `.env.local` 中的 Google Client ID 和 Secret 正確
   - 確認已設定正確的 Redirect URI
   - 檢查 Google Cloud Console 中的 OAuth 設定

3. **地圖無法顯示**
   - 確認已設定 `NEXT_PUBLIC_MAPBOX_TOKEN`
   - 檢查 Mapbox Token 是否有效

4. **圖片上傳失敗**
   - 確認已設定 Cloudinary 環境變數
   - 檢查 Cloudinary 帳號狀態

5. **即時通知不工作**
   - 確認已設定 Pusher 環境變數
   - 檢查 Pusher Dashboard 中的頻道狀態

#### 清除快取重新安裝

```bash
# 清除 node_modules 和 lock file
rm -rf node_modules package-lock.json

# 重新安裝
npm install

# 清除 Next.js 快取
rm -rf .next

# 重新啟動
npm run dev
```

---

## 👥 每位組員之負責項目

### 組員 1：劉軒羽
- **負責項目**：
  - 地圖視圖開發
  - 學校與申請資料爬蟲
  - 心得資料爬蟲
  - 後端 API 開發
  - 社群通知、pusher

### 組員 2：汪芷瑩
- **負責項目**：
  - 後端 API 開發
  - 資料庫設計
  - 社群發文相關功能
  - 收藏與志願
  - 文字編輯器

### 組員 3：莊孟芸
- **負責項目**：
  - 後端 API 開發
  - 資料庫設計
  - 登入認證系統
  - 社群討論版
  - UI 設計
---

## 💡 對於此課程的建議
- 謝謝 cursor 贊助本學期使用，沒有他不行
- 感覺互評可以觀摩同學的作品很好，但好像還是蠻大一部分是運氣，可能做得很努力但遇到隨手用 AI 生成的隨意評論（和分數），就會覺得有點難過><

---

## 📄 授權

本專案僅供學習和研究使用，請遵守相關網站的使用條款。
