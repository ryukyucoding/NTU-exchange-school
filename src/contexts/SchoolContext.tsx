import React, { createContext, useContext, useEffect, useState } from 'react';
import { School } from '@/types/school';
import { loadSchools } from '@/utils/csv';

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
      const data = await loadSchools();
      setSchools(data);
    } catch (err) {
      setError(err as Error);
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
