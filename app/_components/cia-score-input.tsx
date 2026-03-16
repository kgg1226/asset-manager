"use client";

import type { CiaLevel } from "@/lib/cia";
import { getCiaLevelColor } from "@/lib/cia";
import { useTranslation } from "@/lib/i18n";

interface CiaScoreInputProps {
  initialValues?: { ciaC: CiaLevel | null; ciaI: CiaLevel | null; ciaA: CiaLevel | null };
  onChange: (values: { ciaC: CiaLevel | null; ciaI: CiaLevel | null; ciaA: CiaLevel | null }) => void;
}

const LEVELS: CiaLevel[] = [1, 2, 3];

export default function CiaScoreInput({ initialValues, onChange }: CiaScoreInputProps) {
  const { t } = useTranslation();
  const values = initialValues ?? { ciaC: null, ciaI: null, ciaA: null };

  const DIMENSIONS = [
    { key: "ciaC" as const, label: t.cia.confidentiality, description: t.cia.confidentiality },
    { key: "ciaI" as const, label: t.cia.integrity, description: t.cia.integrity },
    { key: "ciaA" as const, label: t.cia.availability, description: t.cia.availability },
  ];

  const LEVEL_LABELS: Record<CiaLevel, string> = {
    1: t.cia.low,
    2: t.cia.medium,
    3: t.cia.high,
  };

  const handleChange = (key: "ciaC" | "ciaI" | "ciaA", level: CiaLevel | null) => {
    onChange({ ...values, [key]: level });
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{t.cia.title}</h2>
      <p className="mb-4 text-xs text-gray-500">{t.cia.evaluateAll}</p>
      <div className="space-y-4">
        {DIMENSIONS.map(({ key, label, description }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <p className="mb-2 text-xs text-gray-400">{description}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChange(key, null)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                  values[key] == null
                    ? "bg-gray-200 text-gray-800 border-gray-400"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {t.cia.notEvaluated}
              </button>
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleChange(key, level)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                    values[key] === level
                      ? getCiaLevelColor(level) + " border-current"
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {level} - {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
