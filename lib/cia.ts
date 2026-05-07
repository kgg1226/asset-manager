// CIA (Confidentiality, Integrity, Availability) 보안 점수/등급 유틸리티
//
// 정책 (사용자 확정):
//   - 각 항목 점수: 1 = 낮음, 2 = 보통, 3 = 높음 (3이 가장 중요)
//   - 종합 등급: 1등급 = 최상, 2등급 = 보통, 3등급 = 최하
//   - 점수 → 등급 변환: grade = 4 - round(avgScore)
//     (점수 3 → 1등급, 점수 2 → 2등급, 점수 1 → 3등급)

export type CiaLevel = 1 | 2 | 3;

export interface CiaScore {
  ciaC: CiaLevel | null;
  ciaI: CiaLevel | null;
  ciaA: CiaLevel | null;
}

// 점수 라벨/색상: 1=낮음(green) → 3=높음(red)
const SCORE_LABELS: Record<CiaLevel, string> = {
  1: "낮음",
  2: "보통",
  3: "높음",
};

const SCORE_COLORS: Record<CiaLevel, string> = {
  1: "bg-green-100 text-green-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-red-100 text-red-800",
};

// 등급 라벨/색상: 1등급(red, 최상) → 3등급(green, 최하)
const GRADE_LABELS: Record<CiaLevel, string> = {
  1: "1등급",
  2: "2등급",
  3: "3등급",
};

const GRADE_COLORS: Record<CiaLevel, string> = {
  1: "bg-red-100 text-red-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-green-100 text-green-800",
};

/** 점수 라벨 (낮음/보통/높음) */
export function getCiaLevelLabel(level: CiaLevel | null | undefined): string {
  if (level == null) return "미설정";
  return SCORE_LABELS[level] ?? "미설정";
}

/** 점수 색상 */
export function getCiaLevelColor(level: CiaLevel | null | undefined): string {
  if (level == null) return "bg-gray-100 text-gray-500";
  return SCORE_COLORS[level] ?? "bg-gray-100 text-gray-500";
}

/** 점수 → 등급 변환 (3점=1등급, 1점=3등급) */
export function scoreToGrade(score: CiaLevel): CiaLevel {
  return (4 - score) as CiaLevel;
}

/** 등급 라벨 (1등급/2등급/3등급) */
export function getCiaGradeLabel(grade: CiaLevel | null | undefined): string {
  if (grade == null) return "미설정";
  return GRADE_LABELS[grade] ?? "미설정";
}

/** 등급 색상 */
export function getCiaGradeColor(grade: CiaLevel | null | undefined): string {
  if (grade == null) return "bg-gray-100 text-gray-500";
  return GRADE_COLORS[grade] ?? "bg-gray-100 text-gray-500";
}

/** 전체 평균 점수 (소수점 반올림). 점수 평균이므로 3점에 가까울수록 더 중요 */
export function getCiaOverallLevel(score: CiaScore): CiaLevel | null {
  const values = [score.ciaC, score.ciaI, score.ciaA].filter((v): v is CiaLevel => v != null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length) as CiaLevel;
}

/** 전체 등급 (점수 평균 → 등급 변환) */
export function getCiaOverallGrade(score: CiaScore): CiaLevel | null {
  const level = getCiaOverallLevel(score);
  return level != null ? scoreToGrade(level) : null;
}

/** 전체 등급 라벨 (배지용) */
export function getCiaOverallLabel(score: CiaScore): string {
  return getCiaGradeLabel(getCiaOverallGrade(score));
}

/** 전체 등급 색상 (배지용) */
export function getCiaOverallColor(score: CiaScore): string {
  return getCiaGradeColor(getCiaOverallGrade(score));
}
