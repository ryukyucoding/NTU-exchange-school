import { useMemo } from 'react';
import { School, SchoolWithMatch } from '@/types/school';
import { FilterState } from '@/types/filter';
import { UserQualification } from '@/types/user';
import { applyFilters } from '@/utils/filters';

// 全民英檢等級對應數值（越高越好）
const GEPT_LEVEL: Record<string, number> = {
  '初級': 1, '中級': 2, '中高級': 3, '高級': 4,
};

// CEFR 等級對應數值（越高越好）
const CEFR_LEVEL: Record<string, number> = {
  'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6,
};

// JLPT 等級對應數值（N1 最難 = 5，N5 最易 = 1）
const JLPT_LEVEL: Record<string, number> = {
  'N5': 1, 'N4': 2, 'N3': 3, 'N2': 4, 'N1': 5,
};

function parseCEFR(s: string): number | null {
  const key = s.trim().replace(/\+$/, '').toUpperCase();
  return CEFR_LEVEL[key] ?? null;
}

// 年級對應的數值
const GRADE_LEVEL: Record<string, number> = {
  'Freshman': 1,
  'Sophomore': 2,
  'Junior': 3,
  'Senior': 4,
  'Master1': 5,
  'Master2': 6,
};

function splitApplicationGroups(s: string): string[] {
  return (s || '')
    .replace(/\s+/g, '')
    .trim()
    .split(/[／/]/)
    .map(x => x.trim())
    .filter(Boolean);
}

function pickGradeRequirementClauses(
  raw: string,
  schoolApplicationGroup: string,
  selectedApplicationGroup: string | null
): string[] {
  const text = (raw || '').trim();
  if (!text) return [];

  // 支援格式：
  // - 日語組：...；一般組：...
  // - SBE：...；FPN：...；UCM：...
  const parts = text.split(/[；;]/).map(p => p.trim()).filter(Boolean);
  const kv = new Map<string, string>();
  for (const p of parts) {
    const m = p.match(/^([^：:]+)[：:](.+)$/);
    if (m) kv.set(m[1].trim(), m[2].trim());
  }

  // 非分段格式：整句當一條規則
  if (kv.size === 0) return [text];

  const targets = selectedApplicationGroup
    ? splitApplicationGroups(selectedApplicationGroup)
    : splitApplicationGroups(schoolApplicationGroup);

  const picked: string[] = [];
  for (const t of targets) {
    const clause = kv.get(t);
    if (clause) picked.push(clause);
  }

  // 如果找不到對應的分段，就退回「任一分段符合就算符合」
  return picked.length > 0 ? picked : Array.from(kv.values());
}

type GradeRule = {
  allowUndergrad: boolean;
  allowMaster: boolean;
  undergradMin: number | null;
  undergradSet: Set<number> | null;
  masterMin: number | null;
  masterSet: Set<number> | null;
};

function cnDigitToNum(ch: string): number | null {
  if (ch === '一') return 1;
  if (ch === '二') return 2;
  if (ch === '三') return 3;
  if (ch === '四') return 4;
  if (ch === '五') return 5;
  return null;
}

