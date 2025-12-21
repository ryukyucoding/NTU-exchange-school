'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import PostTypeDialog from './PostTypeDialog';

function PostButton() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        style={{
          borderRadius: '9999px',
          backgroundColor: '#BAC7E5',
          color: 'white',
        }}
        className="w-full hover:bg-[#BAC7E5]/90 border-0 shadow-none"
      >
        <Plus className="w-4 h-4 mr-2" />
        發佈貼文
      </Button>
      <PostTypeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

interface Board {
  id: string;
  name: string;
  slug: string;
  type: string;
  schoolId?: string;
  country_id?: string;
}

export default function SocialSidebar() {
  const { data: session } = useSession();
  const [followedBoards, setFollowedBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowedBoards = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/boards/followed');
        const data = await response.json();
        
        if (data.success) {
          setFollowedBoards(data.boards || []);
        }
      } catch (error) {
        console.error('Error fetching followed boards:', error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };

    fetchFollowedBoards();

    // 監聽追蹤狀態變化事件
    const handleBoardFollowChanged = () => {
      fetchFollowedBoards();
    };

    window.addEventListener('boardFollowChanged', handleBoardFollowChanged);

    return () => {
      window.removeEventListener('boardFollowChanged', handleBoardFollowChanged);
    };
  }, [session]);

  return (
    <div className="w-64 flex flex-col gap-4 h-full">
      {/* Navigation */}
      <Card className="p-4 bg-white border-0 shadow-none">
        <nav className="flex flex-col gap-2">
          <Link href="/social/boards">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-700"
            >
              <div className="w-6 h-6 rounded-full bg-gray-300 mr-2"></div>
              所有看板
            </Button>
          </Link>
          <Link href={`/social/profile/${(session?.user as { id?: string })?.id || ''}`}>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-700"
            >
              <div className="w-6 h-6 rounded-full bg-gray-300 mr-2"></div>
              個人頁面
            </Button>
          </Link>
        </nav>
      </Card>

      {/* Followed Boards */}
      <Card className="p-4 bg-white border-0 shadow-none">
        <h3 className="font-semibold mb-3 text-gray-800">追蹤的看板</h3>
        {loading ? (
          <div className="text-sm text-gray-400">載入中...</div>
        ) : followedBoards.length > 0 ? (
          <div className="space-y-2">
            {followedBoards.map((board) => (
              <Link
                key={board.id}
                href={
                  board.type === 'school' && board.schoolId
                    ? `/social/boards/school/${board.schoolId.toString()}`
                    : board.country_id
                    ? `/social/boards/country/${board.country_id.toString()}`
                    : '#'
                }
                className="block text-sm text-gray-600 hover:text-gray-800"
              >
                {board.name}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">尚無追蹤中看板</div>
        )}
      </Card>

      {/* Post Button */}
      <PostButton />
    </div>
  );
}

