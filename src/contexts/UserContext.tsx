import React, { createContext, useContext, useState } from 'react';
import { UserQualification } from '@/types/user';

interface UserContextType {
  user: UserQualification;
  setUser: React.Dispatch<React.SetStateAction<UserQualification>>;
  resetUser: () => void;
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

  const resetUser = () => {
    setUser(defaultUser);
  };

  return (
    <UserContext.Provider value={{ user, setUser, resetUser }}>
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
