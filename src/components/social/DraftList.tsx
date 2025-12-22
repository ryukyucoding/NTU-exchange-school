'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Pencil } from 'lucide-react';
import { useSession } from 'next-auth/react';

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
              <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

