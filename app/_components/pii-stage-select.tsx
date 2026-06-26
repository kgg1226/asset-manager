"use client";

// 개인정보 처리 단계 셀렉트 (dev-039) — 자산 생성/편집 폼 공용.
// Asset.piiStage 를 명시적으로 지정해 자산맵 흐름도가 이름 패턴 추측 대신
// 관리자 지정값으로 단계를 배치하게 한다(증적 정확도). 선택 필드(미지정=null).

import { useTranslation } from "@/lib/i18n";
import { PII_STAGES, type PiiStage } from "@/lib/pii-stage";

export default function PiiStageSelect({
  value,
  onChange,
  className,
}: {
  value: PiiStage | null;
  onChange: (stage: PiiStage | null) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const ic = className ?? "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  // 코드값 → i18n 라벨 (단계명은 기존 키 재사용)
  const LABELS: Record<PiiStage, string> = {
    COLLECTION: t.assetMap.piiCollection,
    STORAGE: t.assetMap.piiStorage,
    USAGE_PROVISION: t.assetMap.piiUsageProvision,
    DESTRUCTION: t.assetMap.piiDestruction,
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{t.assetMap.piiStageField}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? (e.target.value as PiiStage) : null)}
        className={ic}
      >
        <option value="">{t.assetMap.piiStageNone}</option>
        {PII_STAGES.map((s) => (
          <option key={s} value={s}>{LABELS[s]}</option>
        ))}
      </select>
    </div>
  );
}
