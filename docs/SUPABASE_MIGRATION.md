# 🗄️ Supabase 資料庫遷移指南

本專案已準備好遷移到 Supabase 資料庫！以下是所有相關檔案和步驟。

## 📁 新增的檔案

```
專案根目錄/
├── supabase/
│   └── schema.sql                         # 資料表結構定義
├── scripts/
│   └── import-to-supabase.ts             # 資料匯入腳本
├── src/
│   ├── lib/
│   │   └── supabase.ts                   # Supabase 客戶端設定
│   ├── types/
│   │   └── supabase.ts                   # Supabase 資料庫型別定義
│   └── contexts/
│       └── SchoolContext.supabase.tsx    # 使用 Supabase 的 Context
├── docs/
│   ├── SUPABASE_SETUP.md                 # 詳細設定指南
│   └── QUICK_START.md                    # 快速開始指南
├── .env.example                          # 環境變數範例（已更新）
└── package.json                          # 新增 import-data 腳本
```

## 🎯 主要功能

### 1. 資料表結構 (`supabase/schema.sql`)

- ✅ 完整的學校資料表定義
- ✅ 效能索引（國家、名稱、地理位置）
- ✅ 全文搜尋索引（中英文）
- ✅ Row Level Security (RLS) 政策
- ✅ 自動更新時間戳記
- ✅ 搜尋函數（`search_schools`）

### 2. 資料匯入腳本 (`scripts/import-to-supabase.ts`)

- ✅ 自動讀取現有的 CSV 資料
- ✅ 批次匯入（每次 100 筆）
- ✅ 進度顯示
- ✅ 錯誤處理
- ✅ 資料驗證

### 3. 前端整合 (`src/lib/supabase.ts`)

- ✅ TypeScript 類型安全
- ✅ 環境變數驗證
- ✅ 自動 Session 管理
- ✅ 完整的型別定義

### 4. Context 更新 (`src/contexts/SchoolContext.supabase.tsx`)

- ✅ 從 Supabase 載入資料
- ✅ 自動資料轉換（與現有格式相容）
- ✅ 錯誤處理
- ✅ 載入狀態管理

## 🚀 如何使用

### 方法 A：快速開始（5 分鐘）

請參考 [docs/QUICK_START.md](./docs/QUICK_START.md)

### 方法 B：完整指南（15 分鐘）

請參考 [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md)

## 📊 遷移步驟總覽

```mermaid
graph LR
    A[建立 Supabase 專案] --> B[執行 schema.sql]
    B --> C[設定環境變數]
    C --> D[安裝套件]
    D --> E[匯入資料]
    E --> F[切換 Context]
    F --> G[測試應用]
```

## 🔧 安裝指令

```bash
# 1. 安裝依賴
npm install @supabase/supabase-js
npm install -D tsx @types/node

# 2. 設定環境變數
cp .env.example .env
# 然後編輯 .env 填入你的 Supabase 金鑰

# 3. 匯入資料
npm run import-data

# 4. 切換到 Supabase 版本
mv src/contexts/SchoolContext.tsx src/contexts/SchoolContext.csv.tsx
mv src/contexts/SchoolContext.supabase.tsx src/contexts/SchoolContext.tsx

# 5. 啟動開發伺服器
npm run dev
```

## 🎨 功能比較

| 功能 | CSV 版本 | Supabase 版本 |
|------|----------|---------------|
| 資料載入速度 | 快（本地） | 中等（網路） |
| 搜尋效能 | 慢（客戶端） | 快（資料庫索引） |
| 資料更新 | 需重新部署 | 即時更新 |
| 使用者認證 | ❌ | ✅（可擴充） |
| 評論/收藏 | ❌ | ✅（可擴充） |
| 全文搜尋 | 基本 | 強大（PostgreSQL） |
| 即時協作 | ❌ | ✅（可擴充） |
| 資料分析 | 有限 | 豐富（SQL 查詢） |

## 🔐 安全性

- ✅ **Row Level Security (RLS)**：已啟用
- ✅ **API 金鑰分離**：前端使用 anon key，後端使用 service role key
- ✅ **環境變數保護**：敏感資料不提交到 Git
- ✅ **唯讀存取**：預設所有人只能讀取資料

## 🌟 未來可擴充功能

使用 Supabase 後，你可以輕鬆加入：

1. **使用者系統**
   ```typescript
   // 註冊/登入
   await supabase.auth.signUp({ email, password });
   ```

2. **收藏功能**
   ```sql
   CREATE TABLE favorites (
     user_id UUID REFERENCES auth.users,
     school_id TEXT REFERENCES schools,
     PRIMARY KEY (user_id, school_id)
   );
   ```

3. **評論系統**
   ```sql
   CREATE TABLE reviews (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES auth.users,
     school_id TEXT REFERENCES schools,
     rating INT,
     comment TEXT
   );
   ```

4. **即時通知**
   ```typescript
   // 監聽新評論
   supabase
     .channel('reviews')
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'reviews'
     }, (payload) => {
       console.log('新評論:', payload);
     })
     .subscribe();
   ```

5. **統計分析**
   ```sql
   -- 最熱門學校
   SELECT school_id, COUNT(*) as view_count
   FROM school_views
   GROUP BY school_id
   ORDER BY view_count DESC
   LIMIT 10;
   ```

## 🐛 疑難排解

### 問題 1：匯入失敗

**檢查項目：**
- ✅ 環境變數是否正確
- ✅ Service Role Key 是否正確
- ✅ CSV 檔案路徑是否正確
- ✅ Supabase 專案是否正常運作

### 問題 2：前端連線失敗

**檢查項目：**
- ✅ VITE_SUPABASE_URL 是否正確
- ✅ VITE_SUPABASE_ANON_KEY 是否正確
- ✅ 環境變數是否以 `VITE_` 開頭（Vite 要求）
- ✅ 重新啟動開發伺服器

### 問題 3：查詢權限錯誤

**解決方法：**
```sql
-- 檢查 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'schools';

-- 如果需要，重新執行 schema.sql
```

## 📚 相關資源

- [Supabase 官方文件](https://supabase.com/docs)
- [PostgreSQL 全文搜尋](https://www.postgresql.org/docs/current/textsearch.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase TypeScript 支援](https://supabase.com/docs/reference/javascript/typescript-support)

## 💡 小提示

1. **開發階段**：可以先使用 CSV 版本快速開發
2. **部署階段**：切換到 Supabase 獲得更好的效能
3. **漸進式遷移**：兩個版本可以並存，隨時切換
4. **備份資料**：定期匯出 Supabase 資料作為備份

## ✅ 檢查清單

在完成遷移前，請確認：

- [ ] Supabase 專案已建立
- [ ] 執行了 `schema.sql`
- [ ] 環境變數已正確設定
- [ ] 已安裝 `@supabase/supabase-js`
- [ ] 資料已成功匯入（244 筆）
- [ ] 前端已切換到 Supabase 版本
- [ ] 測試應用正常運作
- [ ] `.env` 已加入 `.gitignore`

## 🎉 完成！

恭喜你完成 Supabase 遷移！現在你的應用具備：
- ✅ 雲端資料庫
- ✅ 強大的查詢能力
- ✅ 未來可輕鬆擴充功能
- ✅ 更好的效能和擴展性

有任何問題，請參考 `docs/SUPABASE_SETUP.md` 的詳細說明。
