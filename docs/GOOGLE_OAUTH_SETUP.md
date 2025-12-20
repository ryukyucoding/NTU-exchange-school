# Google OAuth 設定指南

## 1. 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 **Google+ API**（如果需要）

## 2. 建立 OAuth 2.0 憑證

1. 在 Google Cloud Console 中，前往 **API 和服務** > **憑證**
2. 點擊 **建立憑證** > **OAuth 用戶端 ID**
3. 如果這是第一次建立，需要先設定 **OAuth 同意畫面**：
   - 選擇 **外部**（如果是公開應用程式）
   - 填寫應用程式資訊：
     - 應用程式名稱：`NTU Exchange School`
     - 使用者支援電子郵件：你的電子郵件
     - 開發人員連絡資訊：你的電子郵件
   - 儲存並繼續
   - 在 **範圍** 頁面，直接點擊 **儲存並繼續**
   - 在 **測試使用者** 頁面，可以添加測試使用者（開發階段）
   - 完成設定

4. 建立 OAuth 用戶端 ID：
   - **應用程式類型**：選擇 **網頁應用程式**
   - **名稱**：`NTU Exchange School Web Client`
   - **已授權的 JavaScript 來源**：
     ```
     http://localhost:3000
     https://your-domain.com
     ```
   - **已授權的重新導向 URI**（重要！）：
     ```
     http://localhost:3000/api/auth/callback/google
     https://your-domain.com/api/auth/callback/google
     ```

## 3. 取得 Client ID 和 Client Secret

建立完成後，你會看到：
- **用戶端 ID**：類似 `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **用戶端密鑰**：類似 `GOCSPX-abcdefghijklmnopqrstuvwxyz`

## 4. 設定環境變數

在專案根目錄建立 `.env.local` 檔案（如果還沒有）：

```env
# Google OAuth
GOOGLE_CLIENT_ID=你的用戶端ID
GOOGLE_CLIENT_SECRET=你的用戶端密鑰

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=你的隨機字串（用於加密 session）

# Supabase（如果使用）
NEXT_PUBLIC_SUPABASE_URL=你的Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase Anon Key
SUPABASE_SERVICE_ROLE_KEY=你的Supabase Service Role Key（伺服器端使用）
```

### 產生 NEXTAUTH_SECRET

可以使用以下命令產生：

```bash
openssl rand -base64 32
```

或在 Node.js 中：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 5. Redirect URIs 設定建議

### 開發環境（localhost）

```
http://localhost:3000/api/auth/callback/google
```

### 生產環境

根據你的部署平台設定：

#### Vercel
```
https://your-app.vercel.app/api/auth/callback/google
```

#### 自訂網域
```
https://your-domain.com/api/auth/callback/google
https://www.your-domain.com/api/auth/callback/google
```

### 完整範例

在 Google Cloud Console 的 **已授權的重新導向 URI** 中，添加：

```
http://localhost:3000/api/auth/callback/google
https://ntu-exchange-school.vercel.app/api/auth/callback/google
https://your-custom-domain.com/api/auth/callback/google
```

## 6. 測試登入功能

1. 確保 `.env.local` 已正確設定
2. 重新啟動開發伺服器：
   ```bash
   npm run dev
   ```
3. 訪問 `http://localhost:3000`
4. 點擊右上角的用戶圖標
5. 選擇「使用 Google 登入」
6. 應該會重定向到 Google 登入頁面

## 7. 常見問題

### 問題：`redirect_uri_mismatch` 錯誤

**解決方法**：
- 確認 Google Cloud Console 中的 **已授權的重新導向 URI** 與實際使用的 URL 完全一致
- 注意 `http` vs `https`、`localhost` vs `127.0.0.1`、結尾斜線等細節
- 必須包含完整路徑：`/api/auth/callback/google`

### 問題：`invalid_client` 錯誤

**解決方法**：
- 確認 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET` 正確
- 確認環境變數已載入（重啟開發伺服器）

### 問題：OAuth 同意畫面顯示「未驗證」

**解決方法**：
- 開發階段：在 **測試使用者** 中添加你的 Google 帳號
- 生產環境：需要提交應用程式進行驗證（如果應用程式是公開的）

## 8. 安全注意事項

1. **永遠不要**將 `.env.local` 提交到 Git
2. 使用環境變數管理服務（如 Vercel 的環境變數設定）
3. 定期輪換 Client Secret
4. 限制 OAuth 同意畫面的使用者範圍（開發階段）

## 9. 部署到生產環境

### Vercel

1. 在 Vercel 專案設定中，添加環境變數：
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_URL`（設為你的 Vercel URL）
   - `NEXTAUTH_SECRET`

2. 在 Google Cloud Console 中添加生產環境的 Redirect URI

3. 重新部署應用程式

### 其他平台

根據你的部署平台，在環境變數設定中添加相同的變數。
