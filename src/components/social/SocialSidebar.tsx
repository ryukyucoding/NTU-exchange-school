'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, LayoutGrid, User } from 'lucide-react';
import PostTypeDialog from './PostTypeDialog';
import { useBoards } from '@/hooks/useBoards';
import { usePopularTags } from '@/hooks/usePopularTags';

function PostButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (dialogOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [dialogOpen]);

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={() => setDialogOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-tour-step="social-post"
        style={{
          borderRadius: '9999px',
          backgroundColor: isHovered ? 'rgba(186, 199, 229, 0.9)' : '#BAC7E5',
          color: '#333333',
          boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
          paddingTop: '16px',
          paddingBottom: '16px',
          fontSize: '16px',
          letterSpacing: '0.05em',
          border: isHovered ? '2px solid #8D7051' : '2px solid transparent',
          transition: 'all 0.2s ease',
        }}
        className="w-full"
      >
        <Plus className="w-5 h-5 mr-2" />
        發佈貼文
      </Button>
      <PostTypeDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        position={buttonPosition}
      />
    </>
  );
}

export default function SocialSidebar() {
  const { data: session } = useSession();

  // 使用自定義 hooks 來管理資料
  const { followedBoards, loading } = useBoards();
  const { tags: popularTags, loading: tagsLoading } = usePopularTags();

  return (
    <div className="w-64 flex flex-col gap-4 h-full">
      {/* Navigation */}
      <Card className="p-4 bg-white border-0 shadow-none">
        <nav className="flex flex-col gap-2">
          <Link href="/social/boards" data-tour-step="social-boards">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-700"
            >
              <LayoutGrid className="w-5 h-5 mr-2 text-gray-600" />
              所有看板
            </Button>
          </Link>
          <Link href={`/social/profile/${(session?.user as { id?: string })?.id || ''}`}>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-700"
            >
              <User className="w-5 h-5 mr-2 text-gray-600" />
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
                    ? `/social/boards/school/${board.schoolId}`
                    : board.country_id
                    ? `/social/boards/country/${board.country_id}`
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

      {/* Popular Topics */}
      <Card className="p-4 bg-white border-0 shadow-none">
        <h3 className="font-semibold mb-3 text-gray-800">熱門話題</h3>
        {tagsLoading ? (
          <div className="text-sm text-gray-400">載入中...</div>
        ) : popularTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Link
                key={tag}
                href={`/social?hashtag=${encodeURIComponent(tag)}`}
                className="px-3 py-1 text-sm rounded-full border border-[#d6c3a1] bg-[#f7efe5] text-[#8D7051] hover:bg-[#f0e6d6] transition-colors whitespace-nowrap"
              >
                #{tag}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">尚無熱門話題</div>
        )}
      </Card>

      {/* Post Button */}
      <PostButton />
    </div>
  );
}

