'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
import UnsavedChangesDialog from '@/components/social/UnsavedChangesDialog';
import SocialBottomNav from '@/components/social/SocialBottomNav';
import { useSchoolContext } from '@/contexts/SchoolContext';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';

interface Draft {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'review';
  updatedAt: string;
  country?: string;
  schoolId?: string;
  hashtags?: string[];
  repostId?: string;
  schools?: { id: string; name_zh: string; name_en: string; country: string }[];
  countries?: string[];
}

function GeneralPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { schools } = useSchoolContext();
  const editPostId = searchParams.get('edit');
  const repostId = searchParams.get('repostId');
  // 編輯時：如果有 return 參數就用它（這是編輯前的頁面）
  // 發布/轉發時：如果有 return 參數就用它，否則預設為 /social（社群主頁）
  const returnUrl = searchParams.get('return') || '/social';

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
  const [currentRepostId, setCurrentRepostId] = useState<string | null>(repostId);
  
  // 未儲存變更檢測
  const [initialValues, setInitialValues] = useState<{
    title: string;
    content: string;
    selectedCountries: string[];
    selectedSchoolIds: string[];
    hashtags: string[];
    repostId: string | null;
  } | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [pendingDraftLoad, setPendingDraftLoad] = useState<Draft | null>(null);
  const [entryPage, setEntryPage] = useState<string | null>(null); // 記錄進入發布貼文頁面的上一頁
  const hasPushedHistoryRef = useRef(false);

  // 記錄進入發布貼文頁面的上一頁
  useEffect(() => {
    if (typeof window !== 'undefined' && !entryPage) {
      // 優先使用 URL 參數中的 return，如果沒有則使用 document.referrer 或 sessionStorage
      const returnParam = searchParams.get('return');
      if (returnParam) {
        setEntryPage(returnParam);
        sessionStorage.setItem('postPageReferrer', returnParam);
      } else if (!editPostId) {
        // 只有在非編輯模式下才記錄 referrer（編輯模式應該使用 return 參數）
        // SPA 導航時 document.referrer 可能為空，因此優先使用全域追蹤的 lastUrl
        const referrer =
          sessionStorage.getItem('lastUrl') ||
          document.referrer ||
          sessionStorage.getItem('postPageReferrer') ||
          '/social';
        setEntryPage(referrer);
        sessionStorage.setItem('postPageReferrer', referrer);
      } else {
        // 編輯模式下，如果沒有 return 參數，使用 sessionStorage 或默認值
        const storedReferrer =
          sessionStorage.getItem('lastUrl') ||
          sessionStorage.getItem('postPageReferrer') ||
          '/social';
        setEntryPage(storedReferrer);
      }
    }
  }, [entryPage, editPostId, searchParams]);

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
        // 更新初始值，包含預填的值
        setInitialValues({
          title: '',
          content: '',
          selectedCountries: newCountries,
          selectedSchoolIds: newSchoolIds,
          hashtags: [],
          repostId: repostId || null,
        });
      } else {
        // 如果沒有預填值，設置空初始值
        setInitialValues({
          title: '',
          content: '',
          selectedCountries: [],
          selectedSchoolIds: [],
          hashtags: [],
          repostId: repostId || null,
        });
      }
      
      setHasInitializedFromUrl(true);
    } else {
      setHasInitializedFromUrl(true);
      // 如果沒有 URL 參數，設置空初始值
      if (!initialValues) {
        setInitialValues({
          title: '',
          content: '',
          selectedCountries: [],
          selectedSchoolIds: [],
          hashtags: [],
          repostId: repostId || null,
        });
      }
    }
  }, [searchParams, schools, editPostId, hasInitializedFromUrl, repostId]);

  // 顯示最新頭貼/名字（不要只依賴 session）
  useEffect(() => {
    if (!session?.user) return;
    if (!sessionUserId) return;

    let cancelled = false;
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`/api/user/${sessionUserId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && data.user) {
          // 只使用 API 返回的数据，不使用 session 数据
          setCurrentUserName(data.user.name || data.user.userID || 'userName');
          setCurrentUserImage(data.user.image || null);
        } else {
          // 如果 API 失败，才使用 session 作为 fallback
          setCurrentUserName(session.user?.name || 'userName');
          setCurrentUserImage(session.user?.image || null);
        }
      } catch (error) {
        console.error('Error fetching current user profile:', error);
        // API 失败时使用 session 作为 fallback
        setCurrentUserName(session.user?.name || 'userName');
        setCurrentUserImage(session.user?.image || null);
      }
    };
    fetchCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

  // 載入要轉發的原貼文資料（從 URL 參數或編輯的貼文中）
  useEffect(() => {
    const repostIdToLoad = currentRepostId || repostId;
    if (repostIdToLoad) {
      const loadOriginalPost = async () => {
        try {
          const response = await fetch(`/api/posts/${repostIdToLoad}`);
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
  }, [currentRepostId, repostId, router]);

  // 載入要編輯的貼文資料
  useEffect(() => {
    if (editPostId) {
      const loadPost = async () => {
        try {
          console.log('[GeneralPostPage] 開始載入編輯貼文:', { editPostId });
          const response = await fetch(`/api/posts/${editPostId}`);
          const data = await response.json();
          console.log('[GeneralPostPage] API 回應:', {
            success: data.success,
            hasPost: !!data.post,
            hasBoards: !!(data.post?.boards && Array.isArray(data.post.boards) && data.post.boards.length > 0),
            boards: data.post?.boards,
            postData: data.post ? {
              id: data.post.id,
              title: data.post.title,
              schools: data.post.schools,
              countries: data.post.countries,
              hashtags: data.post.hashtags,
            } : null,
          });
          if (data.success && data.post) {
            const post = data.post;
            // 檢查是否為作者
            const userId = sessionUserId ?? null;
            if (post.author.id !== userId) {
              toast.error('無權限編輯此貼文');
              router.push('/social');
              return;
            }
            setDraftId(post.id);
            setTitle(post.title || '');
            setContent(post.content || '');
            setHashtags(post.hashtags || []);
            
            // 從 PostBoard -> Board 獲取版信息，根據 type 設置國家和學校
            let schoolIds: string[] = [];
            let countries: string[] = [];
            
            if (post.boards && Array.isArray(post.boards) && post.boards.length > 0) {
              // 根據 Board 的 type 來設置
              post.boards.forEach((board: { name: string; type: 'country' | 'school'; schoolId?: string | null }) => {
                if (board.type === 'country') {
                  // type 是 country，把 name 放到國家欄位
                  if (!countries.includes(board.name)) {
                    countries.push(board.name);
                  }
                } else if (board.type === 'school') {
                  // type 是 school，根據 schoolId 或 name 找到對應的學校
                  if (board.schoolId) {
                    // 優先使用 schoolId，轉換為字符串（因為 schools 的 id 是 string）
                    const schoolIdStr = String(board.schoolId);
                    if (!schoolIds.includes(schoolIdStr)) {
                      schoolIds.push(schoolIdStr);
                    }
                    // 同時從 schools 中找到對應的國家
                    const school = schools.find(s => s.id === schoolIdStr);
                    if (school && school.country && !countries.includes(school.country)) {
                      countries.push(school.country);
                    }
                  } else {
                    // 如果沒有 schoolId，嘗試根據 name 找到學校
                    const school = schools.find(s => 
                      s.name_zh === board.name || s.name_en === board.name
                    );
                    if (school) {
                      if (!schoolIds.includes(school.id)) {
                        schoolIds.push(school.id);
                      }
                      if (school.country && !countries.includes(school.country)) {
                        countries.push(school.country);
                      }
                    }
                  }
                }
              });
            } else {
              // 如果沒有 boards 信息，使用舊的方式（向後兼容）
              schoolIds = post.schools?.map((s: { id: string }) => s.id) || [];
              countries = post.countries || [];
            }
            
            console.log('[GeneralPostPage] 設置學校和國家:', {
              schoolIds,
              countries,
              boards: post.boards,
              schoolsData: post.schools,
              countriesData: post.countries,
            });
            setSelectedSchoolIds(schoolIds);
            setSelectedCountries(countries);
            // 如果是轉發貼文，設置 repostId 以便載入原貼文
            if (post.repostId) {
              setCurrentRepostId(post.repostId);
            }
            // 設置初始值用於變更檢測
            setInitialValues({
              title: post.title || '',
              content: post.content || '',
              selectedCountries: countries,
              selectedSchoolIds: schoolIds,
              hashtags: post.hashtags || [],
              repostId: post.repostId || null,
            });
            // 編輯模式下，標記已初始化，避免 URL 參數覆蓋
            setHasInitializedFromUrl(true);
          } else {
            toast.error('無法載入貼文');
            router.push('/social');
          }
        } catch (error) {
          console.error('[GeneralPostPage] Error loading post:', error);
          toast.error('載入失敗');
          router.push('/social');
        } finally {
          setLoading(false);
        }
      };
      loadPost();
    } else {
      setLoading(false);
      // 非編輯模式下，初始值會在 URL 參數預填的 useEffect 中設置
      // 這裡不設置，避免覆蓋 URL 參數預填的值
    }
  }, [editPostId, sessionUserId, router, schools, repostId]);

  // 檢測是否有未儲存的變更
  const normalizeEditorText = (s: string) =>
    (s || '').replace(/\u200B/g, '').replace(/\u00A0/g, ' ').trim();

  const hasUnsavedChanges = () => {
    if (!initialValues) return false;
    
    const normalizedTitle = normalizeEditorText(title);
    const normalizedContent = normalizeEditorText(content);
    const normalizedInitialTitle = normalizeEditorText(initialValues.title);
    const normalizedInitialContent = normalizeEditorText(initialValues.content);
    
    return (
      normalizedTitle !== normalizedInitialTitle ||
      normalizedContent !== normalizedInitialContent ||
      JSON.stringify(selectedCountries.sort()) !== JSON.stringify(initialValues.selectedCountries.sort()) ||
      JSON.stringify(selectedSchoolIds.sort()) !== JSON.stringify(initialValues.selectedSchoolIds.sort()) ||
      JSON.stringify(hashtags.sort()) !== JSON.stringify(initialValues.hashtags.sort()) ||
      (currentRepostId || repostId) !== initialValues.repostId
    );
  };

  // 攔截瀏覽器關閉/刷新
  useEffect(() => {
    if (!initialValues || allowNavigation) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [initialValues, allowNavigation, title, content, selectedCountries, selectedSchoolIds, hashtags, currentRepostId, repostId]);

  // 攔截瀏覽器返回按鈕
  useEffect(() => {
    if (!initialValues || allowNavigation) return;

    const currentUrl = window.location.pathname + window.location.search;
    const targetUrl = entryPage || returnUrl;
    const safeTargetUrl = targetUrl && targetUrl !== currentUrl ? targetUrl : '/social';

    // 檢查是否有未儲存變更（每次進入「未儲存狀態」只 pushState 一次，避免歷史堆疊）
    const hasChangesNow = hasUnsavedChanges();
    if (hasChangesNow && !hasPushedHistoryRef.current) {
      window.history.pushState({ __editor_guard: true }, '', window.location.href);
      hasPushedHistoryRef.current = true;
    }
    if (!hasChangesNow) {
      hasPushedHistoryRef.current = false;
    }

    const handlePopState = (e: PopStateEvent) => {
      // 再次檢查是否有變更（因為狀態可能已經改變）
      if (hasUnsavedChanges()) {
        e.preventDefault();
        // 使用 entryPage（進入發布貼文頁面的上一頁）作為返回目標
        setPendingNavigation(safeTargetUrl);
        setShowUnsavedDialog(true);
        // 推回當前狀態
        window.history.pushState({ __editor_guard: true }, '', window.location.href);
        hasPushedHistoryRef.current = true;
      } else {
        // 沒有未儲存變更：確保能離開編輯頁，回到進入編輯前的頁面
        setAllowNavigation(true);
        router.replace(safeTargetUrl);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initialValues, allowNavigation, returnUrl, entryPage, title, content, selectedCountries, selectedSchoolIds, hashtags, currentRepostId, repostId, router]);

  const handleLoadDraft = async (draft: Draft) => {
    // 檢查是否有未儲存的變更
    if (hasUnsavedChanges()) {
      // 如果有變更，先詢問是否要儲存
      setPendingDraftLoad(draft);
      setShowUnsavedDialog(true);
      return;
    }
    
    // 如果沒有變更，直接載入草稿
    await loadDraftInternal(draft);
  };

  const loadDraftInternal = async (draft: Draft) => {
    console.log('[GeneralPostPage] 開始載入草稿:', {
      draftId: draft.id,
      draftTitle: draft.title,
      draftSchools: draft.schools,
      draftCountries: draft.countries,
      draftSchoolId: draft.schoolId,
      draftCountry: draft.country,
      draftHashtags: draft.hashtags,
    });
    setDraftId(draft.id);
    setTitle(draft.title || '');
    setContent(draft.content || '');
    
    // 嘗試從 PostBoard 獲取 Board 信息
    let schoolIds: string[] = [];
    let countries: string[] = [];
    let draftRepostId: string | null = null;
    
    try {
      const response = await fetch(`/api/posts/${draft.id}`);
      const data = await response.json();
      // 獲取 repostId（優先使用 API 返回的，如果沒有則使用 draft.repostId）
      if (data.success && data.post) {
        draftRepostId = data.post.repostId || draft.repostId || null;
      } else {
        draftRepostId = draft.repostId || null;
      }
      
      if (data.success && data.post && data.post.boards && Array.isArray(data.post.boards) && data.post.boards.length > 0) {
        // 使用 Board 信息
        data.post.boards.forEach((board: { name: string; type: 'country' | 'school'; schoolId?: string | null }) => {
          if (board.type === 'country') {
            if (!countries.includes(board.name)) {
              countries.push(board.name);
            }
          } else if (board.type === 'school') {
            if (board.schoolId) {
              // 轉換為字符串（因為 schools 的 id 是 string）
              const schoolIdStr = String(board.schoolId);
              if (!schoolIds.includes(schoolIdStr)) {
                schoolIds.push(schoolIdStr);
              }
              const school = schools.find(s => s.id === schoolIdStr);
              if (school && school.country && !countries.includes(school.country)) {
                countries.push(school.country);
              }
            } else {
              const school = schools.find(s => 
                s.name_zh === board.name || s.name_en === board.name
              );
              if (school) {
                if (!schoolIds.includes(school.id)) {
                  schoolIds.push(school.id);
                }
                if (school.country && !countries.includes(school.country)) {
                  countries.push(school.country);
                }
              }
            }
          }
        });
        console.log('[GeneralPostPage] 從 Board 設置草稿的學校和國家:', {
          schoolIds,
          countries,
          boards: data.post.boards,
        });
      } else {
        // 如果沒有 Board 信息，使用舊的方式
        if (draft.schools && draft.schools.length > 0) {
          schoolIds = draft.schools.map(s => s.id);
          if (draft.countries && draft.countries.length > 0) {
            countries = draft.countries;
          } else {
            const countriesFromSchools = draft.schools.map(s => s.country).filter(Boolean);
            countries = [...new Set(countriesFromSchools)];
          }
        } else if (draft.schoolId) {
          schoolIds = [draft.schoolId];
          countries = draft.country ? [draft.country] : [];
        } else {
          schoolIds = [];
          if (draft.countries && draft.countries.length > 0) {
            countries = draft.countries;
          } else {
            countries = draft.country ? [draft.country] : [];
          }
        }
        console.log('[GeneralPostPage] 設置草稿的學校和國家（舊方式）:', {
          schoolIds,
          countries,
          source: draft.schools ? 'schools array' : draft.schoolId ? 'schoolId' : 'countries/country',
        });
      }
    } catch (error) {
      console.error('[GeneralPostPage] Error loading draft boards:', error);
      // 如果獲取失敗，使用舊的方式
      if (draft.schools && draft.schools.length > 0) {
        schoolIds = draft.schools.map(s => s.id);
        if (draft.countries && draft.countries.length > 0) {
          countries = draft.countries;
        } else {
          const countriesFromSchools = draft.schools.map(s => s.country).filter(Boolean);
          countries = [...new Set(countriesFromSchools)];
        }
      } else if (draft.schoolId) {
        schoolIds = [draft.schoolId];
        countries = draft.country ? [draft.country] : [];
      } else {
        schoolIds = [];
        if (draft.countries && draft.countries.length > 0) {
          countries = draft.countries;
        } else {
          countries = draft.country ? [draft.country] : [];
        }
      }
    }
    
    setSelectedSchoolIds(schoolIds);
    setSelectedCountries(countries);
    setHashtags(draft.hashtags || []);
    
    // 如果沒有從 API 獲取到 repostId，使用 draft.repostId
    if (!draftRepostId) {
      draftRepostId = draft.repostId || null;
    }
    
    // 如果是轉發貼文，載入原貼文
    if (draftRepostId) {
      setCurrentRepostId(draftRepostId);
      try {
        const repostResponse = await fetch(`/api/posts/${draftRepostId}`);
        const repostData = await repostResponse.json();
        if (repostData.success && repostData.post) {
          setOriginalPost(repostData.post);
        }
      } catch (error) {
        console.error('Error loading original post for draft:', error);
      }
    } else {
      // 如果草稿沒有 repostId，清除當前的 repostId
      setCurrentRepostId(null);
      setOriginalPost(null);
    }
    // 更新初始值，包含 repostId
    setInitialValues({
      title: draft.title || '',
      content: draft.content || '',
      selectedCountries: countries,
      selectedSchoolIds: schoolIds,
      hashtags: draft.hashtags || [],
      repostId: draftRepostId,
    });
    // 載入草稿後，重置 allowNavigation，確保變更檢測正常工作
    setAllowNavigation(false);
    toast.success('草稿已載入');
  };

  const handleSaveDraft = async (shouldNavigate = true) => {
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
          repostId: (currentRepostId || repostId) || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDraftId(data.post.id);
        // 更新初始值，標記為已儲存
        setInitialValues({
          title: title.trim() || '未命名草稿',
          content: content.trim() || '',
          selectedCountries,
          selectedSchoolIds,
          hashtags,
          repostId: currentRepostId || repostId || null,
        });
        toast.success('草稿已儲存');
        if (shouldNavigate) {
          setAllowNavigation(true);
          // 使用 entryPage（進入發布貼文頁面的上一頁）作為返回目標
          const targetUrl = entryPage || returnUrl;
          router.push(targetUrl);
        } else {
          // 從對話框調用時，關閉對話框並導航
          setShowUnsavedDialog(false);
          setAllowNavigation(true);
          
          // 如果有待載入的草稿，載入它
          if (pendingDraftLoad) {
            const draft = pendingDraftLoad;
            setPendingDraftLoad(null);
            loadDraftInternal(draft);
            return;
          }
          
          // 否則導航
          if (pendingNavigation) {
            router.push(pendingNavigation);
            setPendingNavigation(null);
          } else {
            // 如果沒有 pendingNavigation，使用 entryPage（進入發布貼文頁面的上一頁）
            const targetUrl = entryPage || returnUrl;
            router.push(targetUrl);
          }
        }
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

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    setAllowNavigation(true);
    
    // 如果有待載入的草稿，載入它
    if (pendingDraftLoad) {
      const draft = pendingDraftLoad;
      setPendingDraftLoad(null);
      loadDraftInternal(draft);
      return;
    }
    
    // 否則導航
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    } else {
      // 如果沒有 pendingNavigation，使用 entryPage（進入發布貼文頁面的上一頁）
      const targetUrl = entryPage || returnUrl;
      router.push(targetUrl);
    }
  };

  const normalizedTitle = normalizeEditorText(title);
  const normalizedContent = normalizeEditorText(content);

  // 檢查是否符合發布條件（轉發可無內容，但一般貼文需有內容）
  const canPublish = Boolean(normalizedTitle) && (Boolean(currentRepostId || repostId) || Boolean(normalizedContent));

  const handleSubmit = async () => {
    if (!normalizedTitle) {
      toast.error('請輸入標題');
      return;
    }
    // 轉發時可以不輸入內容，但必須有標題
    if (!(currentRepostId || repostId) && !normalizedContent) {
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
          repostId: (currentRepostId || repostId) || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAllowNavigation(true);
        const isRepost = Boolean(currentRepostId || repostId);
        if (isRepost && !editPostId) {
          toast.custom(
            (t) => (
              <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-lg">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8D7051]/15 text-[#8D7051]">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-[#4a3828]">已轉發貼文</span>
              </div>
            ),
            { position: 'top-center', duration: 2000 }
          );
        } else {
          toast.success(editPostId ? '貼文更新成功！' : '貼文發布成功！');
        }
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
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[#F4F4F4] max-md:bg-white">
      <div
        className="fixed left-0 right-0 z-[51] flex items-center justify-center border-b border-gray-100 bg-white md:top-0 md:h-16 md:border-b-0 md:bg-transparent max-md:top-16 max-md:h-12"
        style={{ pointerEvents: 'none' }}
      >
        <div className="pointer-events-auto max-w-[calc(100vw-32px)] truncate rounded-full border border-[#5A5A5A] bg-white/95 px-4 py-2 text-sm font-medium text-[#5A5A5A]">
            {editPostId && title ? title : '發布貼文'}
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 overflow-hidden bg-white px-0 pb-20 pt-14 md:bg-[#F4F4F4] md:px-2 md:pb-6 md:pt-4 lg:pb-6">
        <div className="flex h-full min-h-0 w-full items-stretch justify-center gap-6">
          <aside className="hidden shrink-0 md:block md:w-16 lg:w-64" aria-hidden />

          <main className="h-full min-h-0 w-full min-w-0 max-w-[800px] flex-1 overflow-y-auto overscroll-contain bg-white md:mx-auto">
            <div className="w-full min-w-0 min-h-[60vh]">

              {/* White Card Container */}
              <Card className="p-6 bg-white relative pt-8 w-full max-w-[800px] mx-auto" style={{ borderColor: 'white' }}>
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
                  {(currentRepostId || repostId) && originalPost && (
                    <div className="mb-4">
                      <RepostPreview originalPost={originalPost} />
                    </div>
                  )}
                  {/* 輸入框 - 用戶可以在這裡輸入文字 */}
                  <SimpleRichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder={(currentRepostId || repostId) ? "說點什麼..." : "輸入內容..."}
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
                        if (hasUnsavedChanges()) {
                          const targetUrl = entryPage || returnUrl;
                          setPendingNavigation(targetUrl);
                          setShowUnsavedDialog(true);
                        } else {
                          setAllowNavigation(true);
                          const targetUrl = entryPage || returnUrl;
                          router.push(targetUrl);
                        }
                      }}
                      disabled={isSubmitting || isSavingDraft}
                      variant="outline"
                      style={{
                        borderColor: '#ef4444',
                        color: '#ef4444',
                        borderRadius: '9999px',
                        backgroundColor: 'transparent',
                      }}
                      className="transition-all duration-200 hover:border-red-600 hover:bg-red-50 hover:shadow-sm disabled:opacity-50"
                    >
                      捨棄變更
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSaveDraft()}
                      disabled={isSavingDraft || isSubmitting}
                      variant="outline"
                      style={{
                        borderColor: '#5A5A5A',
                        color: '#5A5A5A',
                        borderRadius: '9999px',
                        backgroundColor: 'transparent',
                      }}
                      className="transition-all duration-200 hover:border-[#8D7051] hover:bg-[#f5f0e8] hover:text-[#4a3828] hover:shadow-sm disabled:opacity-50"
                    >
                      {isSavingDraft ? '儲存中...' : '儲存草稿'}
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isSavingDraft || !canPublish}
                    style={{
                      backgroundColor: '#BAC7E5',
                      color: canPublish ? '#5A5A5A' : 'rgba(90,90,90,0.5)',
                      borderRadius: '9999px',
                    }}
                    className="transition-all duration-200 hover:bg-[#a8b8da] hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:hover:shadow-none"
                  >
                    {isSubmitting ? (editPostId ? '更新中...' : '發布中...') : (editPostId ? '更新貼文' : '發佈貼文')}
                  </Button>
                </div>
                </div>
              </Card>
            </div>
          </main>

          {/* Right Sidebar - Drafts (轉發時為空，編輯時隱藏) */}
          <aside className="hidden md:block md:w-60 lg:w-64 flex-shrink-0">
            {!editPostId && (!repostId && !currentRepostId) && (
              <DraftList type="general" onLoadDraft={handleLoadDraft} />
            )}
          </aside>
        </div>
      </div>

      {/* 未儲存變更確認對話框 */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={(open) => {
          setShowUnsavedDialog(open);
          if (!open && pendingDraftLoad) {
            // 如果關閉對話框時有待載入的草稿，清除它
            setPendingDraftLoad(null);
          }
        }}
        onDiscard={handleDiscardChanges}
        onSaveDraft={async () => {
          await handleSaveDraft(false);
          // 儲存後如果有待載入的草稿，載入它
          if (pendingDraftLoad) {
            const draft = pendingDraftLoad;
            setPendingDraftLoad(null);
            await loadDraftInternal(draft);
          }
        }}
        isSavingDraft={isSavingDraft}
        isEditMode={!!editPostId}
        onUpdate={() => {
          setShowUnsavedDialog(false);
          handleSubmit();
        }}
        isUpdating={isSubmitting}
      />

      {/* Bottom Navigation - Only visible on screens smaller than lg */}
      <SocialBottomNav />
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
