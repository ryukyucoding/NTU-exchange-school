'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RouteGuard from '@/components/auth/RouteGuard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CountrySchoolSelect from '@/components/social/CountrySchoolSelect';
import SimpleRichTextEditor from '@/components/social/SimpleRichTextEditor';
import HashtagInput from '@/components/social/HashtagInput';
import RatingInput from '@/components/social/RatingInput';
import DraftList from '@/components/social/DraftList';
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
  livingConvenience?: number;
  courseLoading?: number;
  costOfLiving?: number;
  livingConvenienceDesc?: string;
  courseLoadingDesc?: string;
  costOfLivingDesc?: string;
}

function ReviewPostContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { schools } = useSchoolContext();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [livingConvenience, setLivingConvenience] = useState(0);
  const [courseLoading, setCourseLoading] = useState(0);
  const [costOfLiving, setCostOfLiving] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const handleLoadDraft = (draft: Draft) => {
    setDraftId(draft.id);
    setTitle(draft.title || '');
    setContent(draft.content || '');
    setSelectedCountry(draft.country || null);
    setSelectedSchoolId(draft.schoolId || null);
    setHashtags(draft.hashtags || []);
    setLivingConvenience(draft.livingConvenience || 0);
    setCourseLoading(draft.courseLoading || 0);
    setCostOfLiving(draft.costOfLiving || 0);
    toast.success('草稿已載入');
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      // 根據選中的國家名稱，從 schools 中找到對應的 country_id
      const countryId = selectedCountry
        ? schools.find(s => s.country === selectedCountry)?.country_id
        : undefined;

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
          type: 'review',
          hashtags,
          schoolIds: selectedSchoolId ? [selectedSchoolId] : [],
          countryIds: countryId ? [countryId] : undefined,
          countryNames: !countryId && selectedCountry ? [selectedCountry] : undefined, // 向後兼容
          ratings: (livingConvenience && courseLoading && costOfLiving) ? {
            schoolId: selectedSchoolId,
            livingConvenience,
            courseLoading,
            costOfLiving,
          } : undefined,
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

  // 檢查是否符合發布條件
  const canPublish =
    Boolean(normalizedTitle) &&
    Boolean(selectedCountry) &&
    Boolean(selectedSchoolId) &&
    Boolean(normalizedContent) &&
    Boolean(livingConvenience) &&
    Boolean(courseLoading) &&
    Boolean(costOfLiving);

  const handleSubmit = async () => {
    if (!normalizedTitle) {
      toast.error('請輸入標題');
      return;
    }
    if (!selectedCountry || !selectedSchoolId) {
      toast.error('請選擇國家和學校');
      return;
    }
    if (!normalizedContent) {
      toast.error('請輸入內容');
      return;
    }
    if (!livingConvenience || !courseLoading || !costOfLiving) {
      toast.error('請完成所有評分');
      return;
    }

    setIsSubmitting(true);
    try {
      // 根據選中的國家名稱，從 schools 中找到對應的 country_id
      const countryId = selectedCountry
        ? schools.find(s => s.country === selectedCountry)?.country_id
        : undefined;

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: draftId || undefined,
          title: normalizedTitle,
          content: normalizedContent,
          status: 'published',
          type: 'review',
          hashtags,
          schoolIds: [selectedSchoolId],
          countryIds: countryId ? [countryId] : undefined,
          countryNames: !countryId && selectedCountry ? [selectedCountry] : undefined, // 向後兼容
          ratings: {
            schoolId: selectedSchoolId,
            livingConvenience,
            courseLoading,
            costOfLiving,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('貼文發布成功！');
        router.push('/social');
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
                  <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                  <div className="text-sm" style={{ color: '#5A5A5A' }}>
                    <span className="font-semibold">{session?.user?.name || 'userName'}</span>
                    <span className="mx-2">·</span>
                    <span>{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                  </div>
                </div>

                {/* Country and School Selection - Required */}
                <div className="mb-6">
                  <CountrySchoolSelect
                    selectedCountry={selectedCountry}
                    selectedSchoolId={selectedSchoolId}
                    onCountryChange={setSelectedCountry}
                    onSchoolChange={setSelectedSchoolId}
                    required={true}
                    schools={schools.map(s => ({
                      id: s.id,
                      name_zh: s.name_zh,
                      name_en: s.name_en,
                      country: s.country,
                    }))}
                  />
                </div>

                {/* Rating Sections */}
                <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #D9D9D9' }}>
                <RatingInput
                  label="生活機能"
                  type="stars"
                  value={livingConvenience}
                  onChange={setLivingConvenience}
                />
                <RatingInput
                  label="學習體驗"
                  type="stars"
                  value={courseLoading}
                  onChange={setCourseLoading}
                />
                <RatingInput
                  label="生活開銷"
                  type="dollar"
                  value={costOfLiving}
                  onChange={setCostOfLiving}
                />
              </div>

                {/* Content Section */}
                <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #D9D9D9' }}>
                  <SimpleRichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="輸入內容..."
                  />
                </div>

                {/* Hashtag Section */}
                <div className="mb-6">
                  <HashtagInput hashtags={hashtags} onChange={setHashtags} />
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3">
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
                    {isSubmitting ? '發布中...' : '發佈貼文'}
                  </Button>
                </div>
                </div>
              </Card>
            </div>
          </main>

          {/* Right Sidebar - Drafts */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <DraftList type="review" onLoadDraft={handleLoadDraft} />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPostPage() {
  return (
    <RouteGuard>
      <ReviewPostContent />
    </RouteGuard>
  );
}

