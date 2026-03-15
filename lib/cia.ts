// CIA (Confidentiality, Integrity, Availability) 보안 등급 유틸리티

export type CiaLevel = 1 | 2 | 3;

export interface CiaScore {
  ciaC: CiaLevel | null;
  ciaI: CiaLevel | null;
  ciaA: CiaLevel | null;
}

const LEVEL_LABELS: Record<CiaLevel, string> = {
  1: "낮음",
  2: "보통",
  3: "높음",
};

const LEVEL_COLORS: Record<CiaLevel, string> = {
  1: "bg-green-100 text-green-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-red-100 text-red-800",
};

export function getCiaLevelLabel(level: CiaLevel | null | undefined): string {
  if (level == null) return "미설정";
  return LEVEL_LABELS[level] ?? "미설정";
}

export function getCiaLevelColor(level: CiaLevel | null | undefined): string {
  if (level == null) return "bg-gray-100 text-gray-500";
  return LEVEL_COLORS[level] ?? "bg-gray-100 text-gray-500";
}

/** 전체 CIA 평균 등급 (소수점 반올림) */
export function getCiaOverallLevel(score: CiaScore): CiaLevel | null {
  const values = [score.ciaC, score.ciaI, score.ciaA].filter((v): v is CiaLevel => v != null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length) as CiaLevel;
}

/** 전체 등급 라벨 (배지용) */
export function getCiaOverallLabel(score: CiaScore): string {
  const level = getCiaOverallLevel(score);
  return getCiaLevelLabel(level);
}

/** 전체 등급 색상 (배지용) */
export function getCiaOverallColor(score: CiaScore): string {
  const level = getCiaOverallLevel(score);
  return getCiaLevelColor(level);
}
