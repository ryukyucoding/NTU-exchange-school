'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserQualification } from '@/types/user';
import posthog from 'posthog-js';

interface UserContextType {
  user: UserQualification;
  setUser: React.Dispatch<React.SetStateAction<UserQualification>>;
  resetUser: () => void;
  isUsingQualificationFilter: boolean;
}

const defaultUser: UserQualification = {
  college: null,
  grade: null,
  gpa: null,
  toefl: null,
  ielts: null,
  toeic: null,
  applicationGroup: null,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserQualification>(defaultUser);
  const { data: session, status } = useSession();

  // 檢查是否正在使用資格篩選
  const isUsingQualificationFilter = Boolean(
    user.college !== null ||
    user.grade !== null ||
    user.gpa !== null ||
    user.toefl !== null ||
    user.ielts !== null ||
    user.toeic !== null ||
    user.applicationGroup !== null
  );

  // 當用戶登入時，自動載入保存的資格
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadUserQualification();
      // 只在本 browser session 內的第一次登入時追蹤（避免重整頁面重複計算）
      if (!sessionStorage.getItem('ph_signed_in')) {
        posthog.capture('user_signed_in', { provider: 'google' });
        sessionStorage.setItem('ph_signed_in', '1');
      }
    } else if (status === 'unauthenticated') {
      // 登出時重置
      setUser(defaultUser);
      sessionStorage.removeItem('ph_signed_in');
    }
  }, [status, session]);

  const loadUserQualification = async () => {
    try {
      const response = await fetch('/api/user/qualification');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.qualification) {
          setUser(data.qualification);
        }
      }
    } catch (error) {
      console.error('Failed to load user qualification:', error);
    }
  };

  const resetUser = async () => {
    setUser(defaultUser);
    // 如果已登入，也清除資料庫中的資格（刪除記錄）
    if (status === 'authenticated' && session?.user) {
      try {
        // 先嘗試刪除記錄
        const response = await fetch('/api/user/qualification', {
          method: 'DELETE',
        });
        if (!response.ok && response.status !== 404) {
          // 如果刪除失敗且不是因為記錄不存在，則更新為空值
          await fetch('/api/user/qualification', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(defaultUser),
          });
        }
      } catch (error) {
        console.error('Failed to clear user qualification:', error);
      }
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, resetUser, isUsingQualificationFilter }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within UserProvider');
  }
  return context;
}
