'use client';

import { use, useEffect, useMemo, useState } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import SocialSidebar from '@/components/social/SocialSidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';

const tabItems = [
  { key: 'posts', label: '我的貼文' },
  { key: 'likes', label: '按讚' },
  { key: 'bookmarks', label: '收藏' },
];

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams?.userId || 'UserName';
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(tabItems[0].key);
  const [profileName, setProfileName] = useState('UserName');
  const [bio, setBio] = useState('哈囉你好嗎，衷心感謝。');
  const [editOpen, setEditOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const isOwnProfile = !!session?.user?.id && session.user.id === userId;

  const displayName = useMemo(() => profileName, [profileName]);

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/user/${userId}`);
        const data = await res.json();
        if (!cancelled && data?.success && data.user) {
          setProfileName(data.user.name || data.user.userID || 'UserName');
          setAvatarUrl(data.user.image || null);
        } else if (!cancelled) {
          // fallback to a readable string if user not found
          setProfileName(userId.replace(/-/g, ' '));
        }
      } catch {
        if (!cancelled) setProfileName(userId.replace(/-/g, ' '));
      }
    };
    if (userId) fetchUser();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <RouteGuard>
      <div className="min-h-screen" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
        {/* Topic Frame */}
        <div className="sticky top-16 z-40 py-4 border-b border-transparent">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-center">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '140px',
                  height: '32px',
                  border: '1px solid #5A5A5A',
                  borderRadius: '24px',
                  boxSizing: 'border-box',
                  background: 'transparent',
                }}
              >
                <h1
                  className="text-sm font-semibold"
                  style={{
                    color: '#5A5A5A',
                    fontSize: '14px',
                    lineHeight: '20px',
                    fontFamily: "'Noto Sans TC', sans-serif",
                  }}
                >
                  {displayName}
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-6 pt-4">
          <div className="flex gap-6 items-start justify-center">
            {/* Left spacer (match boards layout) */}
            <aside className="hidden md:block w-64 flex-shrink-0" />

            <main
              className="w-[800px] flex-shrink-0"
              style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}
            >
              <div className="rounded-xl bg-white text-card-foreground border-0 shadow-none overflow-hidden mb-4">
                <div className="relative">
                  <div className="h-44 bg-[#BAC7E5] rounded-t-xl" />
                  {/* avatar overlaps cover */}
                  <div className="absolute left-10 -bottom-12">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="w-28 h-28 rounded-full border-4 border-white shadow object-cover bg-gray-200"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-gray-300 border-4 border-white shadow" />
                    )}
                  </div>
                </div>

                <div className="pt-16 px-10 pb-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <h1 className="text-4xl font-bold text-gray-800">{displayName}</h1>
                      <p className="text-gray-500 mt-2">{bio}</p>
                    </div>

                    <div className="text-right text-gray-600">
                      <div className="text-sm">貼文數</div>
                      <div className="text-xl font-semibold">23</div>
                      {isOwnProfile && (
                        <Button
                          onClick={() => setEditOpen(true)}
                          className="mt-3 px-4 py-2 text-sm font-medium rounded-md transition-colors"
                          style={{
                            backgroundColor: '#8D7051',
                            color: 'white',
                            border: 'none',
                          }}
                        >
                          編輯個人檔案
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tabs (text only) */}
                  <div
                    className="mt-8 flex gap-12"
                    style={{ fontFamily: "'Noto Sans TC', sans-serif", paddingLeft: '40px' }}
                  >
                    <button
                      onClick={() => setActiveTab('posts')}
                      className="text-sm font-semibold"
                      style={{ color: activeTab === 'posts' ? '#5A5A5A' : '#A6A6A6' }}
                      type="button"
                    >
                      {isOwnProfile ? '我的貼文' : '貼文'}
                    </button>
                    {isOwnProfile && (
                      <>
                        <button
                          onClick={() => setActiveTab('likes')}
                          className="text-sm font-semibold"
                          style={{ color: activeTab === 'likes' ? '#5A5A5A' : '#A6A6A6' }}
                          type="button"
                        >
                          按讚
                        </button>
                        <button
                          onClick={() => setActiveTab('bookmarks')}
                          className="text-sm font-semibold"
                          style={{ color: activeTab === 'bookmarks' ? '#5A5A5A' : '#A6A6A6' }}
                          type="button"
                        >
                          收藏
                        </button>
                      </>
                    )}
                  </div>
                  <div className="mt-3 border-b" style={{ borderColor: '#D9D9D9', width: '100%' }} />

                  {/* Posts content (continuous with the same white block) */}
                  <div className="mt-6">
                    <div className="text-gray-400 text-sm mb-4">
                      {activeTab === 'posts' && '顯示此帳號的貼文'}
                      {activeTab === 'likes' && isOwnProfile && '顯示此帳號按讚的貼文'}
                      {activeTab === 'bookmarks' && isOwnProfile && '顯示此帳號收藏的貼文'}
                    </div>
                    <div className="text-sm text-gray-500">目前尚無貼文顯示。</div>
                  </div>
                </div>
              </div>
            </main>

            {/* Right sidebar (match boards layout) */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky" style={{ top: '6rem' }}>
                <SocialSidebar />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Edit profile modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md bg-white border border-[#d6c3a1]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#4a3828]">
              編輯個人檔案
            </DialogTitle>
            <DialogDescription className="text-[#6b5b4c]">
              你可以修改頭貼、背景圖片、名稱與自我介紹（目前為前端預覽，不會寫入資料庫）。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-[#4a3828]">背景圖片</div>
              <input type="file" accept="image/*" className="w-full text-sm" />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-[#4a3828]">頭貼</div>
              <input type="file" accept="image/*" className="w-full text-sm" />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-[#4a3828]">名稱</div>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-md border border-[#d6c3a1] px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-[#4a3828]">自我介紹</div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full min-h-[96px] rounded-md border border-[#d6c3a1] px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button
                onClick={() => setEditOpen(false)}
                style={{ backgroundColor: '#8D7051', color: 'white' }}
              >
                儲存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </RouteGuard>
  );
}

