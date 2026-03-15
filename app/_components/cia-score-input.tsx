"use client";

import type { CiaLevel } from "@/lib/cia";
import { getCiaLevelLabel, getCiaLevelColor } from "@/lib/cia";

interface CiaScoreInputProps {
  initialValues?: { ciaC: CiaLevel | null; ciaI: CiaLevel | null; ciaA: CiaLevel | null };
  onChange: (values: { ciaC: CiaLevel | null; ciaI: CiaLevel | null; ciaA: CiaLevel | null }) => void;
}

const DIMENSIONS = [
  { key: "ciaC" as const, label: "기밀성 (C)", description: "정보 유출 시 영향도" },
  { key: "ciaI" as const, label: "무결성 (I)", description: "정보 변조 시 영향도" },
  { key: "ciaA" as const, label: "가용성 (A)", description: "서비스 중단 시 영향도" },
];

const LEVELS: CiaLevel[] = [1, 2, 3];

export default function CiaScoreInput({ initialValues, onChange }: CiaScoreInputProps) {
  const values = initialValues ?? { ciaC: null, ciaI: null, ciaA: null };

  const handleChange = (key: "ciaC" | "ciaI" | "ciaA", level: CiaLevel | null) => {
    onChange({ ...values, [key]: level });
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">보안 등급 (CIA)</h2>
      <p className="mb-4 text-xs text-gray-500">자산의 기밀성, 무결성, 가용성 등급을 설정합니다. (1=낮음, 2=보통, 3=높음)</p>
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
                미설정
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
                  {level} - {getCiaLevelLabel(level)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
