# 🔧 快速修復指南

PostCSS 配置已修復！現在只需要完成以下步驟：

## ✅ 已完成
- [x] PostCSS 配置已改為 CommonJS 格式
- [x] SchoolContext 已更新為使用 `supabase.client`
- [x] `.env.local` 已建立並更新變數名稱

## 🔧 需要你手動完成的步驟

### 1. 更新 Supabase 環境變數

編輯 `.env.local`，填入你的 Supabase 資訊：

```bash
# 目前是範例值，需要替換成你的實際值
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co  # ← 改這裡
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key                # ← 改這裡
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key            # ← 改這裡
```

**如果你還沒設定 Supabase，可以先註解掉這些行，使用 CSV 資料：**

```bash
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

然後修改 `src/contexts/SchoolContext.tsx`，暫時改回使用 CSV：

```typescript
// 暫時註解掉 Supabase
// import { supabase } from '@/lib/supabase.client';

// 改用 CSV
import { loadSchools } from '@/utils/csv';
```

### 2. 重新啟動開發伺服器

停止目前的伺服器（Ctrl+C），然後重新啟動：

```bash
npm run dev
```

### 3. 訪問應用

開啟瀏覽器：http://localhost:3000

---

## 🐛 如果還有錯誤

### 錯誤：Supabase URL 未定義

**原因：** Supabase 環境變數未設定

**解決方案 A（推薦）：** 暫時使用 CSV 資料

1. 編輯 `src/contexts/SchoolContext.tsx`
2. 找到第 3-4 行：
   ```typescript
   import { School } from '@/types/school';
   import { supabase } from '@/lib/supabase.client';
   ```
3. 改為：
   ```typescript
   import { School } from '@/types/school';
   import { loadSchools } from '@/utils/csv';
   ```
4. 找到 `reloadSchools` 函數（約第 106 行）
5. 改為：
   ```typescript
   const reloadSchools = async () => {
     setLoading(true);
     setError(null);
     try {
       const data = await loadSchools();
       setSchools(data);
     } catch (err) {
       console.error('載入學校資料失敗:', err);
       setError(err as Error);
     } finally {
       setLoading(false);
     }
   };
   ```

**解決方案 B：** 設定 Supabase（參考 SUPABASE_SETUP.md）

### 錯誤：找不到模組

```bash
rm -rf .next
npm run dev
```

### 錯誤：樣式未載入

確認 `src/styles/globals.css` 存在，然後：

```bash
rm -rf .next
npm run dev
```

---

## 📊 完成後的結構

```
專案現在是 Next.js 架構：

✅ Next.js 15
✅ React 19
✅ TypeScript
✅ Tailwind CSS
✅ Supabase（可選）
✅ App Router

開發伺服器：http://localhost:3000
```

---

## 🎉 成功標誌

如果看到以下內容，表示成功：

```
   ▲ Next.js 15.5.7
   - Local:        http://localhost:3000

 ✓ Ready in X.Xs
 ○ Compiling / ...
 ✓ Compiled / in XXXms
```

然後瀏覽器可以正常打開網站並顯示學校資料。

---

## 🆘 還有問題？

1. 確認 Node.js 版本 >= 18
2. 確認已執行 `npm install`
3. 確認 `.env.local` 存在
4. 清除快取：`rm -rf .next`
5. 查看瀏覽器控制台（F12）的錯誤訊息

---

**重新啟動伺服器後應該就可以正常運作了！** 🚀
