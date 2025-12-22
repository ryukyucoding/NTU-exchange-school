/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid monorepo/workspace root mis-detection when multiple lockfiles exist.
  outputFileTracingRoot: __dirname,
  eslint: {
    // Our eslint config uses devDependencies that might not be installed in some environments.
    // This keeps `next build` unblocked; use `npm run lint` when deps are available.
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['your-domain.com'], // 如果需要載入外部圖片
  },
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // 支援 CSS 和其他靜態資源
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  transpilePackages: ['@radix-ui/react-dialog', '@radix-ui/react-checkbox'],
};

module.exports = nextConfig;
