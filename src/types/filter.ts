export interface FilterState {
  regions: string[];
  countries: string[];
  colleges: string[];
  gradeRequirement: string | null;
  gpaMin: number | null;
  toeflMin: number | null;
  ieltsMin: number | null;
  toeicMin: number | null;
  quotaMin: number | null;
  semesters: string[];
  searchKeyword: string;
}

export interface UserQualification {
  college: string | null;
  grade: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | null;
  gpa: number | null;
  toefl: number | null;
  ielts: number | null;
  toeic: number | null;
}
