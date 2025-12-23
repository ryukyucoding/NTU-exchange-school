'use client';

import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/utils/date';

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    read: boolean;
    createdAt: string;
    actor: { id: string; name: string; image: string | null } | null;
    post: { id: string; content: string } | null;
    comment: { id: string; content: string; postId: string } | null;
    board: { id: string; name: string } | null;
  };
  onRead: () => void;
  onClose: () => void;
}

export default function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const router = useRouter();

  const handleClick = async () => {
    // 標記為已讀
    if (!notification.read) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, { method: 'PUT' });
        onRead();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // 跳轉到對應位置
    const url = getNotificationUrl(notification);
    if (url) {
      onClose();
      router.push(url);
    }
  };

  const message = getNotificationMessage(notification);
  const formattedDate = formatDateTime(notification.createdAt);

  return (
    <div
      onClick={handleClick}
      className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      {/* 已讀/未讀圓點 */}
      <div
        className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
        style={{ backgroundColor: notification.read ? '#D9D9D9' : '#BAC7E5' }}
      />

      {/* 通知內容 */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium break-words leading-relaxed" style={{ color: '#5A5A5A' }}>{message}</p>
        <p className="text-sm mt-1.5" style={{ color: '#9CA3AF' }}>
          {formattedDate}
        </p>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNotificationMessage(notification: any): string {
  const actorName = notification.actor?.name || '某位用戶';
  const boardName = notification.board?.name || '某個板';

  switch (notification.type) {
    case 'post_like':
      return `${actorName} 對你的貼文按讚`;
    case 'post_comment': {
      const commentPreview = notification.comment?.content
        ? `: ${notification.comment.content.slice(0, 30)}${notification.comment.content.length > 30 ? '...' : ''}`
        : '';
      return `${actorName} 留言了貼文${commentPreview}`;
    }
    case 'post_repost':
      return `${actorName} 轉發了你的貼文`;
    case 'post_bookmark':
      return `${actorName} 收藏了你的貼文`;
    case 'comment_like':
      return `${actorName} 對你的留言按讚`;
    case 'comment_reply': {
      const replyPreview = notification.comment?.content
        ? `: ${notification.comment.content.slice(0, 30)}${notification.comment.content.length > 30 ? '...' : ''}`
        : '';
      return `${actorName} 回覆了貼文${replyPreview}`;
    }
    case 'board_new_post':
      return `${boardName} 有新貼文`;
    default:
      return '你有新通知';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNotificationUrl(notification: any): string | null {
  if (notification.type === 'comment_like' || notification.type === 'comment_reply') {
    // 跳轉到貼文並定位到留言
    const postId = notification.comment?.postId || notification.post?.id;
    if (postId && notification.comment?.id) {
      return `/social/posts/${postId}#comment-${notification.comment.id}`;
    }
  }

  if (notification.post?.id) {
    // 跳轉到貼文詳情頁
    return `/social/posts/${notification.post.id}`;
  }

  return null;
}
