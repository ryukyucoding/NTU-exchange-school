'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserQualification } from '@/types/user';

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
    user.toeic !== null
  );

  // 當用戶登入時，自動載入保存的資格
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadUserQualification();
    } else if (status === 'unauthenticated') {
      // 登出時重置
      setUser(defaultUser);
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
