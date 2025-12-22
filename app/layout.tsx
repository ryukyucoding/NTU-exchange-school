import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from './providers';
import AppShell from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NTU Exchange School Map | 臺大交換學校地圖',
  description: '台灣大學交換學校查詢系統 - 搜尋、篩選、比較全球交換學校資訊',
  keywords: ['台大', '交換學生', '留學', 'NTU', 'exchange', 'study abroad'],
  authors: [{ name: 'NTU OIA' }],
  // Next.js 15 会自动识别 app/icon.svg，不需要手动配置 icons
  // 这样可以避免 preload 警告
  openGraph: {
    title: 'NTU Exchange School Map',
    description: '台灣大學交換學校查詢系統',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning style={{ backgroundColor: 'unset', background: 'unset' }}>
      <body className={inter.className}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
