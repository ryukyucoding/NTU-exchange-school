'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import LoginModal from './LoginModal';

interface RouteGuardProps {
  children: React.ReactNode;
}

// 公開路由：不需要登入即可訪問
const publicRoutes = ['/', '/table'];

export default function RouteGuard({ children }: RouteGuardProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const requiresAuth = !publicRoutes.includes(pathname || '');

  useEffect(() => {
    // 如果正在載入，等待
    if (status === 'loading') return;

    // 如果需要登入但未登入，顯示登入模态框
    if (requiresAuth && status === 'unauthenticated' && !session) {
      setShowLoginModal(true);
    } else if (session) {
      // 如果已登入，關閉登入模态框
      setShowLoginModal(false);
    }
  }, [session, status, pathname, requiresAuth]);

  // 如果正在載入，顯示載入中
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#b08a63] border-t-transparent mx-auto"></div>
          <p className="mt-3 text-sm text-[#6b5b4c]">載入中...</p>
        </div>
      </div>
    );
  }

  // 如果需要登入但未登入，顯示登入模态框並阻止訪問內容
  if (requiresAuth && !session) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-[#fdfaf5]">
          <div className="text-center">
            <p className="text-lg text-[#4a3828] mb-4">此功能需要登入</p>
            <p className="text-sm text-[#6b5b4c]">請登入以繼續使用</p>
          </div>
        </div>
        <LoginModal isOpen={showLoginModal} onClose={() => {
          setShowLoginModal(false);
          // 如果用戶關閉登入框，重定向到首頁
          router.push('/');
        }} />
      </>
    );
  }

  // 已登入或公開路由，顯示內容
  return <>{children}</>;
}
