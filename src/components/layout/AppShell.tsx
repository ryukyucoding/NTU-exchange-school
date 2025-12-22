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
        className="fixed top-0 left-0 right-0 h-16 z-50 pointer-events-none" 
        style={{ backgroundColor: 'unset', background: 'unset' }}
      >
        <div className="h-full flex items-center justify-between px-4">
          {/* 左上角開關按鈕和 Logo */}
          <div className="pointer-events-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="bg-white border border-[#b08a63] text-[#4a3828] hover:bg-[#f7efe5]"
              onClick={() => setOpen(!open)}
              aria-label="開啟側邊選單"
            >
              <Menu className="w-5 h-5" />
            </Button>
            {/* 在特定頁面顯示 Logo */}
            {pathname?.startsWith('/social') && (
              <Link href="/social" className="flex items-center hover:opacity-80 transition-opacity">
                <Image
                  src="/logo-social.png"
                  alt="社群 Logo"
                  width={120}
                  height={32}
                  className="h-8 w-auto"
                  priority
                />
              </Link>
            )}
            {pathname === '/table' && (
              <Link href="/table" className="flex items-center hover:opacity-80 transition-opacity">
                <Image
                  src="/logo-social.png"
                  alt="瀏覽學校 Logo"
                  width={120}
                  height={32}
                  className="h-8 w-auto"
                  priority
                />
              </Link>
            )}
            {pathname === '/wishlist' && (
              <Link href="/wishlist" className="flex items-center hover:opacity-80 transition-opacity">
                <Image
                  src="/logo-social.png"
                  alt="收藏學校 Logo"
                  width={120}
                  height={32}
                  className="h-8 w-auto"
                  priority
                />
              </Link>
            )}
          </div>
          
          {/* 中間區域留空，給 topic/篩選按鈕使用 */}
          <div className="flex-1" style={{ pointerEvents: 'none' }} />
          
          {/* 右上角按鈕區域 */}
          <div className="pointer-events-auto">
            <UserMenu />
          </div>
        </div>
      </header>

      {/* 側邊欄 */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[80] ${
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

      {/* 遮罩 */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[70]"
          onClick={() => setOpen(false)}
          role="presentation"
        />
      )}

      {/* 主要內容 */}
      <div className={`relative ${pathname === '/' || pathname === '/table' ? '' : 'pt-16'}`}>{children}</div>
    </div>
  );
}

