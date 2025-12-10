# ✅ Supabase 安裝檢查清單

按照以下順序完成每個步驟，確保 Supabase 整合成功。

---

## 階段 1：準備工作 (5 分鐘)

### ☐ 1.1 註冊 Supabase 帳號
- [ ] 前往 https://supabase.com
- [ ] 註冊帳號（可使用 GitHub 快速登入）
- [ ] 驗證電子郵件

### ☐ 1.2 建立專案
- [ ] 點選「New Project」
- [ ] 專案名稱：`ntu-exchange-school`（或自訂）
- [ ] 資料庫密碼：設定並**記下來**
- [ ] 地區：選擇 **Southeast Asia (Singapore)**
- [ ] 等待 2-3 分鐘直到專案建立完成

---

## 階段 2：資料庫設定 (3 分鐘)

### ☐ 2.1 執行 SQL 腳本
- [ ] 進入 Supabase Dashboard
- [ ] 點選左側選單「SQL Editor」
- [ ] 點選「New Query」
- [ ] 開啟本地檔案 `supabase/schema.sql`
- [ ] 複製全部內容
- [ ] 貼到 Supabase SQL Editor
- [ ] 點選「Run」執行
- [ ] 確認沒有錯誤訊息

### ☐ 2.2 驗證資料表
- [ ] 點選左側選單「Table Editor」
- [ ] 確認看到 `schools` 資料表
- [ ] 目前應該是空的（0 rows）

---

## 階段 3：取得 API 金鑰 (2 分鐘)

### ☐ 3.1 找到金鑰
- [ ] 點選左側選單「Project Settings」（齒輪圖示）
- [ ] 點選「API」
- [ ] 找到「Project URL」
- [ ] 找到「anon public」金鑰
- [ ] 找到「service_role」金鑰（需要點選「Reveal」）

### ☐ 3.2 複製金鑰
```
Project URL: https://xxxxx.supabase.co
anon key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**⚠️ 重要：service_role key 是敏感資訊，不要分享給他人！**

---

## 階段 4：本地設定 (5 分鐘)

### ☐ 4.1 安裝依賴套件
在專案目錄執行：
```bash
npm install @supabase/supabase-js
npm install -D tsx @types/node
```

- [ ] 執行安裝指令
- [ ] 確認安裝成功（沒有錯誤）
- [ ] 檢查 `package.json` 已新增依賴

### ☐ 4.2 設定環境變數
```bash
cp .env.example .env
```

- [ ] 複製 `.env.example` 為 `.env`
- [ ] 開啟 `.env` 檔案
- [ ] 填入 `VITE_SUPABASE_URL`（Project URL）
- [ ] 填入 `VITE_SUPABASE_ANON_KEY`（anon public key）
- [ ] 填入 `SUPABASE_SERVICE_ROLE_KEY`（service_role key）
- [ ] 儲存檔案

範例：
```env
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieXV1dXV1dXV1dXUiLCJhIjoiY21nbmxmdnJlMHV3djJpcjVjMnM4d3Q1aiJ9._yqd6BliWVZ9watWky3-gg

VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MzI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYzMi...
```

### ☐ 4.3 確認 .gitignore
- [ ] 開啟 `.gitignore`
- [ ] 確認包含 `.env`
- [ ] 如果沒有，加入這行：`.env`

---

## 階段 5：測試連線 (2 分鐘)

### ☐ 5.1 執行測試腳本
```bash
npm run test-db
```

**預期輸出：**
```
🔍 測試 Supabase 連線...

URL: https://xxxxx.supabase.co
Anon Key: eyJhbGciOiJIUzI1Ni...

📊 測試 1: 查詢資料表筆數...
✅ 成功！資料庫中有 0 筆學校資料

📋 測試 2: 查詢前 5 筆資料...
✅ 成功！前 5 筆資料：
   （目前是空的）

==================================================
🎉 所有測試通過！Supabase 連線正常
==================================================
```

- [ ] 執行測試指令
- [ ] 確認所有測試通過
- [ ] 如果失敗，檢查環境變數是否正確

---

## 階段 6：匯入資料 (3 分鐘)

### ☐ 6.1 執行匯入腳本
```bash
npm run import-data
```

**預期輸出：**
```
🚀 開始匯入資料到 Supabase...

📊 共讀取 244 筆學校資料

🗑️  清空現有資料...
✅ 已清空現有資料

📤 匯入第 1 - 100 筆...
✅ 成功匯入 100 筆
📤 匯入第 101 - 200 筆...
✅ 成功匯入 100 筆
📤 匯入第 201 - 244 筆...
✅ 成功匯入 44 筆

==================================================
✅ 匯入完成！
   成功：244 筆
   失敗：0 筆
==================================================

