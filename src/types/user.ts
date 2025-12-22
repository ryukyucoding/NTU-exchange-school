export interface UserQualification {
  college: string | null;
  grade: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Master1' | 'Master2' | null;
  gpa: number | null;
  toefl: number | null;
  ielts: number | null;
  toeic: number | null;
  applicationGroup: string | null;
}
