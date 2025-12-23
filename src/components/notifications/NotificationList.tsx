'use client';

import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import NotificationItem from './NotificationItem';

interface Notification {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  post: {
    id: string;
    content: string;
  } | null;
  comment: {
    id: string;
    content: string;
    postId: string;
  } | null;
  board: {
    id: string;
    name: string;
  } | null;
}

interface NotificationListProps {
  onNotificationRead: () => void;
  onClose: () => void;
}

export default function NotificationList({ onNotificationRead, onClose }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationRead = () => {
    fetchNotifications();
    onNotificationRead();
  };

  return (
    <div className="flex flex-col max-h-96 bg-white rounded-xl">
      <div className="flex items-center justify-between p-4">
        <h3 className="font-semibold text-lg" style={{ color: '#5A5A5A' }}>通知</h3>
      </div>
      <div className="border-b border-gray-200" />
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暫無通知</div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={handleNotificationRead}
              onClose={onClose}
            />
          ))
        )}
      </div>
    </div>
  );
}
