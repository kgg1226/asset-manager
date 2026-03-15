"use client";

import type { CiaLevel } from "@/lib/cia";
import { getCiaLevelLabel, getCiaLevelColor } from "@/lib/cia";

interface CiaScoreDisplayProps {
  ciaC: number | null | undefined;
  ciaI: number | null | undefined;
  ciaA: number | null | undefined;
}

const DIMENSIONS = [
  { key: "ciaC" as const, label: "기밀성 (C)" },
  { key: "ciaI" as const, label: "무결성 (I)" },
  { key: "ciaA" as const, label: "가용성 (A)" },
];

export default function CiaScoreDisplay({ ciaC, ciaI, ciaA }: CiaScoreDisplayProps) {
  const values = { ciaC: ciaC ?? null, ciaI: ciaI ?? null, ciaA: ciaA ?? null };
  const hasAny = ciaC != null || ciaI != null || ciaA != null;

  if (!hasAny) return null;

  return (
    <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">보안 등급 (CIA)</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {DIMENSIONS.map(({ key, label }) => {
          const level = values[key] as CiaLevel | null;
          return (
            <div key={key}>
              <p className="text-sm text-gray-600">{label}</p>
              <p className="mt-1">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${getCiaLevelColor(level)}`}
                >
                  {level != null ? `${level} - ${getCiaLevelLabel(level)}` : "미설정"}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
