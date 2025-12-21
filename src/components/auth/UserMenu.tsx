'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings } from 'lucide-react';
import LoginModal from './LoginModal';
import NotificationButton from './NotificationButton';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const pathname = usePathname();
  const isSocialPage = pathname === '/social' || pathname?.startsWith('/social/');

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <div className="flex items-center gap-2">
          {isSocialPage && <NotificationButton />}
          <Button
            variant="ghost"
            size="icon"
            className="bg-white border border-[#b08a63] text-[#4a3828] hover:bg-[#f7efe5] w-10 h-10 rounded-full"
            onClick={() => setShowLoginModal(true)}
            aria-label="登入"
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isSocialPage && <NotificationButton />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="bg-white border border-[#b08a63] text-[#4a3828] hover:bg-[#f7efe5] w-10 h-10 rounded-full overflow-hidden"
            aria-label="用戶選單"
          >
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#b08a63] flex items-center justify-center text-white font-semibold">
                {session.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-white border border-[#d6c3a1]">
          <DropdownMenuLabel className="text-[#4a3828]">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{session.user?.name || 'User'}</p>
              <p className="text-xs text-[#6b5b4c]">{session.user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-[#4a3828] hover:bg-[#f7efe5] cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            個人資料
          </DropdownMenuItem>
          <DropdownMenuItem className="text-[#4a3828] hover:bg-[#f7efe5] cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            帳戶設定
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 hover:bg-red-50 cursor-pointer"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            登出
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
