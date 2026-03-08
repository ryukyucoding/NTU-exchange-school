import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SchoolWithMatch } from '@/types/school';
import toast from 'react-hot-toast';
import posthog from 'posthog-js';

export interface WishlistItem {
  school: SchoolWithMatch;
  note: string;
  order: number | null;
  addedAt: string;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  loading: boolean;
  addToWishlist: (school: SchoolWithMatch, note?: string) => Promise<void>;
  removeFromWishlist: (schoolId: string) => Promise<void>;
  updateWishlistItem: (schoolId: string, updates: { note?: string; order?: number | null }) => Promise<void>;
  isInWishlist: (schoolId: string) => boolean;
  getPreferences: () => WishlistItem[]; // 返回order不为null的项目，按order排序
  reorderPreferences: (updates: { schoolId: string; order: number }[]) => Promise<void>; // 批量更新order
  reorderWishlist: (fromIndex: number, toIndex: number) => Promise<void>; // 以列表索引为单位调整顺序
  clearWishlist: () => Promise<void>;
  refreshWishlist: () => Promise<void>; // 手动刷新
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolsMap, setSchoolsMap] = useState<Map<string, SchoolWithMatch>>(new Map());

  // 加载所有学校数据（用于匹配wishlist中的schoolId）
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const response = await fetch('/api/schools');
        const data = await response.json();
        if (data.success && data.schools) {
          const map = new Map<string, SchoolWithMatch>();
          data.schools.forEach((school: SchoolWithMatch) => {
            map.set(school.id, school);
          });
          setSchoolsMap(map);
        }
      } catch (error) {
        console.error('Failed to load schools:', error);
      }
    };
    loadSchools();
  }, []);

  // 从API加载wishlist数据
  const loadWishlist = async () => {
    if (status === 'loading') return;
    if (!session?.user) {
      setWishlist([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wishlist');
      const data = await response.json();
      
      if (data.success && data.wishlist) {
        // 匹配学校数据
        const items: WishlistItem[] = data.wishlist
          .map((item: { schoolId: string; note: string | null; order: number | null; createdAt: string }) => {
            const school = schoolsMap.get(item.schoolId);
            if (!school) return null;
            return {
              school,
              note: item.note || '',
              order: item.order,
              addedAt: item.createdAt,
            };
          })
          .filter((item: WishlistItem | null) => item !== null) as WishlistItem[];
        
        setWishlist(items);
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      toast.error('載入收藏清單失敗');
    } finally {
      setLoading(false);
    }
  };

  // 当session或schoolsMap变化时重新加载
  useEffect(() => {
    if (schoolsMap.size > 0) {
      loadWishlist();
    }
  }, [session, status, schoolsMap.size]);

  const addToWishlist = async (school: SchoolWithMatch, note?: string) => {
    if (wishlist.some(item => item.school.id === school.id)) {
      toast.error('此學校已在收藏清單中');
      return;
    }

    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, note: note || '' }),
      });

      const data = await response.json();
      if (data.success) {
        await loadWishlist();
        posthog.capture('wishlist_added', { school_id: school.id, school_name: school.name_zh });
        toast.success(`已將 ${school.name_zh} 加入收藏`);
      } else {
        toast.error(data.error || '加入收藏失敗');
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('加入收藏失敗');
    }
  };

  const removeFromWishlist = async (schoolId: string) => {
    const school = wishlist.find(item => item.school.id === schoolId);
    try {
      const response = await fetch(`/api/wishlist?schoolId=${schoolId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await loadWishlist();
        if (school) {
          posthog.capture('wishlist_removed', { school_id: schoolId, school_name: school.school.name_zh });
          toast.success(`已移除 ${school.school.name_zh}`);
        }
      } else {
        toast.error(data.error || '移除收藏失敗');
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('移除收藏失敗');
    }
  };

  const updateWishlistItem = async (schoolId: string, updates: { note?: string; order?: number | null }) => {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, ...updates }),
      });

      const data = await response.json();
      if (data.success) {
        await loadWishlist();
      } else {
        toast.error(data.error || '更新失敗');
      }
    } catch (error) {
      console.error('Error updating wishlist item:', error);
      toast.error('更新失敗');
    }
  };

  const isInWishlist = (schoolId: string) => {
    return wishlist.some(item => item.school.id === schoolId);
  };

  const getPreferences = () => {
    return wishlist
      .filter(item => item.order !== null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const reorderPreferences = async (updates: { schoolId: string; order: number }[]) => {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();
      if (data.success) {
        await loadWishlist();
      } else {
        toast.error(data.error || '更新順序失敗');
      }
    } catch (error) {
      console.error('Error reordering preferences:', error);
      toast.error('更新順序失敗');
    }
  };

  const reorderWishlist = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= wishlist.length || toIndex >= wishlist.length) return;

    const next = [...wishlist];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    // Persist the new ordering via the existing batch update API.
    // Use 1-based order values to avoid ambiguity with "0" and match typical DB ordering.
    const updates = next.map((item, index) => ({
      schoolId: item.school.id,
      order: index + 1,
    }));

    await reorderPreferences(updates);
  };

  const clearWishlist = async () => {
    // 删除所有收藏
    const deletePromises = wishlist.map(item =>
      fetch(`/api/wishlist?schoolId=${item.school.id}`, { method: 'DELETE' })
    );
    
    try {
      await Promise.all(deletePromises);
      await loadWishlist();
      toast.success('已清空收藏清單');
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      toast.error('清空收藏清單失敗');
    }
  };

  const refreshWishlist = loadWishlist;

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        addToWishlist,
        removeFromWishlist,
        updateWishlistItem,
        isInWishlist,
        getPreferences,
        reorderPreferences,
        reorderWishlist,
        clearWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
