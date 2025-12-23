'use client';

import { useState, useEffect } from 'react';

interface UsePopularTagsReturn {
  tags: string[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePopularTags(): UsePopularTagsReturn {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPopularTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/hashtags/popular');

      if (!response.ok) {
        setTags([]);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error('Error fetching popular tags:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch popular tags'));
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopularTags();
  }, []);

  return {
    tags,
    loading,
    error,
    refetch: fetchPopularTags,
  };
}
