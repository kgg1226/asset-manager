"use client";

// 자산 수집·보유 개인정보 항목 에디터 (dev-047) — 자산 생성/편집 폼 공용.
// 카탈로그(lib/pii-items.ts) 칩 다중선택 + 선택 항목별 보유기간·법적근거 입력.
// value 는 AssetPiiItem 일부 형태 배열로 폼과 주고받는다.

import { PII_ITEM_KEYS, PII_ITEM_CATALOG, PII_CATEGORY_STYLE, piiItemLabelI18n } from "@/lib/pii-items";
import { PII_STAGES, piiStageLabelI18n } from "@/lib/pii-stage";
import { useTranslation } from "@/lib/i18n";

export type PiiItemRow = {
  itemKey: string;
  legalBasis?: string | null;
  retentionPeriod?: string | null;
  // 항목별 처리 단계(복수) — ISMS-P 흐름표 단계 컬럼. DB 엔 JSON 문자열로 저장(서버가 stringify),
  // 편집 로드 시 parsePiiItemRows 로 배열 복원. (dev-050 #7)
  lifecycleStages?: string[] | null;
  destructionMethod?: string | null;
  note?: string | null;
};

// 자산 GET 응답의 piiItems 를 PiiItemRow[] 로 정규화 — 편집 폼 공용.
// lifecycleStages 는 DB 에 JSON 문자열로 저장되므로 배열로 복원한다(없으면 null).
// 4개 edit 폼이 동일 로직을 인라인 복제하던 것을 단일 출처로 모은다.
export function parsePiiItemRows(raw: unknown): PiiItemRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => {
    const o = (p ?? {}) as Record<string, unknown>;
    let stages: string[] | null = null;
    if (Array.isArray(o.lifecycleStages)) {
      stages = (o.lifecycleStages as unknown[]).map(String);
    } else if (typeof o.lifecycleStages === "string" && o.lifecycleStages) {
      try {
        const arr = JSON.parse(o.lifecycleStages);
        if (Array.isArray(arr)) stages = arr.map(String);
      } catch {
        stages = null;
      }
    }
    return {
      itemKey: String(o.itemKey ?? ""),
      legalBasis: (o.legalBasis as string | null) ?? null,
      retentionPeriod: (o.retentionPeriod as string | null) ?? null,
      lifecycleStages: stages,
      destructionMethod: (o.destructionMethod as string | null) ?? null,
      note: (o.note as string | null) ?? null,
    };
  });
}

export default function PiiItemsEditor({
  value,
  onChange,
}: {
  value: PiiItemRow[];
  onChange: (rows: PiiItemRow[]) => void;
}) {
  const { t } = useTranslation();
  const selected = new Set(value.map((r) => r.itemKey));

  function toggle(key: string) {
    if (selected.has(key)) onChange(value.filter((r) => r.itemKey !== key));
    else onChange([...value, { itemKey: key }]);
  }
  function patchRow(key: string, patch: Partial<PiiItemRow>) {
    onChange(value.map((r) => (r.itemKey === key ? { ...r, ...patch } : r)));
  }

  const ic = "w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{t.pii.itemsLabel}</label>
      {/* 카탈로그 칩 — 분류별 색상, 클릭 토글 */}
      <div className="flex flex-wrap gap-1.5">
        {PII_ITEM_KEYS.map((key) => {
          const cat = PII_ITEM_CATALOG[key].category;
          const st = PII_CATEGORY_STYLE[cat];
          const on = selected.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="rounded-full px-2.5 py-1 text-xs font-medium transition"
              style={
                on
                  ? { backgroundColor: st.bg, color: st.text, boxShadow: `inset 0 0 0 1.5px ${st.text}` }
                  : { backgroundColor: "transparent", color: "#9ca3af", boxShadow: "inset 0 0 0 1px #e5e7eb" }
              }
            >
              {piiItemLabelI18n(key, t)}
            </button>
          );
        })}
      </div>

      {/* 선택 항목별 단계·보유기간·법적근거·파기방법·비고 (ISMS-P 흐름표 6컬럼 증적) */}
      {value.length > 0 && (
        <div className="mt-3 space-y-2">
          {value.map((r) => {
            const st = PII_CATEGORY_STYLE[PII_ITEM_CATALOG[r.itemKey as keyof typeof PII_ITEM_CATALOG]?.category ?? "GENERAL"];
            const stages = r.lifecycleStages ?? [];
            return (
              <div key={r.itemKey} className="space-y-1.5 rounded-md border border-gray-200 p-2">
                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-2">
                  <span className="truncate rounded px-1.5 py-0.5 text-xs font-medium" style={{ backgroundColor: st.bg, color: st.text }}>
                    {piiItemLabelI18n(r.itemKey, t)}
                  </span>
                  <input
                    type="text"
                    value={r.retentionPeriod ?? ""}
                    onChange={(e) => patchRow(r.itemKey, { retentionPeriod: e.target.value })}
                    placeholder={t.pii.retentionPlaceholder}
                    className={ic}
                  />
                  <input
                    type="text"
                    value={r.legalBasis ?? ""}
                    onChange={(e) => patchRow(r.itemKey, { legalBasis: e.target.value })}
                    placeholder={t.pii.legalBasisPlaceholder}
                    className={ic}
                  />
                </div>
                {/* 처리 단계 다중칩 — 한 항목이 여러 단계에 걸칠 수 있다(수집+저장 등) */}
                <div className="flex flex-wrap items-center gap-1 pl-[88px]">
                  {PII_STAGES.map((s) => {
                    const on = stages.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => patchRow(r.itemKey, { lifecycleStages: on ? stages.filter((x) => x !== s) : [...stages, s] })}
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium transition"
                        style={
                          on
                            ? { backgroundColor: "#DBEAFE", color: "#1E40AF", boxShadow: "inset 0 0 0 1px #93C5FD" }
                            : { backgroundColor: "transparent", color: "#9CA3AF", boxShadow: "inset 0 0 0 1px #E5E7EB" }
                        }
                      >
                        {piiStageLabelI18n(s, t)}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-2">
                  <span className="pl-1.5 text-[11px] text-gray-400">{t.pii.destructionNoteLabel}</span>
                  <input
                    type="text"
                    value={r.destructionMethod ?? ""}
                    onChange={(e) => patchRow(r.itemKey, { destructionMethod: e.target.value })}
                    placeholder={t.pii.destructionPlaceholder}
                    className={ic}
                  />
                  <input
                    type="text"
                    value={r.note ?? ""}
                    onChange={(e) => patchRow(r.itemKey, { note: e.target.value })}
                    placeholder={t.pii.notePlaceholder}
                    className={ic}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
