"use client";

import type { CiaLevel, CiaScore } from "@/lib/cia";
import { getCiaOverallLevel, getCiaLevelColor } from "@/lib/cia";
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

  const LEVEL_LABELS: Record<CiaLevel, string> = {
    1: t.cia.low,
    2: t.cia.medium,
    3: t.cia.high,
  };

  const level = getCiaOverallLevel(score);
  const label = level != null ? LEVEL_LABELS[level] : t.cia.notEvaluated;
  const color = getCiaLevelColor(level);

  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
