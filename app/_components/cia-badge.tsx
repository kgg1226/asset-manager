"use client";

import type { CiaScore } from "@/lib/cia";
import { getCiaOverallLabel, getCiaOverallColor } from "@/lib/cia";

interface CiaBadgeProps {
  ciaC: number | null | undefined;
  ciaI: number | null | undefined;
  ciaA: number | null | undefined;
}

export default function CiaBadge({ ciaC, ciaI, ciaA }: CiaBadgeProps) {
  const score: CiaScore = {
    ciaC: (ciaC as 1 | 2 | 3) ?? null,
    ciaI: (ciaI as 1 | 2 | 3) ?? null,
    ciaA: (ciaA as 1 | 2 | 3) ?? null,
  };

  const label = getCiaOverallLabel(score);
  const color = getCiaOverallColor(score);

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
