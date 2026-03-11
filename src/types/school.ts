export interface SchoolSection {
  label: string;
  text: string;
  links?: Array<{ text: string; href: string }>;
}

export interface School {
  id: string;
  name_zh: string;
  name_en: string;
  country: string;
  country_en: string;
  country_id: string | null; // Country.id 的外键
  url: string;
  second_exchange_eligible: boolean;
  grade_requirement: string;
  restricted_colleges: string;
  quota: string;
  latitude: number;
  longitude: number;
  // 解析後的欄位
  region: 'Americas' | 'Europe' | 'Asia' | 'Oceania' | 'Africa';
  gpa_min: number | null;
  toefl_ibt: number | null;
  ielts: number | null;
  toeic: number | null;
  other_language: string | null;
  tuition: 'Free' | 'Partial' | 'Self-funded' | null;
  // 結構化欄位（v2 scraper）
  gept: string | null;
  language_cefr: string | null;
  jlpt: string | null;
  no_fail_required: boolean;
  is_updated: boolean;
  sections: SchoolSection[] | null;
  language_group: string | null;
}

export type SchoolWithMatch = School;
