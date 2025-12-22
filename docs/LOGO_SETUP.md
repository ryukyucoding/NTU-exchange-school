# Logo 圖片設置指引

## 需要準備的圖片

你需要準備兩張圖片：

### 1. 社群頁面 Logo（Header 顯示用）
- **檔案名稱**：`logo-social.png`
- **放置位置**：`/public/logo-social.png`
- **用途**：在社群相關頁面的 header 中，顯示在選單按鈕右邊
- **規格建議**：
  - 寬度：約 120-200px（高度會自動調整，保持比例）
  - 格式：PNG（支援透明背景）
  - 建議高度：約 32-40px
  - 檔案大小：盡量小於 50KB 以提升載入速度

### 2. Favicon 和載入中圖片（建議使用 SVG）
- **主要檔案名稱**：`favicon.svg`（推薦）
- **備用檔案名稱**：`favicon.png`（可選，作為 fallback）
- **放置位置**：
  - `/public/favicon.svg`（主要）
  - `/public/favicon.png`（備用，可選）
- **用途**：
  - 瀏覽器標籤頁的圖示（favicon）
  - 載入中頁面顯示的動畫圖片
- **規格建議**：
  - **SVG（推薦）**：
    - 格式：SVG（矢量圖，不會變形）
    - 尺寸：任意比例（建議設計為接近正方形，但不會被強制壓縮）
    - 檔案大小：盡量小於 10KB
    - 優點：無損縮放、不會變形、檔案小
  - **PNG（備用）**：
    - 格式：PNG（支援透明背景）
    - 尺寸：32x32 或 64x64（正方形）
    - 檔案大小：盡量小於 20KB
    - 用途：作為 SVG 的 fallback（如果瀏覽器不支援 SVG favicon）

## 檔案結構

放置圖片後，你的 `public` 資料夾應該看起來像這樣：

```
public/
├── logo-social.png      ← 社群頁面 Logo（放在選單按鈕右邊）
├── favicon.svg          ← Favicon 和載入中圖片（主要，推薦）
├── favicon.png          ← Favicon 備用（可選）
└── data/
    └── school_map.csv
```

## 功能說明

### 社群頁面 Logo
- 只在以下頁面顯示：
  - `/social`（社群首頁）
  - `/social/boards`（所有看板）
  - `/social/boards/country/[countryId]`（國家板）
  - `/social/boards/school/[schoolId]`（學校板）
  - `/social/profile/[userId]`（個人頁面）
- 點擊 Logo 會導航到 `/social`（社群首頁）
- Logo 會顯示在選單按鈕右邊，與選單按鈕有適當間距

### Favicon
- 會自動顯示在瀏覽器標籤頁
- 在載入中頁面會以動畫形式顯示（pulse 動畫效果）

## 測試

放置圖片後，請測試：
1. 前往任何社群相關頁面，確認 Logo 顯示在選單按鈕右邊
2. 點擊 Logo，確認會導航到社群首頁
3. 檢查瀏覽器標籤頁，確認 favicon 顯示正確
4. 重新載入頁面，確認載入中動畫顯示 favicon

## 注意事項

- 如果圖片沒有顯示，請確認：
  1. 檔案名稱完全正確（區分大小寫）
  2. 檔案放在正確的位置（`/public/` 資料夾）
  3. 重新啟動開發伺服器（`npm run dev`）
  4. 清除瀏覽器快取

