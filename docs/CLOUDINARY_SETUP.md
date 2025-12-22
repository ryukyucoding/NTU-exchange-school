# Cloudinary 圖片上傳配置指南

## 為什麼需要 Cloudinary？

本專案使用 Cloudinary 來處理圖片上傳和存儲。Cloudinary 提供免費的圖片存儲和 CDN 服務。

## 快速設置步驟

### 1. 註冊 Cloudinary 帳號

1. 訪問 [Cloudinary 官網](https://cloudinary.com/)
2. 點擊「Sign Up」註冊免費帳號
3. 完成註冊後，進入 Dashboard

### 2. 獲取配置資訊

在 Cloudinary Dashboard 中，你可以找到：

- **Cloud Name**: 在 Dashboard 首頁顯示（例如：`dxyz1234`）
- **Upload Preset**: 
  1. 點擊左側選單的「Settings」
  2. 選擇「Upload」標籤
  3. 點擊「Add upload preset」
  4. 設定名稱（例如：`nextjs_upload`）
  5. 選擇「Signing mode」為「Unsigned」（允許匿名上傳）
  6. 點擊「Save」

### 3. 配置環境變數

在專案根目錄創建 `.env.local` 文件（如果還沒有），並添加以下內容：

```bash
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name_here
```

**範例：**
```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxyz1234
CLOUDINARY_UPLOAD_PRESET=nextjs_upload
```

### 4. 重啟開發伺服器

配置完成後，需要重啟 Next.js 開發伺服器：

```bash
# 停止當前伺服器（Ctrl+C）
# 然後重新啟動
npm run dev
```

## 驗證配置

配置完成後，嘗試上傳一張圖片。如果成功，圖片會顯示在編輯器中。

## 免費方案限制

Cloudinary 免費方案包括：
- 25GB 存儲空間
- 25GB 月流量
- 25,000 次轉換/月

對於大多數個人專案和小型應用，這已經足夠使用。

## 故障排除

### 錯誤：`Missing Cloudinary config`

**原因：** 環境變數未設置或設置錯誤

**解決方法：**
1. 確認 `.env.local` 文件存在於專案根目錄
2. 確認變數名稱正確（注意大小寫）
3. 確認沒有多餘的空格或引號
4. 重啟開發伺服器

### 錯誤：`圖片上傳失敗`

**可能原因：**
1. Upload Preset 未設置為「Unsigned」
2. Cloud Name 錯誤
3. 網路連接問題

**解決方法：**
1. 檢查 Cloudinary Dashboard 中的 Upload Preset 設置
2. 確認 Cloud Name 正確
3. 檢查瀏覽器控制台和終端日誌中的詳細錯誤信息

## 其他圖片上傳服務

如果你不想使用 Cloudinary，可以修改 `/app/api/upload/image/route.ts` 來使用其他服務：

- **Supabase Storage**: 如果你已經在使用 Supabase
- **AWS S3**: 需要 AWS 帳號
- **本地存儲**: 僅適用於開發環境（不推薦用於生產）

## 需要幫助？

如果遇到問題，請檢查：
1. 終端日誌中的錯誤信息
2. 瀏覽器控制台的錯誤信息
3. Cloudinary Dashboard 中的設置