function parseSingleClauseToRule(rawClause: string): GradeRule {
  // Normalize
  let text = (rawClause || '').replace(/\s+/g, '').trim();
  text = text.replace(/學生$/u, '');
  // 這些描述不影響「碩一/碩二」判斷，先移除避免干擾
  text = text.replace(/（?不含博士生）?/gu, '').replace(/\\(不含博士生\\)/gu, '');

  if (!text || text === '不限') {
    return {
      allowUndergrad: true,
      allowMaster: true,
      undergradMin: null,
      undergradSet: null,
      masterMin: null,
      masterSet: null,
    };
  }

  const undergradOnly =
    text.includes('僅限大學部') || text.includes('僅限大學') || text.includes('僅限學士');
  const masterOnly =
    text.includes('僅限研究生') || text.includes('僅限碩士') || text.includes('僅限研究所');

  // Undergrad min: 大X以上
  let undergradMin: number | null = null;
  const ugMinMatch = text.match(/大([一二三四五])以上/u);
  if (ugMinMatch) {
    undergradMin = cnDigitToNum(ugMinMatch[1]);
  }

  // Undergrad set: 大一/大二/...（只處理「列舉」；若是「大二以上」就不應視為列舉）
  const undergradSet = new Set<number>();
  for (const m of text.matchAll(/大([一二三四五])(?!以上)/gu)) {
    const n = cnDigitToNum(m[1]);
    if (n) undergradSet.add(n);
  }

  // Master min: 碩X以上
  let masterMin: number | null = null;
  const msMinMatch = text.match(/碩([一二])以上/u);
  if (msMinMatch) {
    const n = cnDigitToNum(msMinMatch[1]);
    if (n) masterMin = 4 + n; // Master1=5, Master2=6
  }

  // Master set: 碩一/碩二（只處理「列舉」；若是「碩一以上」就不應視為列舉）
  const masterSet = new Set<number>();
  if (/碩一(?!以上)/u.test(text)) masterSet.add(5);
  if (/碩二(?!以上)/u.test(text)) masterSet.add(6);

  const masterMentioned = text.includes('碩') || text.includes('研究生') || text.includes('研究所');

  // allow inference from full-column patterns (observed in CSV):
  // - 若沒提到碩/研究生，通常代表只限大學部（例如：大二/大三學生）
  // - 若同時寫出大學部與碩士（例如：大二以上/碩一以上/...）→ 雙軌允許
  const hasUndergrad = undergradMin !== null || undergradSet.size > 0;
  const hasMaster = masterMin !== null || masterSet.size > 0 || masterMentioned;

  const allowMaster =
    undergradOnly ? false : masterOnly ? true : hasMaster;
  const allowUndergrad =
    masterOnly ? false : undergradOnly ? true : hasUndergrad;

  return {
    allowUndergrad,
    allowMaster,
    undergradMin,
    undergradSet: undergradSet.size > 0 ? undergradSet : null,
    masterMin: masterMentioned && masterMin === null && masterSet.size === 0 ? 5 : masterMin,
    masterSet: masterSet.size > 0 ? masterSet : null,
  };
}

function matchesGradeRule(rule: GradeRule, userGradeLevel: number): boolean {
  const isUndergrad = userGradeLevel <= 4;
  const isMaster = userGradeLevel >= 5;

  if (isUndergrad) {
    if (!rule.allowUndergrad) return false;
    if (rule.undergradSet) return rule.undergradSet.has(userGradeLevel);
    if (rule.undergradMin !== null) return userGradeLevel >= rule.undergradMin;
    return true;
  }

  if (isMaster) {
    if (!rule.allowMaster) return false;
    if (rule.masterSet) return rule.masterSet.has(userGradeLevel);
    if (rule.masterMin !== null) return userGradeLevel >= rule.masterMin;
    return true;
  }

  return true;
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
      userQualification.toeic !== null ||
      userQualification.gept !== null ||
      userQualification.cefr !== null ||
      userQualification.jlpt !== null ||
      userQualification.noFail;

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

          const clauses = pickGradeRequirementClauses(
            school.grade_requirement,
            school.language_group || '',
            filters.applicationGroup
          );

          // 沒有可解析內容就不擋（避免把資料壞掉時全部篩掉）
          if (clauses.length > 0) {
            const ok = clauses.some(clause => matchesGradeRule(parseSingleClauseToRule(clause), userGradeLevel));
            if (!ok) return false;
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

        // 全民英檢：使用者等級須 >= 學校要求
        if (userQualification.gept && school.gept) {
          const userLevel = GEPT_LEVEL[userQualification.gept] ?? 0;
          const schoolLevel = GEPT_LEVEL[school.gept] ?? 0;
          if (schoolLevel > 0 && userLevel < schoolLevel) return false;
        }

        // CEFR：使用者等級須 >= 學校要求
        if (userQualification.cefr && school.language_cefr) {
          const userLevel = parseCEFR(userQualification.cefr) ?? 0;
          const schoolLevel = parseCEFR(school.language_cefr) ?? 0;
          if (schoolLevel > 0 && userLevel < schoolLevel) return false;
        }

        // JLPT：使用者等級須 >= 學校要求
        if (userQualification.jlpt && school.jlpt) {
          const userLevel = JLPT_LEVEL[userQualification.jlpt] ?? 0;
          const schoolLevel = JLPT_LEVEL[school.jlpt] ?? 0;
          if (schoolLevel > 0 && userLevel < schoolLevel) return false;
        }

        // 不及格科目：若使用者有不及格，排除要求無不及格的學校
        if (userQualification.noFail && school.no_fail_required) {
          return false;
        }

        return true;
      });
    }

    // 3. 直接返回學校
    return filtered;
  }, [schools, filters, userQualification]);
}