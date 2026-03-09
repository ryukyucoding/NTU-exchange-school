'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface Board {
  id: string;
  name: string;
  slug: string;
  type: string;
  schoolId?: string;
  country_id?: string;
}

interface UseBoardsReturn {
  followedBoards: Board[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBoards(): UseBoardsReturn {
  const { data: session } = useSession();
  // 用穩定的字串 ID 取代 session 物件，避免 NextAuth refetchOnWindowFocus
  // 造成 session reference 改變而觸發不必要的重新載入
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  const [followedBoards, setFollowedBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFollowedBoards = async () => {
    if (!sessionUserId) {
      setLoading(false);
      setFollowedBoards([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/boards/followed');
      const data = await response.json();

      if (data.success) {
        setFollowedBoards(data.boards || []);
      }
    } catch (err) {
      console.error('Error fetching followed boards:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err : new Error('Failed to fetch boards'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowedBoards();

    // 監聽追蹤狀態變化事件
    const handleBoardFollowChanged = () => {
      fetchFollowedBoards();
    };

    window.addEventListener('boardFollowChanged', handleBoardFollowChanged);

    return () => {
      window.removeEventListener('boardFollowChanged', handleBoardFollowChanged);
    };
  }, [sessionUserId]);

  return {
    followedBoards,
    loading,
    error,
    refetch: fetchFollowedBoards,
  };
}
