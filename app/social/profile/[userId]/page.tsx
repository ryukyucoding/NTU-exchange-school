'use client';

import { use, useEffect, useMemo, useState, useRef } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import SocialSidebar from '@/components/social/SocialSidebar';
import SocialBottomNav from '@/components/social/SocialBottomNav';
import PostList from '@/components/social/PostList';
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
  const userId = resolvedParams?.userId || '';
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(tabItems[0].key);
  const [profileName, setProfileName] = useState('');
  const [bio, setBio] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const isOwnProfile = !!session?.user?.id && session.user.id === userId;

  const displayName = useMemo(() => profileName || '', [profileName]);

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/user/${userId}`);
        const data = await res.json();
        if (!cancelled && data?.success && data.user) {
          setProfileName(data.user.name || data.user.userID || '');
          setBio(data.user.bio || '');
          setAvatarUrl(data.user.image || null);
          setBackgroundImageUrl(data.user.backgroundImage || null);
          setPostCount(data.user.postCount || 0);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (userId) fetchUser();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 压缩图片
  const compressImage = (file: File, maxSizeMB: number = 2): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 如果图片太大，先缩小尺寸（最大宽度或高度为1920px）
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('無法創建畫布'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // 尝试不同的质量，直到文件大小小于目标大小
          let quality = 0.9;
          const maxSizeBytes = maxSizeMB * 1024 * 1024;
          
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('壓縮失敗'));
                  return;
                }
                
                if (blob.size <= maxSizeBytes || quality <= 0.1) {
                  const compressedFile = new File(
                    [blob],
                    file.name.replace(/[/\\]/g, '_'),
                    { type: 'image/jpeg' }
                  );
                  resolve(compressedFile);
                } else {
                  quality -= 0.1;
                  tryCompress();
                }
              },
              'image/jpeg',
              quality
            );
          };
          
          tryCompress();
        };
        img.onerror = () => reject(new Error('無法載入圖片'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('讀取文件失敗'));
      reader.readAsDataURL(file);
    });
  };

  // 上传图片
  const handleImageUpload = async (file: File, type: 'avatar' | 'background') => {
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案');
      return;
    }

    if (type === 'avatar') {
      setUploadingAvatar(true);
    } else {
      setUploadingBackground(true);
    }

    try {
      // 压缩图片（目标大小 2MB）
      let fileToUpload = file;
      if (file.size > 2 * 1024 * 1024) {
        try {
          fileToUpload = await compressImage(file, 2);
        } catch (compressError) {
          console.error('圖片壓縮失敗:', compressError);
          alert('圖片壓縮失敗，請嘗試較小的圖片');
          if (type === 'avatar') {
            setUploadingAvatar(false);
          } else {
            setUploadingBackground(false);
          }
          return;
        }
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '上傳失敗' }));
        throw new Error(errorData.error || '上傳失敗');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '上傳失敗');
      }

      if (type === 'avatar') {
        setAvatarUrl(data.url);
      } else {
        setBackgroundImageUrl(data.url);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('上傳失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
    } finally {
      if (type === 'avatar') {
        setUploadingAvatar(false);
      } else {
        setUploadingBackground(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`/api/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileName,
          bio: bio,
          image: avatarUrl,
          backgroundImage: backgroundImageUrl,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setEditOpen(false);
        // 刷新页面数据
        const refreshRes = await fetch(`/api/user/${userId}`);
        const refreshData = await refreshRes.json();
        if (refreshData?.success && refreshData.user) {
          setProfileName(refreshData.user.name || refreshData.user.userID || '');
          setBio(refreshData.user.bio || '');
          setAvatarUrl(refreshData.user.image || null);
          setBackgroundImageUrl(refreshData.user.backgroundImage || null);
        }
      } else {
        console.error('Failed to update profile:', data.error);
        alert('更新失敗：' + (data.error || '未知錯誤'));
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('更新失敗，請稍後再試');
    }
  };

  if (loading) {
    return (
      <RouteGuard>
        <div className="min-h-screen" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (!displayName) {
    return (
      <RouteGuard>
        <div className="min-h-screen" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">找不到此用戶</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard>
      {/* AppShell 在 /social/profile/[id] 會加 pt-16，所以這裡用 (100vh - 64px) 鎖住整頁高度，避免 body 滾動 */}
      <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[#F4F4F4] max-md:bg-white">
        {displayName && (
          <div
            className="fixed left-0 right-0 z-[51] flex items-center justify-center bg-white md:top-0 md:h-16 md:bg-transparent max-md:top-16 max-md:h-12"
            style={{ pointerEvents: 'none' }}
          >
            <div className="pointer-events-auto flex items-center justify-center rounded-full border border-[#5A5A5A] bg-transparent px-4 py-1 max-md:bg-white">
              <h1
                className="text-sm font-semibold whitespace-nowrap"
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
        )}

        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 overflow-hidden bg-white px-0 pb-20 pt-12 md:bg-[#F4F4F4] md:px-2 md:pb-6 md:pt-4 lg:pb-6">
          <div className="flex h-full min-h-0 w-full items-stretch justify-center gap-6">
            <aside className="hidden shrink-0 md:block md:w-16 lg:w-64" aria-hidden />

            <main className="flex h-full min-h-0 w-full min-w-0 max-w-[800px] flex-1 flex-col bg-white pr-px max-md:overflow-y-auto md:max-w-[800px] md:bg-[#F4F4F4] md:pr-0">
              <div className="mx-auto mb-0 flex min-h-0 w-full min-w-0 max-w-[800px] max-md:min-h-full max-md:flex-1 flex-col max-md:overflow-y-auto md:mb-4 md:h-full md:flex-1 md:overflow-hidden md:rounded-xl md:bg-white md:shadow-sm">
              <div className="min-h-[60vh] flex-1 overflow-y-auto overscroll-contain max-md:min-h-full md:min-h-0">
              <div className="w-full max-w-[800px] overflow-hidden rounded-none border-0 bg-white text-card-foreground shadow-none md:rounded-none md:shadow-none">
                <div className="relative">
                  {backgroundImageUrl ? (
                    <div
                      className="h-40 bg-cover bg-center max-md:rounded-none md:h-44 md:rounded-t-xl"
                      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
                    />
                  ) : (
                    <div className="h-40 bg-[#BAC7E5] max-md:rounded-none md:h-44 md:rounded-t-xl" />
                  )}
                  <div className="absolute left-4 -bottom-10 max-md:left-4 md:left-10 md:-bottom-12">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="h-24 w-24 rounded-full border-4 border-white bg-gray-200 object-cover shadow md:h-28 md:w-28"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full border-4 border-white bg-gray-300 shadow md:h-28 md:w-28" />
                    )}
                  </div>
                </div>

                <div className="px-4 pb-6 pt-14 max-md:pt-12 md:px-10 md:pt-16">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
                    <div className="min-w-0 flex-1 md:max-w-[540px]">
                      <h1 className="text-2xl font-bold text-gray-800 md:text-4xl">{displayName}</h1>
                      <p className="mt-2 text-sm text-gray-500 md:text-base">{bio}</p>
                    </div>

                    <div className="flex flex-row flex-wrap items-end gap-4 text-gray-600 md:flex-shrink-0 md:flex-col md:items-end md:text-right">
                      <div>
                        <div className="whitespace-nowrap text-xs md:text-sm">貼文數</div>
                        <div className="text-lg font-semibold md:text-xl">{postCount}</div>
                      </div>
                      {isOwnProfile && (
                        <Button
                          onClick={() => setEditOpen(true)}
                          className="h-8 rounded-md px-3 text-xs font-medium transition-colors md:mt-1 md:h-auto md:px-4 md:py-2 md:text-sm"
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

                  <div
                    className="mt-6 flex gap-6 overflow-x-auto pl-0 md:mt-8 md:gap-12 md:pl-10"
                    style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
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
                    {activeTab === 'posts' && (
                      <PostList
                        filter="all"
                        authorId={userId}
                        sort="latest"
                        variant="plain"
                      />
                    )}
                    {activeTab === 'likes' && isOwnProfile && (
                      <PostList
                        filter="all"
                        sort="latest"
                        variant="plain"
                        liked={true}
                      />
                    )}
                    {activeTab === 'bookmarks' && isOwnProfile && (
                      <PostList
                        filter="all"
                        sort="latest"
                        variant="plain"
                        bookmarked={true}
                      />
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>
            </main>

            {/* Right sidebar (fixed, does NOT scroll) */}
            <aside className="hidden md:block md:w-60 lg:w-64 flex-shrink-0">
              <SocialSidebar />
            </aside>
          </div>
        </div>

        {/* Bottom Navigation - Only visible on screens smaller than lg */}
        <SocialBottomNav />
      </div>

      {/* Edit profile modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md bg-white border border-[#d6c3a1]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#4a3828]">
              編輯個人檔案
            </DialogTitle>
            <DialogDescription className="text-[#6b5b4c]">
              你可以修改頭貼、背景圖片、名稱與自我介紹。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 名稱 - 最上面 */}
            <div className="space-y-1">
              <div className="text-sm font-medium text-[#4a3828]">名稱</div>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-md border border-[#d6c3a1] px-3 py-2 text-sm"
                style={{ color: '#333333' }}
              />
            </div>

            {/* 頭貼 */}
            <div className="space-y-1">
              <div className="text-sm font-medium text-[#4a3828]">頭貼</div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file, 'avatar');
                  }
                }}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt="頭貼預覽"
                    className="w-16 h-16 rounded-full object-cover border border-[#d6c3a1]"
                  />
                )}
                <div className="flex-1" />
                <Button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="text-sm"
                  style={{ backgroundColor: '#8D7051', color: 'white', border: 'none' }}
                >
                  {uploadingAvatar ? '上傳中...' : '選擇圖片'}
                </Button>
              </div>
            </div>

            {/* 背景圖片 */}
            <div className="space-y-1">
              <div className="text-sm font-medium text-[#4a3828]">背景圖片</div>
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file, 'background');
                  }
                }}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                {backgroundImageUrl && (
                  <img
                    src={backgroundImageUrl}
                    alt="背景預覽"
                    className="w-32 h-16 object-cover rounded border border-[#d6c3a1]"
                  />
                )}
                <div className="flex-1" />
                <Button
                  type="button"
                  onClick={() => backgroundInputRef.current?.click()}
                  disabled={uploadingBackground}
                  className="text-sm"
                  style={{ backgroundColor: '#8D7051', color: 'white', border: 'none' }}
                >
                  {uploadingBackground ? '上傳中...' : '選擇圖片'}
                </Button>
              </div>
            </div>

            {/* 自我介紹 */}
            <div className="space-y-1">
              <div className="text-sm font-medium text-[#4a3828]">自我介紹</div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full min-h-[96px] rounded-md border border-[#d6c3a1] px-3 py-2 text-sm"
                style={{ color: '#333333' }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                style={{
                  backgroundColor: '#f7efe5',
                  color: '#8D7051',
                  borderColor: '#d6c3a1',
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSaveProfile}
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

