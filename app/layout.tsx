import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from './providers';
import AppShell from '@/components/layout/AppShell';
import { Suspense } from 'react';
import NavigationReferrerTracker from '@/components/NavigationReferrerTracker';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = 'https://tang-yuan.vercel.app';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: '湯圓｜臺大交換學校地圖',
    template: '%s | 湯圓',
  },
  description: '台灣大學交換學校查詢系統 - 搜尋、篩選、比較全球交換學校資訊，分享交換心得與評價',
  keywords: ['台大', '交換學生', '留學', 'NTU', 'exchange', 'study abroad', '湯圓', '交換學校', '台灣大學', '交換心得', '台大交換', '臺大交換', '交換學校'],
  authors: [{ name: '湯圓團隊' }],
  creator: '湯圓團隊',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: '湯圓｜臺大交換學校地圖',
    description: '台灣大學交換學校查詢系統 - 搜尋、篩選、比較全球交換學校資訊，分享交換心得與評價',
    type: 'website',
    locale: 'zh_TW',
    siteName: '湯圓',
    url: BASE_URL,
    images: [
      {
        url: '/og-cover.png',
        width: 1200,
        height: 630,
        alt: '湯圓｜臺大交換學校地圖',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '湯圓｜臺大交換學校地圖',
    description: '台灣大學交換學校查詢系統 - 搜尋、篩選、比較全球交換學校資訊，分享交換心得與評價',
    images: ['/og-cover.png'],
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    google: 'beLALKsbdey63wteQuLZq1SgpY8vJJvZEi5T9aoHRzU',
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
        <Suspense fallback={null}>
          <NavigationReferrerTracker />
        </Suspense>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
