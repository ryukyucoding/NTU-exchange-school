# ✅ Next.js 遷移檢查清單

使用本檢查清單確保成功遷移到 Next.js。

---

## 📦 準備階段

### ☐ 備份

- [ ] 建立 Git 分支：`git checkout -b nextjs-migration`
- [ ] 備份現有 `.env` 檔案
- [ ] 確認所有變更已提交

### ☐ 確認環境

- [ ] Node.js 版本 >= 18.17
- [ ] npm 版本 >= 9.0
- [ ] Git 已安裝並配置

---

## 🔧 設定檔案更新

### ☐ Package.json

- [ ] 備份現有：`mv package.json package.vite.backup.json`
- [ ] 使用新版本：`mv package.next.json package.json`
- [ ] 確認包含所有必要依賴：
  - [ ] `next@latest`
  - [ ] `react@latest`
  - [ ] `react-dom@latest`
  - [ ] `@supabase/supabase-js`

### ☐ TypeScript 設定

- [ ] 備份現有：`mv tsconfig.json tsconfig.vite.backup.json`
- [ ] 使用新版本：`mv tsconfig.next.json tsconfig.json`
- [ ] 確認 `paths` 設定正確：
  ```json
  {
    "@/*": ["./src/*"]
  }
  ```

### ☐ Next.js 設定

- [ ] 確認 `next.config.js` 存在
- [ ] 檢查環境變數配置
- [ ] 確認 webpack 設定（如需要）

---

## 🌍 環境變數

### ☐ 更新變數名稱

**必須更改：**
- [ ] `VITE_MAPBOX_TOKEN` → `NEXT_PUBLIC_MAPBOX_TOKEN`
- [ ] `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**保持不變：**
- [ ] `SUPABASE_SERVICE_ROLE_KEY`（僅伺服器端使用）

### ☐ 建立 .env.local

```bash
cp .env .env.local
# 編輯 .env.local，更新所有變數名稱
```

- [ ] 所有公開變數使用 `NEXT_PUBLIC_` 前綴
- [ ] 確認 `.env.local` 在 `.gitignore` 中

---

## 📁 檔案結構

### ☐ 新增 app 目錄

- [ ] 建立 `app/layout.tsx`
- [ ] 建立 `app/page.tsx`
- [ ] 建立 `app/providers.tsx`

### ☐ 更新 Supabase 設定

- [ ] 建立 `src/lib/supabase.client.ts`
- [ ] 建立 `src/lib/supabase.server.ts`
- [ ] 備份原有：`src/lib/supabase.ts` → `src/lib/supabase.vite.backup.ts`

### ☐ 更新 SchoolContext

- [ ] 備份原有：`src/contexts/SchoolContext.tsx` → `src/contexts/SchoolContext.vite.backup.tsx`
- [ ] 使用新版本：`src/contexts/SchoolContext.nextjs.tsx` → `src/contexts/SchoolContext.tsx`
- [ ] 確認匯入路徑使用 `@/lib/supabase.client`

### ☐ 樣式檔案

- [ ] 確認 `src/styles/globals.css` 存在
- [ ] 檢查 `app/layout.tsx` 有匯入全域樣式
- [ ] 確認 Tailwind CSS 配置正確

---

## 📦 安裝依賴

### ☐ 清除舊依賴

```bash
rm -rf node_modules package-lock.json
```

### ☐ 安裝新依賴

```bash
npm install
```

**預期結果：**
- [ ] 安裝成功，無錯誤
- [ ] `node_modules/next` 存在
- [ ] `package-lock.json` 已生成

---

## 🚀 啟動測試

### ☐ 開發模式

```bash
npm run dev
```

**檢查項目：**
- [ ] 伺服器在 http://localhost:3000 啟動
- [ ] 無編譯錯誤
- [ ] Hot Reload 正常運作

### ☐ 功能測試

- [ ] **資料載入**
  - [ ] 學校資料成功載入
  - [ ] 共 244 筆資料
  - [ ] 資料格式正確

- [ ] **搜尋功能**
  - [ ] 可以搜尋學校名稱
  - [ ] 搜尋結果正確
  - [ ] 即時更新結果數量

- [ ] **篩選功能**
  - [ ] 可以按國家篩選
  - [ ] 可以按地區篩選
  - [ ] 可以按 GPA 篩選
  - [ ] 可以按語言要求篩選
  - [ ] 多重篩選正常運作

- [ ] **地圖顯示**
  - [ ] 地圖正常載入
  - [ ] 學校標記顯示正確
  - [ ] 點擊標記顯示詳細資訊
  - [ ] 地圖縮放和拖曳正常

- [ ] **表格顯示**
  - [ ] 切換到表格模式
  - [ ] 資料正確顯示
  - [ ] 排序功能正常
  - [ ] 分頁功能正常

- [ ] **收藏功能**
  - [ ] 可以收藏學校
  - [ ] 收藏清單顯示正確
  - [ ] 可以移除收藏
  - [ ] 收藏狀態持久化

- [ ] **使用者資格**
  - [ ] 可以設定 GPA
  - [ ] 可以設定語言成績
  - [ ] 自動篩選符合資格的學校

### ☐ 錯誤檢查

開啟瀏覽器開發者工具（F12）：

- [ ] **Console 標籤**
  - [ ] 無紅色錯誤訊息
  - [ ] 無 Hydration 警告
  - [ ] 無環境變數未定義錯誤

- [ ] **Network 標籤**
  - [ ] Supabase API 請求成功（狀態碼 200）
  - [ ] Mapbox API 請求成功
  - [ ] 無 404 錯誤

- [ ] **Performance**
  - [ ] 首次載入 < 3 秒
  - [ ] 互動延遲 < 100ms

---

## 🏗️ 建置測試

### ☐ 生產建置

```bash
npm run build
```

**檢查項目：**
- [ ] 建置成功，無錯誤
- [ ] `.next` 目錄已生成
- [ ] 建置時間合理（< 30 秒）

**預期輸出：**
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

### ☐ 預覽生產版本

```bash
npm run start
```

**檢查項目：**
- [ ] 伺服器成功啟動
- [ ] 所有功能正常運作
- [ ] 效能符合預期

---

## 🌐 部署準備

### ☐ Git 提交

```bash
git add .
git commit -m "Migrate to Next.js"
git push origin nextjs-migration
```

- [ ] 所有變更已提交
- [ ] `.env.local` **未**提交
- [ ] 備份檔案（*.backup.*）**未**提交

### ☐ Vercel 設定（如使用）

- [ ] 連接 GitHub repository
- [ ] 設定環境變數：
  - [ ] `NEXT_PUBLIC_MAPBOX_TOKEN`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

- [ ] 建置設定：
  - [ ] Framework Preset: Next.js
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `.next`

### ☐ 首次部署測試

- [ ] 部署成功
- [ ] 生產網址可訪問
- [ ] 所有功能正常
- [ ] HTTPS 證書已配置

---

## 📊 效能驗證

### ☐ Lighthouse 測試

在 Chrome 開發者工具執行 Lighthouse：

- [ ] Performance >= 90
- [ ] Accessibility >= 95
- [ ] Best Practices >= 95
- [ ] SEO >= 90

### ☐ 載入速度

- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.0s
- [ ] Largest Contentful Paint < 2.5s

---

## 🧹 清理工作

### ☐ 移除 Vite 相關檔案（可選）

**僅在確認一切正常後執行：**

```bash
# 備份檔案
rm package.vite.backup.json
rm tsconfig.vite.backup.json
rm .env.vite.backup
rm src/lib/supabase.vite.backup.ts
rm src/contexts/SchoolContext.vite.backup.tsx

