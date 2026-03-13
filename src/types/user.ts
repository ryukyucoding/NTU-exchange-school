export interface UserQualification {
  college: string | null;
  grade: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Master1' | 'Master2' | null;
  gpa: number | null;
  toefl: number | null;
  ielts: number | null;
  toeic: number | null;
  applicationGroup: string | null;
  gept: string | null;       // 全民英檢，如 '中高級'
  cefr: string | null;       // CEFR，如 'B2'
  jlpt: string | null;       // 日語能力，如 'N2'
  noFail: boolean;           // 有不及格科目
}
