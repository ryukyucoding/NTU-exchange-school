import React, { createContext, useContext, useState, useEffect } from 'react';
import { SchoolWithMatch } from '@/types/school';
import toast from 'react-hot-toast';

interface WishlistItem {
  school: SchoolWithMatch;
  priority: number; // 1-5 星
  note: string;
  addedAt: string;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (school: SchoolWithMatch) => void;
  removeFromWishlist: (schoolId: string) => void;
  updateWishlistItem: (schoolId: string, updates: Partial<WishlistItem>) => void;
  isInWishlist: (schoolId: string) => boolean;
  reorderWishlist: (fromIndex: number, toIndex: number) => void;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addToWishlist = (school: SchoolWithMatch) => {
    if (wishlist.some(item => item.school.id === school.id)) {
      toast.error('此學校已在收藏清單中');
      return;
    }

    const newItem: WishlistItem = {
      school,
      priority: 3,
      note: '',
      addedAt: new Date().toISOString(),
    };

    setWishlist(prev => [...prev, newItem]);
    toast.success(`已將 ${school.name_zh} 加入收藏`);
  };

  const removeFromWishlist = (schoolId: string) => {
    const school = wishlist.find(item => item.school.id === schoolId);
    setWishlist(prev => prev.filter(item => item.school.id !== schoolId));
    if (school) {
      toast.success(`已移除 ${school.school.name_zh}`);
    }
  };

  const updateWishlistItem = (schoolId: string, updates: Partial<WishlistItem>) => {
    setWishlist(prev =>
      prev.map(item =>
        item.school.id === schoolId ? { ...item, ...updates } : item
      )
    );
  };

  const isInWishlist = (schoolId: string) => {
    return wishlist.some(item => item.school.id === schoolId);
  };

  const reorderWishlist = (fromIndex: number, toIndex: number) => {
    setWishlist(prev => {
      const newList = [...prev];
      const [removed] = newList.splice(fromIndex, 1);
      newList.splice(toIndex, 0, removed);
      return newList;
    });
  };

  const clearWishlist = () => {
    setWishlist([]);
    toast.success('已清空收藏清單');
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        updateWishlistItem,
        isInWishlist,
        reorderWishlist,
        clearWishlist,
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
