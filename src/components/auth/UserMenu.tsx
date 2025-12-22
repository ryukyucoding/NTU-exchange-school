'use client';

import { useState, useEffect, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { User, LogOut, Settings } from 'lucide-react';
import LoginModal from './LoginModal';
import NotificationButton from './NotificationButton';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const isSocialPage = pathname === '/social' || pathname?.startsWith('/social/');

  // 从数据库加载用户数据 - 必须在所有条件返回之前
  useEffect(() => {
    if (session?.user?.id) {
      const userId = session.user.id;
      const sessionName = session.user.name || '';
      const sessionImage = session.user.image || null;
      
      const fetchUserData = async () => {
        try {
          const res = await fetch(`/api/user/${userId}`);
          const data = await res.json();
          if (data?.success && data.user) {
            setUserName(data.user.name || data.user.userID || sessionName);
            setUserImage(data.user.image || sessionImage);
            setBio(data.user.bio || '');
            setBackgroundImageUrl(data.user.backgroundImage || null);
          } else {
            // Fallback to session data
            setUserName(sessionName);
            setUserImage(sessionImage);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          // Fallback to session data
          setUserName(sessionName);
          setUserImage(sessionImage);
        }
      };
      fetchUserData();
    }
  }, [session]);

  // 条件渲染必须在所有 hooks 之后
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
      </div>
    );
  }

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
        setUserImage(data.url);
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
    if (!session?.user?.id) return;
    
    try {
      const res = await fetch(`/api/user/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          bio: bio,
          image: userImage,
          backgroundImage: backgroundImageUrl,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setShowSettingsDialog(false);
        // 刷新用户数据
        const refreshRes = await fetch(`/api/user/${session.user.id}`);
        const refreshData = await refreshRes.json();
        if (refreshData?.success && refreshData.user) {
          setUserName(refreshData.user.name || refreshData.user.userID || '');
          setUserImage(refreshData.user.image || null);
          setBio(refreshData.user.bio || '');
          setBackgroundImageUrl(refreshData.user.backgroundImage || null);
        }
        // 刷新页面以更新头像显示
        window.location.reload();
      } else {
        console.error('Failed to update profile:', data.error);
        alert('更新失敗：' + (data.error || '未知錯誤'));
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('更新失敗，請稍後再試');
    }
  };

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

  const displayImage = userImage || session.user?.image;
  const displayName = userName || session.user?.name || 'User';

  return (
    <>
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
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#b08a63] flex items-center justify-center text-white font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-[#d6c3a1]">
            <DropdownMenuLabel className="text-[#4a3828]">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-[#6b5b4c]">{session.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-[#4a3828] hover:bg-[#f7efe5] cursor-pointer"
              onClick={() => setShowSettingsDialog(true)}
            >
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

      {/* 帳戶設定對話框 */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
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
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
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
                {userImage && (
                  <img
                    src={userImage}
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
                onClick={() => setShowSettingsDialog(false)}
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
    </>
  );
}
