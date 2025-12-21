'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RouteGuard from '@/components/auth/RouteGuard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MultiCountrySchoolSelect from '@/components/social/MultiCountrySchoolSelect';
import SimpleRichTextEditor from '@/components/social/SimpleRichTextEditor';
import HashtagInput from '@/components/social/HashtagInput';
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
}

function GeneralPostContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { schools } = useSchoolContext();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

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
          hashtags,
          schoolIds: selectedSchoolIds,
          countryNames: selectedCountries,
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('請輸入標題');
      return;
    }
    if (!content.trim()) {
      toast.error('請輸入內容');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: draftId || undefined,
          title: title.trim(),
          content: content.trim(),
          status: 'published',
          hashtags,
          schoolIds: selectedSchoolIds,
          countryNames: selectedCountries,
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
    <div className="min-h-screen bg-[#F3F3F3]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 justify-center items-start">
          {/* Left Sidebar - 留空間給「+」號 */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            {/* 左側空間給「+」號 */}
          </aside>

          {/* Main Content - 固定寬度 800px */}
          <main className="w-[800px] flex-shrink-0">
            {/* Content area */}
            <div className="w-full">
              {/* 發布貼文標籤 */}
              <div className="mb-4 flex justify-center">
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
                    disabled={isSubmitting || isSavingDraft}
                    style={{
                      backgroundColor: '#BAC7E5',
                      color: 'white',
                      borderRadius: '9999px',
                    }}
                    className="hover:bg-[#BAC7E5]/90"
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
            <div className="sticky top-6 mt-[54px]">
              <DraftList type="general" onLoadDraft={handleLoadDraft} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function GeneralPostPage() {
  return (
    <RouteGuard>
      <GeneralPostContent />
    </RouteGuard>
  );
}
