import React, { createContext, useContext, useEffect, useState } from 'react';
import { School } from '@/types/school';
import { supabase } from '@/lib/supabase';
import { getRegionFromCountry } from '@/utils/regions';

interface SchoolContextType {
  schools: School[];
  loading: boolean;
  error: Error | null;
  reloadSchools: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

// 將 Supabase 資料轉換為前端 School 型別
function transformSchoolData(row: any): School {
  // 解析 GPA 要求
  const gpaMatch = row.gpa_requirement?.match(/(\d+\.\d+)/);
  const gpa_min = gpaMatch ? parseFloat(gpaMatch[1]) : null;

  // 解析 TOEFL iBT
  const toeflMatch = row.language_requirement?.match(/TOEFL iBT (\d+)/i);
  const toefl_ibt = toeflMatch ? parseInt(toeflMatch[1]) : null;

  // 解析 IELTS
  const ieltsMatch = row.language_requirement?.match(/IELTS (\d+\.?\d*)/i);
  const ielts = ieltsMatch ? parseFloat(ieltsMatch[1]) : null;

  // 解析 TOEIC
  const toeicMatch = row.language_requirement?.match(/TOEIC (\d+)/i);
  const toeic = toeicMatch ? parseInt(toeicMatch[1]) : null;

  // 解析其他語言要求
  const other_language_patterns = [
    /日[文語].*?N?\d/i,
    /法[文語]/i,
    /德[文語]/i,
    /西[班牙]*[文語]/i,
    /葡[萄牙]*[文語]/i,
    /韓[文語]/i,
    /B\d|C\d/i, // 歐洲語言等級
  ];
  let other_language = null;
  for (const pattern of other_language_patterns) {
    const match = row.language_requirement?.match(pattern);
    if (match) {
      other_language = match[0];
      break;
    }
  }

  // 解析學期
  const semesters: ('Fall' | 'Spring')[] = [];
  const calendarLower = row.academic_calendar?.toLowerCase() || '';
  if (calendarLower.includes('fall') || calendarLower.includes('autumn') ||
      calendarLower.includes('september') || calendarLower.includes('august')) {
    semesters.push('Fall');
  }
  if (calendarLower.includes('spring') || calendarLower.includes('winter') ||
      calendarLower.includes('january') || calendarLower.includes('february')) {
    semesters.push('Spring');
  }

  // 解析學費狀況
  let tuition: 'Free' | 'Partial' | 'Self-funded' | null = null;
  if (row.registration_fee?.includes('免繳該校學費')) {
    tuition = 'Free';
  } else if (row.registration_fee?.includes('部分')) {
    tuition = 'Partial';
  } else if (row.registration_fee?.includes('自費') || row.registration_fee?.includes('須繳')) {
    tuition = 'Self-funded';
  }

  return {
    id: row.id,
    name_zh: row.name_zh,
    name_en: row.name_en,
    country: row.country,
    country_en: row.country_en,
    url: row.url || '',
    second_exchange_eligible: row.second_exchange_eligible,
    application_group: row.application_group || '',
    gpa_requirement: row.gpa_requirement || '',
    grade_requirement: row.grade_requirement || '',
    language_requirement: row.language_requirement || '',
    restricted_colleges: row.restricted_colleges || '',
    quota: row.quota || '',
    academic_calendar: row.academic_calendar || '',
    registration_fee: row.registration_fee || '',
    accommodation_info: row.accommodation_info || '',
    notes: row.notes || '',
    latitude: row.latitude || 0,
    longitude: row.longitude || 0,
    region: getRegionFromCountry(row.country_en),
    gpa_min,
    toefl_ibt,
    ielts,
    toeic,
    other_language,
    semesters,
    tuition,
  };
}

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reloadSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('schools')
        .select('*')
        .order('name_zh', { ascending: true });

      if (fetchError) {
        throw new Error(`Supabase 查詢錯誤: ${fetchError.message}`);
      }

      if (!data) {
        throw new Error('未取得任何資料');
      }

      const transformedSchools = data.map(transformSchoolData);
      setSchools(transformedSchools);
    } catch (err) {
      console.error('載入學校資料失敗:', err);
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