🔍 驗證資料...
✅ 資料庫中共有 244 筆學校資料
```

- [ ] 執行匯入指令
- [ ] 確認成功匯入 244 筆資料
- [ ] 如果失敗，檢查 CSV 檔案路徑是否正確

### ☐ 6.2 驗證資料
- [ ] 回到 Supabase Dashboard
- [ ] 點選「Table Editor」
- [ ] 選擇 `schools` 資料表
- [ ] 確認有 244 筆資料
- [ ] 隨機查看幾筆資料是否正確

---

## 階段 7：前端整合 (3 分鐘)

### ☐ 7.1 備份原始檔案
```bash
# 備份 CSV 版本
mv src/contexts/SchoolContext.tsx src/contexts/SchoolContext.csv.tsx
```

- [ ] 執行備份指令
- [ ] 確認 `SchoolContext.csv.tsx` 已建立

### ☐ 7.2 啟用 Supabase 版本
```bash
# 使用 Supabase 版本
mv src/contexts/SchoolContext.supabase.tsx src/contexts/SchoolContext.tsx
```

- [ ] 執行切換指令
- [ ] 確認 `SchoolContext.tsx` 已更新

---

## 階段 8：測試應用 (5 分鐘)

### ☐ 8.1 啟動開發伺服器
```bash
npm run dev
```

- [ ] 執行開發指令
- [ ] 等待編譯完成
- [ ] 開啟瀏覽器訪問 http://localhost:5173

### ☐ 8.2 功能測試
- [ ] ✅ 學校資料正常載入（可看到 244 所學校）
- [ ] ✅ 搜尋功能正常（試著搜尋「日本」）
- [ ] ✅ 篩選功能正常（試著選擇國家）
- [ ] ✅ 地圖顯示正常（學校標記出現在地圖上）
- [ ] ✅ 詳細資訊正常（點選學校查看詳細資訊）
- [ ] ✅ 沒有控制台錯誤（按 F12 檢查）

### ☐ 8.3 效能測試
- [ ] 資料載入速度合理（< 2 秒）
- [ ] 搜尋回應速度快（< 500ms）
- [ ] 無明顯卡頓現象

---

## 🎉 完成！

恭喜你成功整合 Supabase！

### 下一步建議

#### 立即可做
- [ ] 將程式碼提交到 Git（記得 .env 已在 .gitignore）
- [ ] 測試部署到 Vercel/Netlify
- [ ] 分享給團隊成員

#### 未來可擴充
- [ ] 加入使用者認證系統
- [ ] 實作收藏/心願單功能
- [ ] 加入評論/評分功能
- [ ] 建立管理後台
- [ ] 加入即時更新功能

---

## ⚠️ 常見問題

### 問題 1：測試連線失敗
**可能原因：**
- 環境變數設定錯誤
- URL 或金鑰有誤
- 專案尚未建立完成

**解決方法：**
1. 檢查 `.env` 檔案內容
2. 確認已複製完整的 URL 和金鑰
3. 重新啟動終端機
4. 確認 Supabase 專案狀態正常

### 問題 2：匯入資料失敗
**可能原因：**
- CSV 檔案路徑錯誤
- Service Role Key 錯誤
- 資料表未建立

**解決方法：**
1. 確認 `public/data/school_map.csv` 存在
2. 檢查 `SUPABASE_SERVICE_ROLE_KEY` 是否正確
3. 重新執行 `supabase/schema.sql`

### 問題 3：前端載入失敗
**可能原因：**
- 環境變數未以 `VITE_` 開頭
- 未重新啟動開發伺服器
- SchoolContext 未切換

**解決方法：**
1. 確認環境變數名稱正確
2. 停止並重新啟動 `npm run dev`
3. 檢查是否已切換到 Supabase 版本

---

## 📚 參考資源

- [快速開始指南](docs/QUICK_START.md) - 5 分鐘精簡版
- [詳細設定指南](docs/SUPABASE_SETUP.md) - 完整教學
- [遷移指南](SUPABASE_MIGRATION.md) - 技術細節
- [總覽文件](SUPABASE_README.md) - 快速參考

---

## ✅ 最終檢查

在標記為完成前，請確認：

- [ ] ✅ Supabase 專案已建立且運作正常
- [ ] ✅ 資料表已建立（執行了 schema.sql）
- [ ] ✅ 資料已匯入（244 筆學校）
- [ ] ✅ 環境變數已正確設定
- [ ] ✅ 測試腳本全部通過
- [ ] ✅ 前端應用正常運作
- [ ] ✅ 所有功能測試通過
- [ ] ✅ .env 已加入 .gitignore
- [ ] ✅ 原始 CSV 版本已備份
- [ ] ✅ 程式碼已提交到 Git

**全部完成？🎊 恭喜你！**

你的 NTU Exchange School 專案現在使用 Supabase 資料庫了！
