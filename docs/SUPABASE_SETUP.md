# Supabase 設定指南

本指南將協助你設定 Supabase 資料庫並將現有的 CSV 資料匯入。

## 📋 前置作業

1. 註冊 [Supabase](https://supabase.com/) 帳號（免費方案即可）
2. 建立一個新專案

## 🔧 步驟 1：建立 Supabase 專案

1. 登入 Supabase Dashboard
2. 點選「New Project」
3. 輸入專案名稱（例如：`ntu-exchange-school`）
4. 設定資料庫密碼（請妥善保存）
5. 選擇地區（建議選擇 `Southeast Asia (Singapore)` 以獲得較低延遲）
6. 等待專案建立完成（約 2-3 分鐘）

## 📊 步驟 2：建立資料表結構

1. 進入專案後，點選左側選單的「SQL Editor」
2. 點選「New Query」
3. 複製 `supabase/schema.sql` 的內容並貼上
4. 點選「Run」執行 SQL

這會建立：
- `schools` 資料表
- 搜尋索引
- Row Level Security (RLS) 政策
- 全文搜尋函數

## 🔑 步驟 3：取得 API 金鑰

1. 點選左側選單的「Project Settings」（齒輪圖示）
2. 點選「API」
3. 你會看到兩個金鑰：
   - **anon public**：用於前端（公開安全）
   - **service_role**：用於資料匯入（保密）

## 🌐 步驟 4：設定環境變數

1. 複製 `.env.example` 為 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 填入你的 Supabase 資訊：
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **重要**：確保 `.env` 已加入 `.gitignore`！

## 📦 步驟 5：安裝依賴套件

```bash
npm install @supabase/supabase-js
npm install -D tsx  # 用於執行 TypeScript 腳本
```

## 📤 步驟 6：匯入資料

執行匯入腳本：

```bash
npm run import-data
```

或直接執行：

```bash
npx tsx scripts/import-to-supabase.ts
```

你應該會看到類似以下的輸出：

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

## 🔄 步驟 7：切換前端使用 Supabase

目前有兩個版本的 `SchoolContext`：

1. **原始版本**（使用 CSV）：`src/contexts/SchoolContext.tsx`
2. **Supabase 版本**：`src/contexts/SchoolContext.supabase.tsx`

要切換到 Supabase 版本：

```bash
# 備份原始版本
mv src/contexts/SchoolContext.tsx src/contexts/SchoolContext.csv.tsx

# 使用 Supabase 版本
mv src/contexts/SchoolContext.supabase.tsx src/contexts/SchoolContext.tsx
```

或者直接編輯 `src/contexts/SchoolContext.tsx`，參考 `.supabase.tsx` 的內容。

## ✅ 步驟 8：測試

啟動開發伺服器並測試：

```bash
npm run dev
```

檢查：
- 學校資料是否正常載入
- 篩選功能是否正常運作
- 搜尋功能是否正常運作

## 🔍 常見問題

### Q: 為什麼需要 Service Role Key？

A: 匯入腳本需要繞過 RLS (Row Level Security) 政策來批次寫入資料。Service Role Key 具有完整權限，因此**千萬不要**把它提交到 Git 或暴露在前端！

### Q: RLS 政策是什麼？

A: Row Level Security 是 PostgreSQL 的安全功能。我們的設定：
- 所有人都可以**讀取**學校資料
- 只有認證使用者可以**新增/更新**資料

### Q: 如何驗證資料是否正確匯入？

1. 進入 Supabase Dashboard
2. 點選「Table Editor」
3. 選擇 `schools` 資料表
4. 查看資料內容

### Q: 匯入失敗怎麼辦？

檢查以下項目：
1. 環境變數是否正確設定
2. CSV 檔案路徑是否正確
3. Supabase 專案是否正常運作
4. 資料表是否已建立

可以查看錯誤訊息來診斷問題。

## 🚀 進階功能

### 全文搜尋

使用我們建立的搜尋函數：

```typescript
const { data } = await supabase.rpc('search_schools', {
  search_query: '日本'
});
```

### 即時訂閱（未來功能）

Supabase 支援即時資料更新：

```typescript
supabase
  .channel('schools-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'schools' },
    (payload) => {
      console.log('資料變更:', payload);
    }
  )
  .subscribe();
```

## 📚 更多資源

- [Supabase 官方文件](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🎉 完成！

現在你的應用已經連接到 Supabase 資料庫了！你可以：
- ✅ 從雲端載入資料
- ✅ 使用強大的查詢功能
- ✅ 未來可輕鬆擴充功能（使用者認證、評論、收藏等）