# Vite 設定檔
rm vite.config.ts
rm index.html
rm src/main.tsx
rm src/App.tsx
```

- [ ] 確認刪除前已建立完整備份
- [ ] 測試移除後專案仍正常運作

---

## 📝 文件更新

### ☐ README.md

- [ ] 更新安裝指令（`npm install`）
- [ ] 更新開發指令（`npm run dev`）
- [ ] 更新建置指令（`npm run build`）
- [ ] 更新環境變數說明

### ☐ 其他文件

- [ ] 更新 API 文件（如有）
- [ ] 更新貢獻指南（如有）
- [ ] 更新部署文件

---

## 🎉 完成確認

### ☐ 最終檢查

- [ ] 本機開發正常（`npm run dev`）
- [ ] 生產建置成功（`npm run build`）
- [ ] 生產預覽正常（`npm run start`）
- [ ] 已部署到生產環境
- [ ] 生產環境所有功能正常
- [ ] 團隊成員已通知
- [ ] 文件已更新

### ☐ 合併到主分支

```bash
git checkout main
git merge nextjs-migration
git push origin main
```

---

## 🆘 遇到問題？

如果任何檢查項目失敗：

1. **查看錯誤訊息** - 瀏覽器控制台和終端機
2. **查閱故障排除** - [NEXTJS_MIGRATION_GUIDE.md](./NEXTJS_MIGRATION_GUIDE.md#故障排除)
3. **檢查環境變數** - 最常見的問題來源
4. **清除快取** - `rm -rf .next && npm run dev`
5. **重新安裝** - `rm -rf node_modules && npm install`

---

## 📚 參考資源

- [完整遷移指南](./NEXTJS_MIGRATION_GUIDE.md)
- [快速開始指南](./NEXTJS_QUICK_START.md)
- [Next.js 官方文件](https://nextjs.org/docs)
- [Vercel 部署指南](https://vercel.com/docs)

---

**全部完成？🎊 恭喜你成功遷移到 Next.js！**
