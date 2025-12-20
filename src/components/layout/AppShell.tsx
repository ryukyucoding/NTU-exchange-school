'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';

interface AppShellProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/', title: '轉轉轉轉轉', description: '目前的主頁（地圖模式）' },
  { href: '/table', title: '瀏覽學校', description: '主頁的表格模式' },
  { href: '/social', title: '社群', description: '即將推出的功能' },
  { href: '/wishlist', title: '收藏學校', description: '獨立的收藏與志願序頁面' },
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
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* 側邊欄 */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-6 space-y-4">
          <div className="text-xl font-bold text-gray-800">功能選單</div>
          <div className="space-y-3">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const activeClasses = 'border-[#b08a63] bg-[#f7efe5] text-[#4a3828] shadow-sm';
              const normalClasses = 'border-[#d8c5aa] bg-white text-[#4a3828] hover:border-[#b08a63] hover:bg-[#f7efe5]';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg border transition-all ${active ? activeClasses : normalClasses}`}
                >
                  <div className="px-4 py-3">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-sm text-gray-600">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
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

