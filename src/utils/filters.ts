import { School } from '@/types/school';
import { FilterState } from '@/types/filter';

export function applyFilters(schools: School[], filters: FilterState): School[] {
  return schools.filter(school => {
    // 地區篩選
    if (filters.regions.length > 0 && !filters.regions.includes(school.region)) {
      return false;
    }

    // 國家篩選
    if (filters.countries && filters.countries.length > 0) {
      const schoolCountry = school.country || school.country_en;
      const matchesCountry = filters.countries.some(country => 
        schoolCountry.includes(country)
      );
      if (!matchesCountry) {
        return false;
      }
    }

    // 學院篩選 - 基於不接受申請之學院
    if (filters.colleges.length > 0) {
      // 如果學校有學院限制，檢查是否與篩選條件衝突
      if (school.restricted_colleges && school.restricted_colleges !== '無') {
        const hasConflictingCollege = filters.colleges.some(college => 
          school.restricted_colleges.includes(college)
        );
        if (hasConflictingCollege) {
          return false;
        }
      }
    }

    // 年級限制 - 基於文字描述進行匹配
    if (filters.gradeRequirement && filters.gradeRequirement !== 'No Limit') {
      if (school.grade_requirement) {
        // 檢查年級限制文字是否與使用者條件匹配
        const gradeText = school.grade_requirement.toLowerCase();
        if (filters.gradeRequirement === 'Sophomore+') {
          // 如果學校要求大三以上，但使用者只有大二以上，則不匹配
          if (gradeText.includes('大三') || gradeText.includes('大四') || gradeText.includes('碩一')) {
            return false;
          }
        }
      }
    }

    // GPA 篩選
    if (filters.gpaMin !== null && school.gpa_min !== null) {
      if (school.gpa_min > filters.gpaMin) return false;
    }

    // 語言成績篩選
    if (filters.toeflMin !== null && school.toefl_ibt !== null) {
      if (school.toefl_ibt > filters.toeflMin) return false;
    }

    if (filters.ieltsMin !== null && school.ielts !== null) {
      if (school.ielts > filters.ieltsMin) return false;
    }

    if (filters.toeicMin !== null && school.toeic !== null) {
      if (school.toeic > filters.toeicMin) return false;
    }

    // 名額篩選
    if (filters.quotaMin !== null) {
      if (school.quota < filters.quotaMin) return false;
    }

    // 學期篩選
    if (filters.semesters.length > 0) {
      const hasMatchingSemester = school.semesters.some(s => filters.semesters.includes(s));
      if (!hasMatchingSemester) return false;
    }

    // 關鍵字搜尋
    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      const searchText = [
        school.name_zh,
        school.name_en,
        school.country,
        school.country_en,
        school.application_group,
        school.gpa_requirement,
        school.grade_requirement,
        school.language_requirement,
        school.restricted_colleges,
        school.academic_calendar,
        school.registration_fee,
        school.accommodation_info,
        school.notes,
      ].join(' ').toLowerCase();

      if (!searchText.includes(keyword)) return false;
    }

    return true;
  });
}
