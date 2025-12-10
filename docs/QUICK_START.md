# 🚀 Supabase 快速開始

如果你想快速設定 Supabase，請依照以下步驟操作：

## 1️⃣ 安裝依賴套件

```bash
npm install @supabase/supabase-js
npm install -D tsx @types/node
```

## 2️⃣ 建立 Supabase 專案

1. 前往 https://supabase.com/dashboard
2. 建立新專案
3. 選擇地區：**Southeast Asia (Singapore)**
4. 等待 2-3 分鐘

## 3️⃣ 執行 SQL

1. 進入專案 > SQL Editor
2. 複製 `supabase/schema.sql` 的內容
3. 貼上並執行

## 4️⃣ 設定環境變數

```bash
# 複製環境變數範例檔
cp .env.example .env
```

然後編輯 `.env`，填入你的 Supabase 金鑰（可在 Project Settings > API 找到）

## 5️⃣ 匯入資料

```bash
npm run import-data
```

## 6️⃣ 切換到 Supabase

```bash
# 備份原始的 CSV 版本
mv src/contexts/SchoolContext.tsx src/contexts/SchoolContext.csv.tsx

# 使用 Supabase 版本
mv src/contexts/SchoolContext.supabase.tsx src/contexts/SchoolContext.tsx
```

## 7️⃣ 啟動測試

```bash
npm run dev
```

## ✅ 完成！

詳細說明請參考 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
