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
  icons: {
    icon: '/favicon.svg',
  },
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
