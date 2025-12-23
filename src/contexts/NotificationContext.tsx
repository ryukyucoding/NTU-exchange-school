'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePusher } from '@/hooks/usePusher';

interface NotificationContextValue {
  hasUnread: boolean;
  setHasUnread: (value: boolean) => void;
  checkUnread: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [hasUnread, setHasUnread] = useState(false);

  // 檢查未讀通知
  const checkUnread = useCallback(async () => {
    if (!session?.user) {
      setHasUnread(false);
      return;
    }

    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setHasUnread(data.hasUnread);
      }
    } catch (error) {
      console.error('Error checking unread notifications:', error);
    }
  }, [session?.user]);

  // 處理 Pusher 即時通知
  const handleNewNotification = useCallback(() => {
    console.log('[NotificationContext] New notification received from Pusher');
    setHasUnread(true);
  }, []);

  // 訂閱 Pusher 即時通知
  usePusher({
    userId: session?.user?.id,
    onNewNotification: handleNewNotification,
  });

  // 初始化和輪詢檢查未讀通知（每 5 分鐘）
  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 5 * 60 * 1000); // 5 分鐘
    return () => clearInterval(interval);
  }, [checkUnread]);

  return (
    <NotificationContext.Provider value={{ hasUnread, setHasUnread, checkUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
