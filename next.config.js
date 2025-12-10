/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
