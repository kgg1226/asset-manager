"use client";

import type { CiaLevel } from "@/lib/cia";
import { getCiaLevelColor } from "@/lib/cia";
import { useTranslation } from "@/lib/i18n";

interface CiaScoreDisplayProps {
  ciaC: number | null | undefined;
  ciaI: number | null | undefined;
  ciaA: number | null | undefined;
}

export default function CiaScoreDisplay({ ciaC, ciaI, ciaA }: CiaScoreDisplayProps) {
  const { t } = useTranslation();
  const values = { ciaC: ciaC ?? null, ciaI: ciaI ?? null, ciaA: ciaA ?? null };
  const hasAny = ciaC != null || ciaI != null || ciaA != null;

  if (!hasAny) return null;

  const DIMENSIONS = [
    { key: "ciaC" as const, label: t.cia.confidentiality },
    { key: "ciaI" as const, label: t.cia.integrity },
    { key: "ciaA" as const, label: t.cia.availability },
  ];

  const LEVEL_LABELS: Record<CiaLevel, string> = {
    1: t.cia.low,
    2: t.cia.medium,
    3: t.cia.high,
  };

  return (
    <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">{t.cia.title}</h2>
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
                  {level != null ? `${level} - ${LEVEL_LABELS[level]}` : t.cia.notEvaluated}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
