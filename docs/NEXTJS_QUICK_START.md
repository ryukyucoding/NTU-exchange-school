# 🚀 Next.js 快速開始指南

將專案從 Vite 遷移到 Next.js 的最快方法（10 分鐘）

## 📋 前提條件

- ✅ 已安裝 Node.js 18+
- ✅ 已安裝 npm 或 yarn
- ✅ 專案使用 Git 版本控制

---

## ⚡ 快速步驟

### 1️⃣ 備份現有專案（30 秒）

```bash
git checkout -b next js-migration
```

### 2️⃣ 替換設定檔（1 分鐘）

```bash
# Package.json
mv package.json package.vite.backup.json
mv package.next.json package.json

# TypeScript config
mv tsconfig.json tsconfig.vite.backup.json
mv tsconfig.next.json tsconfig.json

# 環境變數
cp .env .env.vite.backup
```

### 3️⃣ 更新環境變數（2 分鐘）

編輯 `.env` 檔案，將所有 `VITE_` 改為 `NEXT_PUBLIC_`：

```bash
# Before
VITE_MAPBOX_TOKEN=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# After
NEXT_PUBLIC_MAPBOX_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

然後複製為 `.env.local`：
```bash
cp .env .env.local
```

### 4️⃣ 更新 SchoolContext（30 秒）

```bash
mv src/contexts/SchoolContext.tsx src/contexts/SchoolContext.vite.backup.tsx
mv src/contexts/SchoolContext.nextjs.tsx src/contexts/SchoolContext.tsx
```

### 5️⃣ 安裝依賴（3 分鐘）

```bash
rm -rf node_modules package-lock.json
npm install
```

### 6️⃣ 啟動開發伺服器（30 秒）

```bash
npm run dev
```

訪問 http://localhost:3000

### 7️⃣ 驗證功能（2 分鐘）

確認以下功能正常：
- [ ] 學校資料載入（244 筆）
- [ ] 搜尋功能
- [ ] 篩選功能
- [ ] 地圖顯示
- [ ] 無控制台錯誤

---

## 🎉 完成！

你的專案已成功遷移到 Next.js！

### 下一步

- 📚 閱讀完整的 [NEXTJS_MIGRATION_GUIDE.md](./NEXTJS_MIGRATION_GUIDE.md)
- 🚀 部署到 Vercel（下一節）
- 📊 優化效能

---

## 🌐 部署到 Vercel（5 分鐘）

### 步驟 1：推送到 GitHub

```bash
git add .
git commit -m "Migrate to Next.js"
git push origin nextjs-migration
```

### 步驟 2：連接 Vercel

1. 訪問 [vercel.com](https://vercel.com)
2. 點選「Import Project」
3. 選擇你的 GitHub repository
4. Vercel 會自動檢測到 Next.js

### 步驟 3：設定環境變數

在 Vercel Dashboard → Settings → Environment Variables 新增：

```
NEXT_PUBLIC_MAPBOX_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 步驟 4：部署

點選「Deploy」，等待 1-2 分鐘即可完成！

---

## 🐛 常見問題

### Q: 環境變數不起作用？
A: 確認變數名稱有 `NEXT_PUBLIC_` 前綴，並重新啟動開發伺服器。

### Q: 找不到模組錯誤？
A: 執行 `rm -rf .next && npm run dev` 清除快取。

### Q: 樣式未載入？
A: 確認 `src/styles/globals.css` 存在，並檢查 `app/layout.tsx` 有匯入。

### Q: Supabase 連線失敗？
A: 檢查 `.env.local` 的 Supabase URL 和金鑰是否正確。

---

## 📚 更多資源

- [完整遷移指南](./NEXTJS_MIGRATION_GUIDE.md) - 詳細說明
- [Next.js 文件](https://nextjs.org/docs) - 官方文件
- [Vercel 部署指南](https://vercel.com/docs) - 部署詳情

---

## 🆘 需要幫助？

遇到問題請查看：
1. [NEXTJS_MIGRATION_GUIDE.md](./NEXTJS_MIGRATION_GUIDE.md) 的故障排除章節
2. [Next.js Discord](https://discord.gg/nextjs)
3. [GitHub Issues](https://github.com/vercel/next.js/issues)

---

**祝你遷移順利！** 🎊
