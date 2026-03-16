'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, LayoutGrid, User, Search, Bell } from 'lucide-react';
import PostTypeDialog from './PostTypeDialog';

/** 僅圖示、無文字，適合點擊的圓角方塊 */
const NAV_TILE =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors active:scale-[0.98]';

export default function SocialBottomNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (dialogOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.top - 120,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [dialogOpen]);

  const userId = (session?.user as { id?: string })?.id || '';
  const isBoards = pathname.startsWith('/social/boards');
  const isSocialHome = pathname === '/social' || (pathname.startsWith('/social') && pathname.includes('?'));
  const isNotifications = pathname.startsWith('/social/notifications');
  const isProfile = pathname.startsWith('/social/profile');

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-none md:hidden" aria-label="社群導航">
        <div className="flex h-14 items-center justify-center gap-6 px-4">
          <Link
            href="/social/boards"
            className={`${NAV_TILE} hover:bg-gray-100 ${isBoards ? 'text-[#4a3828]' : 'text-gray-500'}`}
            aria-label="看板"
          >
            <LayoutGrid className={`h-5 w-5 shrink-0 ${isBoards ? 'text-[#4a3828]' : 'text-gray-500'}`} />
          </Link>

          <Link
            href="/social?focus=search"
            className={`${NAV_TILE} hover:bg-gray-100 ${isSocialHome ? 'text-[#4a3828]' : 'text-gray-500'}`}
            aria-label="搜尋貼文"
          >
            <Search className={`h-5 w-5 shrink-0 ${isSocialHome ? 'text-[#4a3828]' : 'text-gray-500'}`} />
          </Link>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setDialogOpen(true)}
            className={`${NAV_TILE} border-0 bg-[#BAC7E5] text-[#333] shadow-none hover:bg-[#a8b8da]`}
            style={{ boxShadow: 'none' }}
            aria-label="發文"
          >
            <Plus className="h-5 w-5 shrink-0" />
          </button>

          <Link
            href="/social/notifications"
            className={`${NAV_TILE} hover:bg-gray-100 ${isNotifications ? 'text-[#4a3828]' : 'text-gray-500'}`}
            aria-label="通知"
          >
            <Bell className={`h-5 w-5 shrink-0 ${isNotifications ? 'text-[#4a3828]' : 'text-gray-500'}`} />
          </Link>

          <Link
            href={`/social/profile/${userId}`}
            className={`${NAV_TILE} hover:bg-gray-100 ${isProfile ? 'text-[#4a3828]' : 'text-gray-500'}`}
            aria-label="個人"
          >
            <User className={`h-5 w-5 shrink-0 ${isProfile ? 'text-[#4a3828]' : 'text-gray-500'}`} />
          </Link>
        </div>
      </nav>
      <PostTypeDialog open={dialogOpen} onOpenChange={setDialogOpen} position={buttonPosition} />
    </>
  );
}
