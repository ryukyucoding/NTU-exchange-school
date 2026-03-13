import { School } from '@/types/school';
import { FilterState } from '@/types/filter';

export function applyFilters(schools: School[], filters: FilterState): School[] {
  return schools.filter(school => {
    // 申請組別篩選
    if (filters.applicationGroup) {
      const normalize = (s: string) => s.replace(/\s+/g, '').trim();
      const splitGroups = (s: string) =>
        normalize(s)
          .split(/[／/]/)
          .map(part => part.trim())
          .filter(Boolean);

      const selectedGroups = splitGroups(filters.applicationGroup);
      const schoolGroups = splitGroups(school.language_group || '');

      // 如果學校沒有標註組別，視為不符合任何「指定組別」篩選
      if (schoolGroups.length === 0) return false;

      // 任一組別命中即可（例如：學校 =「日語組/一般組」，選「日語組」或「一般組」都會出現）
      const matches = selectedGroups.some(g => schoolGroups.includes(g));
      if (!matches) return false;
    }

    // 國家篩選（地區選取會自動展開為國家列表，因此只需檢查 countries[]）
    if (filters.countries && filters.countries.length > 0) {
      const schoolCountry = school.country || school.country_en;
      if (!filters.countries.some(country => schoolCountry.includes(country))) return false;
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
    if (filters.quotaMin !== null && school.quota) {
      // Extract number from quota string (e.g., "全學年5名" -> 5)
      const quotaMatch = school.quota.match(/(\d+)/);
      if (quotaMatch) {
        const quotaNum = parseInt(quotaMatch[1], 10);
        if (!isNaN(quotaNum) && quotaNum < filters.quotaMin) return false;
      }
    }

    // 排除已確認無名額的學校（已更新且甄選名額/人次皆為 0）
    if (filters.hasQuota) {
      if (school.is_updated) {
        const sq = school.selection_quota ?? 0;
        const sc = school.selection_count ?? 0;
        if (sq === 0 && sc === 0) return false;
      }
    }

    // 關鍵字搜尋
    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      const searchText = [
        school.name_zh,
        school.name_en,
        school.country,
        school.country_en,
        school.language_group,
        school.grade_requirement,
        school.restricted_colleges,
        ...(school.sections || []).map(s => s.text),
      ].join(' ').toLowerCase();

      if (!searchText.includes(keyword)) return false;
    }

    return true;
  });
}
