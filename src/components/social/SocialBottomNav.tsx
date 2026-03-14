'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Plus, LayoutGrid, User } from 'lucide-react';
import PostTypeDialog from './PostTypeDialog';

/** 圖示 + 文字同一塊 hover，約 56×56，字不會孤獨在下方 */
const NAV_TILE =
  'flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition-colors active:scale-[0.98]';

export default function SocialBottomNav() {
  const { data: session } = useSession();
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

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-none sm:hidden">
        <div className="flex h-16 items-center justify-center gap-8 px-4">
          <Link
            href="/social/boards"
            className={`${NAV_TILE} text-gray-700 hover:bg-gray-100`}
          >
            <LayoutGrid className="h-5 w-5 shrink-0 text-gray-600" />
            <span className="text-[11px] font-medium leading-tight text-gray-600">看板</span>
          </Link>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setDialogOpen(true)}
            className={`${NAV_TILE} border-0 bg-[#BAC7E5] text-[#333] shadow-none hover:bg-[#a8b8da]`}
            style={{ boxShadow: 'none' }}
          >
            <Plus className="h-5 w-5 shrink-0" />
            <span className="text-[11px] font-medium leading-tight">發文</span>
          </button>

          <Link
            href={`/social/profile/${userId}`}
            className={`${NAV_TILE} text-gray-700 hover:bg-gray-100`}
          >
            <User className="h-5 w-5 shrink-0 text-gray-600" />
            <span className="text-[11px] font-medium leading-tight text-gray-600">個人</span>
          </Link>
        </div>
      </nav>
      <PostTypeDialog open={dialogOpen} onOpenChange={setDialogOpen} position={buttonPosition} />
    </>
  );
}
