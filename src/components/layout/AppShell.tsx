'use client';

import Link from 'next/link';
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
      {/* 左上角開關按鈕 */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="bg-white border border-[#b08a63] text-[#4a3828] shadow-lg hover:bg-[#f7efe5]"
          onClick={() => setOpen(!open)}
          aria-label="開啟側邊選單"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* 側邊欄 */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 ${
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
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setOpen(false)}
          role="presentation"
        />
      )}

      {/* 右上角用戶選單 */}
      <UserMenu />

      {/* 主要內容 */}
      <div className="relative">{children}</div>
    </div>
  );
}

