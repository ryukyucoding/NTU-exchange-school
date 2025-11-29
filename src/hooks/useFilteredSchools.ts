import { useMemo } from 'react';
import { School, SchoolWithMatch } from '@/types/school';
import { FilterState } from '@/types/filter';
import { UserQualification } from '@/types/user';
import { applyFilters } from '@/utils/filters';

// 年級對應的數值
const GRADE_LEVEL: Record<string, number> = {
  'Freshman': 1,
  'Sophomore': 2,
  'Junior': 3,
  'Senior': 4,
};

// 從文字中提取最低年級要求
// 返回值：0=不限, 1-4=大一到大四, 999=只接受研究生(碩博)
function extractMinGradeLevel(gradeText: string): number {
  if (!gradeText || gradeText === '不限') return 0;

  // 檢查是否有提到研究生
  const hasMaster = gradeText.includes('碩一') || gradeText.includes('碩');
  const hasPhd = gradeText.includes('博一') || gradeText.includes('博');
  const hasUndergrad = gradeText.includes('大一') || gradeText.includes('大二') ||
                       gradeText.includes('大三') || gradeText.includes('大四');

  // 如果只提到碩博，沒有提到大學部，表示不接受大學部學生
  if ((hasMaster || hasPhd) && !hasUndergrad) {
    return 999; // 特殊值表示只接受研究生
  }

  // 檢查大學部最低年級
  if (gradeText.includes('大四')) return 4;
  if (gradeText.includes('大三')) return 3;
  if (gradeText.includes('大二')) return 2;
  if (gradeText.includes('大一')) return 1;

  return 0;
}

export function useFilteredSchools(
  schools: School[],
  filters: FilterState,
  userQualification: UserQualification
): SchoolWithMatch[] {
  return useMemo(() => {
    // 1. 套用一般篩選條件
    let filtered = applyFilters(schools, filters);

    // 2. 根據使用者資格進行額外篩選（只有在使用者有填寫資格時才套用）
    const hasUserQualification =
      userQualification.college !== null ||
      userQualification.grade !== null ||
      userQualification.gpa !== null ||
      userQualification.toefl !== null ||
      userQualification.ielts !== null ||
      userQualification.toeic !== null;

    if (hasUserQualification) {
      filtered = filtered.filter(school => {
        // 學院限制：如果使用者的學院在限制名單中，則過濾掉該學校
        if (userQualification.college && school.restricted_colleges) {
          if (school.restricted_colleges !== '無' &&
              school.restricted_colleges.includes(userQualification.college)) {
            return false;
          }
        }

        // 年級限制：如果使用者年級低於學校要求，則過濾掉
        if (userQualification.grade && school.grade_requirement) {
          const userGradeLevel = GRADE_LEVEL[userQualification.grade];
          const minGradeLevel = extractMinGradeLevel(school.grade_requirement);

          // 如果學校只接受研究生(999)，大學部學生無法申請
          if (minGradeLevel === 999) {
            return false;
          }

          // 如果學校有大學部年級限制，檢查使用者年級是否符合
          if (minGradeLevel > 0 && userGradeLevel < minGradeLevel) {
            return false;
          }
        }

        // GPA 限制：如果使用者 GPA 低於學校要求，則過濾掉
        if (userQualification.gpa !== null && school.gpa_min !== null) {
          if (userQualification.gpa < school.gpa_min) {
            return false;
          }
        }

        // 語言成績限制：檢查是否至少符合一項語言要求
        const hasToeflRequirement = school.toefl_ibt !== null;
        const hasIeltsRequirement = school.ielts !== null;
        const hasToeicRequirement = school.toeic !== null;
        const hasOtherLanguage = school.other_language !== null;

        // 只有在使用者有填寫任何語言成績時才檢查
        const userHasLanguageScore =
          userQualification.toefl !== null ||
          userQualification.ielts !== null ||
          userQualification.toeic !== null;

        // 如果學校有任何語言要求且使用者有填寫語言成績
        if ((hasToeflRequirement || hasIeltsRequirement || hasToeicRequirement) && userHasLanguageScore) {
          let meetsAnyLanguageRequirement = false;

          // 檢查 TOEFL
          if (hasToeflRequirement && userQualification.toefl !== null) {
            if (userQualification.toefl >= school.toefl_ibt!) {
              meetsAnyLanguageRequirement = true;
            }
          }

          // 檢查 IELTS
          if (hasIeltsRequirement && userQualification.ielts !== null) {
            if (userQualification.ielts >= school.ielts!) {
              meetsAnyLanguageRequirement = true;
            }
          }

          // 檢查 TOEIC
          if (hasToeicRequirement && userQualification.toeic !== null) {
            if (userQualification.toeic >= school.toeic!) {
              meetsAnyLanguageRequirement = true;
            }
          }

          // 如果有語言要求但使用者沒有任何一項達標，則過濾掉
          // 但如果學校只有「其他語言」要求（如西語、法語），則不過濾
          if (!meetsAnyLanguageRequirement && !hasOtherLanguage) {
            return false;
          }
        }

        return true;
      });
    }

    // 3. 直接返回學校
    return filtered;
  }, [schools, filters, userQualification]);
}