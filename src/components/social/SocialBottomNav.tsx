'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, User } from 'lucide-react';
import PostTypeDialog from './PostTypeDialog';

export default function SocialBottomNav() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (dialogOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.top - 120, // 显示在按钮上方
        left: rect.left,
        width: rect.width,
      });
    }
  }, [dialogOpen]);

  const handlePostClick = () => {
    setDialogOpen(true);
  };

  const userId = (session?.user as { id?: string })?.id || '';

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {/* 所有看板 */}
          <Link href="/social/boards" className="flex-1 flex flex-col items-center justify-center">
            <Button
              variant="ghost"
              className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-700 hover:bg-gray-100 hover:text-gray-700 p-0"
            >
              <LayoutGrid className="w-5 h-5 text-gray-600" />
              <span className="text-xs">看板</span>
            </Button>
          </Link>

          {/* 发布贴文 */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <Button
              ref={buttonRef}
              onClick={handlePostClick}
              className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[#BAC7E5] text-[#333333] hover:bg-[rgba(186,199,229,0.9)] p-0 rounded-lg"
              style={{
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">發文</span>
            </Button>
          </div>

          {/* 个人页面 */}
          <Link href={`/social/profile/${userId}`} className="flex-1 flex flex-col items-center justify-center">
            <Button
              variant="ghost"
              className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-700 hover:bg-gray-100 hover:text-gray-700 p-0"
            >
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-xs">個人</span>
            </Button>
          </Link>
        </div>
      </nav>
      <PostTypeDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        position={buttonPosition}
      />
    </>
  );
}

