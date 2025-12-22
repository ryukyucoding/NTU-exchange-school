export interface FilterState {
  regions: string[];
  countries: string[];
  colleges: string[];
  applicationGroup: string | null;
  gradeRequirement: string | null;
  gpaMin: number | null;
  toeflMin: number | null;
  ieltsMin: number | null;
  toeicMin: number | null;
  quotaMin: number | null;
  searchKeyword: string;
}

export interface UserQualification {
  college: string | null;
  grade: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Master1' | 'Master2' | null;
  gpa: number | null;
  toefl: number | null;
  ielts: number | null;
  toeic: number | null;
  applicationGroup: string | null;
}
