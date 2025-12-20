# 登入功能設定檢查清單

## ✅ 已完成的代碼實現

1. ✅ NextAuth 配置 (`src/lib/auth.ts`)
2. ✅ UserMenu 組件（右上角用戶選單）
3. ✅ LoginModal 組件（登入模态框）
4. ✅ RouteGuard 組件（路由保護）
5. ✅ AppShell 已添加 UserMenu
6. ✅ 需要保護的頁面已添加 RouteGuard：
   - `/table` - 瀏覽學校
   - `/social` - 社群
   - `/wishlist` - 收藏學校
7. ✅ SessionProvider 已恢復到 `app/providers.tsx`
8. ✅ API 路由已建立 (`app/api/auth/[...nextauth]/route.ts`)

## 📦 需要安裝的套件

執行以下命令安裝必要的套件：

```bash
npm install next-auth@beta @radix-ui/react-dropdown-menu --legacy-peer-deps
```

如果遇到依賴衝突，使用 `--legacy-peer-deps` 標誌。

## 🔑 需要設定的環境變數

在 `.env.local` 檔案中添加：

```env
# Google OAuth（必須）
GOOGLE_CLIENT_ID=你的Google用戶端ID
GOOGLE_CLIENT_SECRET=你的Google用戶端密鑰

# NextAuth（必須）
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=你的隨機字串（用於加密session）

# Supabase（如果使用）
NEXT_PUBLIC_SUPABASE_URL=你的Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase Anon Key
SUPABASE_SERVICE_ROLE_KEY=你的Supabase Service Role Key
```

### 產生 NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

或

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🔗 Google OAuth Redirect URIs 設定

在 Google Cloud Console 的 OAuth 2.0 用戶端設定中，添加以下 **已授權的重新導向 URI**：

### 開發環境
```
http://localhost:3000/api/auth/callback/google
```

### 生產環境（根據你的部署平台）

#### Vercel
```
https://your-app.vercel.app/api/auth/callback/google
```

#### 自訂網域
```
https://your-domain.com/api/auth/callback/google
https://www.your-domain.com/api/auth/callback/google
```

**重要**：URI 必須完全匹配，包括：
- 協議（http vs https）
- 主機名稱（localhost vs 127.0.0.1）
- 完整路徑（`/api/auth/callback/google`）
- 結尾不能有斜線

## 📋 設定步驟

1. **安裝套件**
   ```bash
   npm install next-auth@beta @radix-ui/react-dropdown-menu --legacy-peer-deps
   ```

2. **建立 Google OAuth 憑證**
   - 參考 `docs/GOOGLE_OAUTH_SETUP.md` 的詳細說明
   - 在 Google Cloud Console 建立 OAuth 2.0 用戶端 ID
   - 設定 Redirect URIs

3. **設定環境變數**
   - 建立 `.env.local` 檔案
   - 添加所有必要的環境變數
   - 產生 `NEXTAUTH_SECRET`

4. **重啟開發伺服器**
   ```bash
   npm run dev
   ```

5. **測試登入功能**
   - 訪問 `http://localhost:3000`
   - 點擊右上角用戶圖標
   - 嘗試登入

## 🎯 功能說明

### 公開路由（不需要登入）
- `/` - 地圖頁面

### 受保護路由（需要登入）
- `/table` - 瀏覽學校（表格模式）
- `/social` - 社群功能
- `/wishlist` - 收藏學校

### 用戶選單功能
- 未登入：點擊顯示登入模态框
- 已登入：點擊顯示下拉選單
  - 個人資料
  - 帳戶設定
  - 登出

## ⚠️ 注意事項

1. 確保 `.env.local` 已添加到 `.gitignore`
2. 不要將敏感資訊提交到 Git
3. 生產環境使用環境變數管理服務（如 Vercel）
4. 定期更新和輪換密鑰

## 📚 相關文檔

- `docs/GOOGLE_OAUTH_SETUP.md` - Google OAuth 詳細設定指南
