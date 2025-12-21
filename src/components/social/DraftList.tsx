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
        console.error('Error fetching drafts:', error);
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
        {drafts.map((draft, index) => (
          <div
            key={draft.id}
            className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors"
            onClick={() => onLoadDraft(draft)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="font-medium text-sm">草稿 {index + 1}</div>
              <Pencil className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-sm text-gray-600 line-clamp-2">
              {draft.title || draft.content.substring(0, 50) || '預覽預覽預覽文字歐歐歐歐'}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

