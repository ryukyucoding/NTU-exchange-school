'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, BookOpen, Users, Heart, Map } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';
import type { LucideIcon } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  title: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: '/', title: '地圖', icon: Map },
  { href: '/table', title: '瀏覽學校', icon: BookOpen },
  { href: '/social', title: '社群', icon: Users },
  { href: '/wishlist', title: '收藏學校', icon: Heart },
];

export default function AppShell({ children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Header Frame - 完全透明 */}
      <header 
        className="fixed top-0 left-0 right-0 z-[100] h-16 pointer-events-none" 
        style={{ backgroundColor: 'unset', background: 'unset' }}
      >
        <div className="relative flex h-full items-center justify-between px-3 sm:px-4">
          {/* 左上角：選單；社群頁小螢幕 Logo 改置中，此處只留選單 */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="bg-white border border-[#b08a63] text-[#4a3828] hover:bg-[#f7efe5]"
              onClick={() => setOpen(!open)}
              aria-label="開啟側邊選單"
            >
              <Menu className="w-5 h-5" />
            </Button>
            {/* 社群頁 md+：Logo 仍在左側；小螢幕改中央 icon，此處不並排 */}
            {pathname?.startsWith('/social') && (
              <Link
                href="/social"
                data-tour-step="social-logo"
                className="hidden md:flex items-center hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/logo-social.png"
                  alt="社群 Logo"
                  width={0}
                  height={0}
                  style={{ width: 'auto', height: '2rem' }}
                  priority
                  unoptimized
                />
              </Link>
            )}
            {pathname === '/table' && (
              <Link href="/table" className="flex items-center hover:opacity-80 transition-opacity">
                <Image
                  src="/logo-social.png"
                  alt="瀏覽學校 Logo"
                  width={0}
                  height={0}
                  style={{ width: 'auto', height: '2rem' }}
                  priority
                  unoptimized
                />
              </Link>
            )}
            {pathname === '/wishlist' && (
              <Link href="/wishlist" className="flex items-center hover:opacity-80 transition-opacity">
                <Image
                  src="/logo-social.png"
                  alt="收藏學校 Logo"
                  width={0}
                  height={0}
                  style={{ width: 'auto', height: '2rem' }}
                  priority
                  unoptimized
                />
              </Link>
            )}
          </div>

          {/* 社群頁：小螢幕中央 icon（省空間）、md+ 仍靠左大 Logo  */}
          {pathname?.startsWith('/social') && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center md:hidden"
              aria-hidden={false}
            >
              <Link
                href="/social"
                className="pointer-events-auto flex items-center justify-center rounded-lg hover:opacity-90"
                aria-label="社群首頁"
              >
                <Image
                  src="/icon.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7"
                  priority
                />
              </Link>
            </div>
          )}

          {/* 非社群頁：中間留空 */}
          {!pathname?.startsWith('/social') && (
            <div className="min-w-0 flex-1" style={{ pointerEvents: 'none' }} />
          )}
          {pathname?.startsWith('/social') && (
            <div className="hidden md:block min-w-0 flex-1" style={{ pointerEvents: 'none' }} />
          )}

          {/* 右上角：通知 + 頭貼（維持右側） */}
          <div className="pointer-events-auto relative z-[100] shrink-0">
            <UserMenu />
          </div>
        </div>
      </header>

      {/* 側邊欄：高於遮罩，僅選單本體不變暗 */}
      <div
        className={`fixed left-0 top-0 z-[120] h-full w-64 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* 導航項目 */}
          <nav className="flex-1 px-4 pt-20 pb-6 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    active
                      ? 'text-gray-900 font-semibold'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {/* 激活狀態的左侧竖条 */}
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-900 rounded-r-full" />
                  )}
                  
                  {/* 圖標 */}
                  <div className={`flex-shrink-0 ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {active ? (
                      <Icon className="w-5 h-5" fill="currentColor" />
                    ) : (
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    )}
                  </div>
                  
                  {/* 文字 */}
                  <span className="text-sm">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 遮罩：高於頂欄 z-[100]，整頁（含漢堡／Logo／通知／頭貼）變暗；點擊關閉 */}
      {open && (
        <div
          className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          role="button"
          tabIndex={-1}
          aria-label="關閉選單"
        />
      )}

      {/* 主要內容 */}
      <div className={`relative ${pathname === '/' || pathname === '/table' ? '' : 'pt-16'}`}>{children}</div>
    </div>
  );
}

