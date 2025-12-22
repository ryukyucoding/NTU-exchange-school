'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RouteGuard from '@/components/auth/RouteGuard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MultiCountrySchoolSelect from '@/components/social/MultiCountrySchoolSelect';
import SimpleRichTextEditor from '@/components/social/SimpleRichTextEditor';
import HashtagInput from '@/components/social/HashtagInput';
import DraftList from '@/components/social/DraftList';
import RepostPreview from '@/components/social/RepostPreview';
import { useSchoolContext } from '@/contexts/SchoolContext';
import toast from 'react-hot-toast';

interface Draft {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'review';
  updatedAt: string;
  country?: string;
  schoolId?: string;
  hashtags?: string[];
}

function GeneralPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { schools } = useSchoolContext();
  const editPostId = searchParams.get('edit');
  const repostId = searchParams.get('repostId');
  // 如果有 return 參數就用它，否則記錄當前頁面（發文前的頁面）
  const returnUrl = searchParams.get('return') || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/social');

  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  const [currentUserName, setCurrentUserName] = useState<string>('userName');
  const [currentUserImage, setCurrentUserImage] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [loading, setLoading] = useState(!!editPostId);
  const [originalPost, setOriginalPost] = useState<any>(null);
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false);

  // 從 URL 參數預填國家/學校（只在非編輯模式下執行一次）
  useEffect(() => {
    // 如果是編輯模式，不讀取 URL 參數
    if (editPostId || hasInitializedFromUrl) return;
    
    // 等待 schools 載入完成
    if (schools.length === 0) return;
    
    const countryName = searchParams.get('countryName');
    const schoolId = searchParams.get('schoolId');
    
    if (countryName || schoolId) {
      const newCountries: string[] = [];
      const newSchoolIds: string[] = [];
      
      // 驗證並添加國家
      if (countryName) {
        // 檢查該國家是否存在於 schools 列表中
        const countryExists = schools.some(s => s.country === countryName);
        if (countryExists && !newCountries.includes(countryName)) {
          newCountries.push(countryName);
        }
      }
      
      // 驗證並添加學校
      if (schoolId) {
        const school = schools.find(s => String(s.id) === String(schoolId));
        if (school) {
          newSchoolIds.push(String(school.id));
          // 如果學校有國家資訊，也添加國家（如果還沒添加）
          if (school.country && !newCountries.includes(school.country)) {
            newCountries.push(school.country);
          }
        }
      }
      
      // 只在有有效值時才設置
      if (newCountries.length > 0 || newSchoolIds.length > 0) {
        if (newCountries.length > 0) {
          setSelectedCountries(newCountries);
        }
        if (newSchoolIds.length > 0) {
          setSelectedSchoolIds(newSchoolIds);
        }
      }
      
      setHasInitializedFromUrl(true);
    } else {
      setHasInitializedFromUrl(true);
    }
  }, [searchParams, schools, editPostId, hasInitializedFromUrl]);

  // 顯示最新頭貼/名字（不要只依賴 session）
  useEffect(() => {
    if (!session?.user) return;

    const sessionName = session.user?.name || 'userName';
    const sessionImage = session.user?.image || null;
    setCurrentUserName(sessionName);
    setCurrentUserImage(sessionImage);

    if (!sessionUserId) return;

    let cancelled = false;
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`/api/user/${sessionUserId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && data.user) {
          setCurrentUserName(data.user.name || data.user.userID || sessionName);
          setCurrentUserImage(data.user.image || sessionImage);
        }
      } catch (error) {
        console.error('Error fetching current user profile:', error);
      }
    };
    fetchCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [sessionUserId, session?.user]);

  // 載入要轉發的原貼文資料
  useEffect(() => {
    if (repostId) {
      const loadOriginalPost = async () => {
        try {
          const response = await fetch(`/api/posts/${repostId}`);
          const data = await response.json();
          if (data.success && data.post) {
            setOriginalPost(data.post);
          } else {
            toast.error('無法載入原貼文');
            router.push('/social');
          }
        } catch (error) {
          console.error('Error loading original post:', error);
          toast.error('載入失敗');
          router.push('/social');
        }
      };
      loadOriginalPost();
    }
  }, [repostId, router]);

  // 載入要編輯的貼文資料
  useEffect(() => {
    if (editPostId) {
      const loadPost = async () => {
        try {
          const response = await fetch(`/api/posts/${editPostId}`);
          const data = await response.json();
          if (data.success && data.post) {
            const post = data.post;
            // 檢查是否為作者
            const userId = session?.user ? (session.user as { id: string }).id : null;
            if (post.author.id !== userId) {
              toast.error('無權限編輯此貼文');
              router.push('/social');
              return;
            }
            setDraftId(post.id);
            setTitle(post.title || '');
            setContent(post.content || '');
            setHashtags(post.hashtags || []);
            setSelectedSchoolIds(post.schools?.map((s: { id: string }) => s.id) || []);
            setSelectedCountries(post.countries || []);
            // 如果是轉發貼文，載入原貼文
            if (post.repostId) {
              try {
                const repostResponse = await fetch(`/api/posts/${post.repostId}`);
                const repostData = await repostResponse.json();
                if (repostData.success && repostData.post) {
                  setOriginalPost(repostData.post);
                }
              } catch (error) {
                console.error('Error loading original post for repost:', error);
              }
            }
            // 編輯模式下，標記已初始化，避免 URL 參數覆蓋
            setHasInitializedFromUrl(true);
          } else {
            toast.error('無法載入貼文');
            router.push('/social');
          }
        } catch (error) {
          console.error('Error loading post:', error);
          toast.error('載入失敗');
          router.push('/social');
        } finally {
          setLoading(false);
        }
      };
      loadPost();
    } else {
      setLoading(false);
    }
  }, [editPostId, session, router]);

  const handleLoadDraft = (draft: Draft) => {
    setDraftId(draft.id);
    setTitle(draft.title || '');
    setContent(draft.content || '');
    setSelectedCountries(draft.country ? [draft.country] : []);
    setSelectedSchoolIds(draft.schoolId ? [draft.schoolId] : []);
    setHashtags(draft.hashtags || []);
    toast.success('草稿已載入');
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      // 根據選中的國家名稱，從 schools 中找到對應的 country_id
      const countryIds = selectedCountries
        .map(countryName => {
          const school = schools.find(s => s.country === countryName);
          return school?.country_id;
        })
        .filter((id): id is string => id !== null && id !== undefined);

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: draftId || undefined,
          title: title.trim() || '未命名草稿',
          content: content.trim() || '',
          status: 'draft',
          type: 'general',
          hashtags,
          schoolIds: selectedSchoolIds,
          countryIds: countryIds.length > 0 ? countryIds : undefined,
          countryNames: countryIds.length === 0 ? selectedCountries : undefined, // 向後兼容
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDraftId(data.post.id);
        toast.success('草稿已儲存');
      } else {
        toast.error(data.error || '儲存失敗');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('儲存失敗，請稍後再試');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const normalizeEditorText = (s: string) =>
    (s || '').replace(/\u200B/g, '').replace(/\u00A0/g, ' ').trim();

  const normalizedTitle = normalizeEditorText(title);
  const normalizedContent = normalizeEditorText(content);

  // 檢查是否符合發布條件（轉發可無內容，但一般貼文需有內容）
  const canPublish = Boolean(normalizedTitle) && (Boolean(repostId) || Boolean(normalizedContent));

  const handleSubmit = async () => {
    if (!normalizedTitle) {
      toast.error('請輸入標題');
      return;
    }
    // 轉發時可以不輸入內容，但必須有標題
    if (!repostId && !normalizedContent) {
      toast.error('請輸入內容');
      return;
    }

    setIsSubmitting(true);
    try {
      // 根據選中的國家名稱，從 schools 中找到對應的 country_id
      const countryIds = selectedCountries
        .map(countryName => {
          const school = schools.find(s => s.country === countryName);
          return school?.country_id;
        })
        .filter((id): id is string => id !== null && id !== undefined);

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: draftId || undefined,
          title: normalizedTitle,
          content: normalizedContent, // 確保內容與送出按鈕判斷一致，避免漏字/空白造成錯判
          status: 'published',
          type: 'general',
          hashtags,
          schoolIds: selectedSchoolIds,
          countryIds: countryIds.length > 0 ? countryIds : undefined,
          countryNames: countryIds.length === 0 ? selectedCountries : undefined, // 向後兼容
          repostId: repostId || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editPostId ? '貼文更新成功！' : '貼文發布成功！');
        // 無論是編輯還是發布，都帶上 return 參數
        router.push(`/social/posts/${data.post.id}?return=${encodeURIComponent(returnUrl)}`);
      } else {
        toast.error(data.error || '發布失敗');
      }
    } catch (error) {
      console.error('Error submitting post:', error);
      toast.error('發布失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#F4F4F4] flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-[#F4F4F4] overflow-hidden flex flex-col">
      {/* Topic pill - 固定在 header 内部居中 */}
      <div 
        className="fixed top-0 left-0 right-0 z-[51] flex justify-center items-center"
        style={{ 
          height: '64px',
          pointerEvents: 'none'
        }}
      >
        <div className="pointer-events-auto">
          <div
            className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-transparent border"
            style={{ 
              color: '#5A5A5A',
              borderColor: '#5A5A5A',
              borderRadius: '9999px'
            }}
          >
            發布貼文
          </div>
        </div>
      </div>

      {/* Content Frame */}
      <div className="max-w-[1400px] mx-auto px-2 pb-6 pt-4 flex-1 overflow-hidden">
        <div className="flex gap-6 items-start justify-center h-full">
          {/* Left Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0" />

          {/* Main Content - Scrollable */}
          <main className="w-[800px] flex-shrink-0 h-full overflow-y-auto overscroll-contain">
            <div className="w-full">

              {/* White Card Container */}
              <Card className="p-6 bg-white relative pt-8" style={{ borderColor: 'white', width: '800px' }}>
                {/* Left spacer for "+" button */}
                <div className="absolute left-0 top-0 bottom-0 w-12"></div>
                
                {/* Content wrapper with left and right margins */}
                <div className="ml-12 mr-12">
                {/* Title Section */}
                <div className="mb-6">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="輸入標題"
                    className="text-2xl font-bold border-0 p-0 focus-visible:ring-0 shadow-none placeholder:text-gray-400"
                    style={{ color: '#5A5A5A', fontSize: '24px' }}
                  />
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
                    {currentUserImage && (
                      <img
                        src={currentUserImage}
                        alt={currentUserName || 'userName'}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="text-sm" style={{ color: '#5A5A5A' }}>
                    <span className="font-semibold">{currentUserName || 'userName'}</span>
                    <span className="mx-2">·</span>
                    <span>{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                  </div>
                </div>

                {/* Country and School Selection */}
                <div className="mb-6">
                  <MultiCountrySchoolSelect
                    selectedCountries={selectedCountries}
                    selectedSchoolIds={selectedSchoolIds}
                    onCountriesChange={setSelectedCountries}
                    onSchoolIdsChange={setSelectedSchoolIds}
                    required={false}
                    schools={schools.map(s => ({
                      id: s.id,
                      name_zh: s.name_zh,
                      name_en: s.name_en,
                      country: s.country,
                    }))}
                  />
                </div>

                {/* Content Section */}
                <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #D9D9D9' }}>
                  {/* 轉發預覽框 - 顯示在輸入框上方 */}
                  {repostId && originalPost && (
                    <div className="mb-4">
                      <RepostPreview originalPost={originalPost} />
                    </div>
                  )}
                  {/* 輸入框 - 用戶可以在這裡輸入文字 */}
                  <SimpleRichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder={repostId ? "說點什麼..." : "輸入內容..."}
                  />
                </div>

                {/* Hashtag Section */}
                <div className="mb-6">
                  <HashtagInput hashtags={hashtags} onChange={setHashtags} />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3">
                  {editPostId ? (
                    <Button
                      onClick={() => {
                        if (!confirm('確定要捨棄變更嗎？')) return;
                        router.push(returnUrl);
                      }}
                      disabled={isSubmitting}
                      variant="outline"
                      style={{
                        borderColor: '#ef4444',
                        color: '#ef4444',
                        borderRadius: '9999px',
                        backgroundColor: 'transparent',
                      }}
                      className="hover:bg-gray-50"
                    >
                      捨棄變更
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft || isSubmitting}
                      variant="outline"
                      style={{
                        borderColor: '#5A5A5A',
                        color: '#5A5A5A',
                        borderRadius: '9999px',
                        backgroundColor: 'transparent',
                      }}
                      className="hover:bg-gray-50"
                    >
                      {isSavingDraft ? '儲存中...' : '儲存草稿'}
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isSavingDraft || !canPublish}
                    style={{
                      backgroundColor: canPublish ? '#BAC7E5' : '#BAC7E5',
                      color: canPublish ? '#5A5A5A' : 'white',
                      borderRadius: '9999px',
                    }}
                    className={canPublish ? "hover:bg-[#BAC7E5]/90" : ""}
                  >
                    {isSubmitting ? (editPostId ? '更新中...' : '發布中...') : (editPostId ? '更新貼文' : '發佈貼文')}
                  </Button>
                </div>
                </div>
              </Card>
            </div>
          </main>

          {/* Right Sidebar - Drafts */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <DraftList type="general" onLoadDraft={handleLoadDraft} />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function GeneralPostPage() {
  return (
    <RouteGuard>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">載入中...</div>}>
        <GeneralPostContent />
      </Suspense>
    </RouteGuard>
  );
}
