// Mapbox GL 配置 - 解決 Next.js 中的 worker 問題
// 這個文件必須在客戶端執行，用於設置 mapbox-gl 的 worker

let workerInitialized = false;

if (typeof window !== 'undefined' && !workerInitialized) {
  workerInitialized = true;
  
  // 使用本地 worker URL（避免 CORS 問題）
  try {
    // @ts-expect-error - 動態導入
    const mapboxgl = require('mapbox-gl');
    
    // 設置 worker URL 為本地路徑
    if (mapboxgl.default) {
      // @ts-expect-error - workerUrl 屬性沒有類型定義
      mapboxgl.default.workerUrl = '/mapbox-gl-csp-worker.js';
    }
  } catch (error) {
    // 如果同步方式失敗，使用異步方式
    import('mapbox-gl').then((mapboxgl) => {
      if (mapboxgl.default) {
        // @ts-expect-error - workerUrl 屬性沒有類型定義
        mapboxgl.default.workerUrl = '/mapbox-gl-csp-worker.js';
      }
    }).catch((err) => {
      console.error('Failed to initialize mapbox-gl worker:', err);
    });
  }
}

