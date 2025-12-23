'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

interface Draft {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'review';
  updatedAt: string;
  schools?: { id: string; name_zh: string; name_en: string; country: string }[];
  countries?: string[];
  hashtags?: string[];
  schoolId?: string;
  country?: string;
  repostId?: string;
}

interface DraftListProps {
  type: 'general' | 'review';
  onLoadDraft: (draft: Draft) => void;
}

export default function DraftList({ type, onLoadDraft }: DraftListProps) {
  const { data: session } = useSession();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrafts = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/posts?filter=drafts&type=${type}`);
        const data = await response.json();
        
        if (data.success) {
          setDrafts(data.posts || []);
        }
      } catch (error) {
        console.error('[DraftList] Error fetching drafts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDrafts();
  }, [session, type]);

  const handleDeleteDraft = async (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation(); // 阻止觸發載入草稿
    if (!confirm('確定要刪除此草稿嗎？')) return;

    try {
      const response = await fetch(`/api/posts/${draftId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('草稿已刪除');
        // 重新載入草稿列表
        setDrafts(drafts.filter(d => d.id !== draftId));
      } else {
        toast.error(data.error || '刪除失敗');
      }
    } catch (error) {
      console.error('[DraftList] Error deleting draft:', error);
      toast.error('刪除失敗，請稍後再試');
    }
  };

  if (loading) {
    return (
      <Card className="p-4 bg-white border-0 shadow-none">
        <h3 className="font-semibold mb-3 text-gray-800">草稿</h3>
        <div className="text-sm text-gray-400">載入中...</div>
      </Card>
    );
  }

  if (drafts.length === 0) {
    return (
      <Card className="p-4 bg-white border-0 shadow-none">
        <h3 className="font-semibold mb-3 text-gray-800">草稿</h3>
        <div className="text-sm text-gray-400">尚無草稿</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white border-0 shadow-none">
      <h3 className="font-semibold mb-3 text-gray-800">草稿</h3>
      <div className="space-y-3">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="group p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors"
            onClick={() => onLoadDraft(draft)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-gray-600 line-clamp-2 flex-1">
                {draft.title || draft.content.substring(0, 50) || '未命名草稿'}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Pencil className="w-4 h-4 text-gray-400" />
                <Trash2 
                  className="w-4 h-4 text-red-500 hover:text-red-700" 
                  onClick={(e) => handleDeleteDraft(e, draft.id)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

