"use client";

import type { CiaLevel, CiaScore } from "@/lib/cia";
import { getCiaOverallGrade, getCiaGradeColor } from "@/lib/cia";
import { useTranslation } from "@/lib/i18n";

interface CiaBadgeProps {
  ciaC: number | null | undefined;
  ciaI: number | null | undefined;
  ciaA: number | null | undefined;
}

export default function CiaBadge({ ciaC, ciaI, ciaA }: CiaBadgeProps) {
  const { t } = useTranslation();
  const score: CiaScore = {
    ciaC: (ciaC as 1 | 2 | 3) ?? null,
    ciaI: (ciaI as 1 | 2 | 3) ?? null,
    ciaA: (ciaA as 1 | 2 | 3) ?? null,
  };

  // 등급 정책: 점수 평균 → 등급 (4 - avg). 1등급=최상, 3등급=최하.
  const GRADE_LABELS: Record<CiaLevel, string> = {
    1: t.cia.grade1,
    2: t.cia.grade2,
    3: t.cia.grade3,
  };

  const grade = getCiaOverallGrade(score);
  const label = grade != null ? GRADE_LABELS[grade] : t.cia.notEvaluated;
  const color = getCiaGradeColor(grade);

  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
