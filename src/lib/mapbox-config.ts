// Mapbox GL 配置 - 解決 Next.js 中的 worker 問題
// 這個文件必須在客戶端執行，用於設置 mapbox-gl 的 worker

let workerInitialized = false;

if (typeof window !== 'undefined' && !workerInitialized) {
  workerInitialized = true;
  
  // 使用本地 worker URL（避免 CORS 問題）
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mapboxgl = require('mapbox-gl');

    // 設置 worker URL 為本地路徑
    if (mapboxgl.default) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapboxgl.default as any).workerUrl = '/mapbox-gl-csp-worker.js';
    }
  } catch (_error) {
    // 如果同步方式失敗，使用異步方式
    import('mapbox-gl').then((mapboxgl) => {
      if (mapboxgl.default) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapboxgl.default as any).workerUrl = '/mapbox-gl-csp-worker.js';
      }
    }).catch((err: unknown) => {
      console.error('Failed to initialize mapbox-gl worker:', err instanceof Error ? err.message : String(err));
    });
  }
}

