export interface UserQualification {
  college: string | null;
  grade: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | null;
  gpa: number | null;
  toefl: number | null;
  ielts: number | null;
  toeic: number | null;
}
