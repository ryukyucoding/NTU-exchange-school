# 圖片遷移指南：Supabase Storage → Cloudinary

本指南說明如何將心得文章中的圖片從 Supabase Storage 遷移到 Cloudinary，同時更新相關數據。

## 📋 背景

目前的情況：
- ✅ 本地 `content.json` 中的圖片 URL 指向 Supabase Storage
- ✅ Supabase 中已有匯入的心得文章
- ❌ Supabase Storage 已達到免費額度限制 (2.372GB / 1GB)
- ❌ 需要將圖片遷移到 Cloudinary 以節省空間

## 🚀 遷移步驟

### 步驟 1：設定環境變數

在專案根目錄創建 `.env` 文件或設置環境變數：

```bash
# Cloudinary 設定（從你的應用中複製）
export NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
export CLOUDINARY_UPLOAD_PRESET="your_upload_preset"

# Supabase 設定
export NEXT_PUBLIC_SUPABASE_URL=""
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### 步驟 2：測試遷移（建議先做）

```bash
# Dry run - 只顯示會遷移的圖片，不實際執行
npm run migrate-images-dry-run

# 或者指定特定學生測試
npm run migrate-images-dry-run -- --student-id 12894
```

### 步驟 3：執行遷移

```bash
# 遷移所有學生的圖片並更新 Supabase Post
npm run migrate-images -- --update-supabase

# 或者只遷移特定學生
npm run migrate-images -- --student-id 12894 --update-supabase
```

## 📊 遷移內容

腳本會執行以下操作：

1. **下載圖片**：從 Supabase Storage 下載圖片
2. **上傳到 Cloudinary**：將圖片上傳到 Cloudinary
3. **更新本地數據**：修改 `content.json` 中的圖片 URL
4. **更新 Supabase Post**：將 Supabase 中對應文章的圖片 URL 替換為 Cloudinary URL

## 🔍 匹配邏輯

腳本如何找到需要更新的 Supabase Post：

1. 使用學生姓名 + 學校名稱進行匹配
2. 例如：學生 "董同學" 在 "九州大學" → 搜索內容包含 "董同學 九州大學"
3. 替換所有匹配的 Supabase Storage URL 為 Cloudinary URL

## ✅ 驗證遷移結果

遷移後檢查：

### 1. 本地文件
```bash
# 檢查 content.json 中的 URL
cat scraper/experiences/pdf_extracts/12894/content.json | grep url
```

應該看到：
```json
{
  "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/experience-images/exp_1703123456_12345678.jpg",
  "migrated_from": "supabase",
  "migrated_from_url": "https://dvqlakvtakiwhwgjmsgu.supabase.co/storage/v1/object/public/experience-images/12894/001.jpg"
}
```

### 2. Supabase 數據庫
檢查 Post 表中的 content 字段，圖片 URL 應該已被替換。

### 3. 應用功能
重新啟動應用，確認圖片正常顯示。

## 🛠️ 故障排除

### 問題：API Key 錯誤
```
Invalid API key
```
**解決方案**：檢查環境變數設置是否正確。

### 問題：找不到匹配的 Post
```
未找到學生 XXX 對應的 Post 記錄
```
**解決方案**：檢查 Supabase 中的數據是否真的存在，可以手動搜索。

### 問題：上傳失敗
```
上傳到 Cloudinary 失敗
```
**解決方案**：檢查 Cloudinary 設定和網路連接。

## 📈 預期結果

遷移完成後：
- ✅ 節省 Supabase Storage 空間 (~2.3GB)
- ✅ 圖片繼續正常顯示（使用 Cloudinary）
- ✅ Supabase 中的文章內容已更新
- ✅ 本地備份數據保持同步

## 🔄 回滾計劃

如果需要回滾：
1. 從 `migrated_from_url` 字段恢復舊的 Supabase URL
2. 重新執行遷移腳本（從 Cloudinary 改回 Supabase）

## ⚠️ 注意事項

1. **備份**：遷移前建議備份 Supabase Storage
2. **測試**：先在少量數據上測試
3. **監控**：遷移過程中監控 Cloudinary 使用量
4. **驗證**：遷移後徹底測試圖片顯示功能





