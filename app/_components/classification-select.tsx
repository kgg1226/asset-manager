"use client";

// 자산분류체계 캐스케이드 셀렉트 (dev-037) — 대분류 → 소분류 2단 선택.
// 자산 생성/편집 폼 공용. 트리는 자체 fetch(로그인 사용자 공용 API).
// subCategoryId 만 외부와 주고받는다 (Asset.subCategoryId).

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";

type SubCategory = { id: number; name: string; code: string };
type MajorCategory = { id: number; name: string; code: string; subCategories: SubCategory[] };

export default function ClassificationSelect({
  value,
  onChange,
  className,
}: {
  /** 선택된 소분류 ID (없으면 null) */
  value: number | null;
  onChange: (subCategoryId: number | null) => void;
  /** select 에 적용할 입력 클래스 (폼별 스타일 일치용) */
  className?: string;
}) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<MajorCategory[]>([]);
  const [majorId, setMajorId] = useState<number | "">("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/asset-classifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.categories) setCategories(j.categories); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 대분류는 파생값 — value(소분류)가 있으면 역추적, 없으면 사용자가 고른 majorId.
  // effect 내 setState 없이 편집 폼 초기화가 자연히 해결된다.
  const derivedMajorId =
    value != null
      ? categories.find((c) => c.subCategories.some((s) => s.id === value))?.id ?? majorId
      : majorId;
  const selectedMajor = categories.find((c) => c.id === derivedMajorId);
  const ic = className ?? "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  // 분류체계가 비어 있으면(미설정 조직) 폼을 어지럽히지 않도록 렌더하지 않음
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">{t.classification.majorCategory}</label>
        <select
          value={derivedMajorId}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : "";
            setMajorId(id);
            onChange(null); // 대분류 변경 시 소분류 초기화
          }}
          className={ic}
        >
          <option value="">{t.common.none}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">{t.classification.subCategory}</label>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={!selectedMajor}
          className={ic}
        >
          <option value="">{t.common.none}</option>
          {selectedMajor?.subCategories.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
