export interface School {
  id: string;
  name_zh: string;
  name_en: string;
  country: string;
  country_en: string;
  url: string;
  second_exchange_eligible: boolean;
  application_group: string;
  gpa_requirement: string;
  grade_requirement: string;
  language_requirement: string;
  restricted_colleges: string;
  quota: string;
  academic_calendar: string;
  registration_fee: string;
  accommodation_info: string;
  notes: string;
  latitude: number;
  longitude: number;
  // 解析後的欄位
  region: 'Americas' | 'Europe' | 'Asia' | 'Oceania' | 'Africa';
  gpa_min: number | null;
  toefl_ibt: number | null;
  ielts: number | null;
  toeic: number | null;
  other_language: string | null;
  semesters: ('Fall' | 'Spring')[];
  tuition: 'Free' | 'Partial' | 'Self-funded' | null;
}

export interface SchoolWithMatch extends School {
  // No additional properties needed
}
