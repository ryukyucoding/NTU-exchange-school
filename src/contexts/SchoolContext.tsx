'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { School } from '@/types/school';

interface SchoolContextType {
  schools: School[];
  loading: boolean;
  error: Error | null;
  reloadSchools: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reloadSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      // 只從 Supabase API 讀取學校資料
      const response = await fetch('/api/schools');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.schools) {
        // 調試：檢查接收到的數據
        if (data.schools.length > 0) {
          const sampleSchool = data.schools[0];
          console.log('[SchoolContext] 接收到的樣本學校:', {
            id: sampleSchool.id,
            name_zh: sampleSchool.name_zh,
            country_id: sampleSchool.country_id,
            country_idType: typeof sampleSchool.country_id,
            hasCountryId: 'country_id' in sampleSchool,
          });
        }
        setSchools(data.schools);
      } else {
        throw new Error(data.error || 'Failed to load schools from Supabase');
      }
    } catch (err) {
      console.error('載入學校資料失敗:', err);
      setError(err as Error);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadSchools();
  }, []);

  return (
    <SchoolContext.Provider value={{ schools, loading, error, reloadSchools }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchoolContext() {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchoolContext must be used within SchoolProvider');
  }
  return context;
}
