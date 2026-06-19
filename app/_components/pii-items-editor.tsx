"use client";

// 자산 수집·보유 개인정보 항목 에디터 (dev-047) — 자산 생성/편집 폼 공용.
// 카탈로그(lib/pii-items.ts) 칩 다중선택 + 선택 항목별 보유기간·법적근거 입력.
// value 는 AssetPiiItem 일부 형태 배열로 폼과 주고받는다.

import { PII_ITEM_KEYS, PII_ITEM_CATALOG, PII_CATEGORY_STYLE, piiItemLabel } from "@/lib/pii-items";

export type PiiItemRow = {
  itemKey: string;
  legalBasis?: string | null;
  retentionPeriod?: string | null;
};

export default function PiiItemsEditor({
  value,
  onChange,
}: {
  value: PiiItemRow[];
  onChange: (rows: PiiItemRow[]) => void;
}) {
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
      <label className="mb-1 block text-xs font-medium text-gray-600">수집·보유 개인정보 항목</label>
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
              {PII_ITEM_CATALOG[key].label}
            </button>
          );
        })}
      </div>

      {/* 선택 항목별 보유기간·법적근거 (ISMS-P 흐름표 증적) */}
      {value.length > 0 && (
        <div className="mt-3 space-y-2 rounded-md border border-gray-200 p-2">
          {value.map((r) => {
            const st = PII_CATEGORY_STYLE[PII_ITEM_CATALOG[r.itemKey as keyof typeof PII_ITEM_CATALOG]?.category ?? "GENERAL"];
            return (
              <div key={r.itemKey} className="grid grid-cols-[80px_1fr_1fr] items-center gap-2">
                <span className="truncate rounded px-1.5 py-0.5 text-xs font-medium" style={{ backgroundColor: st.bg, color: st.text }}>
                  {piiItemLabel(r.itemKey)}
                </span>
                <input
                  type="text"
                  value={r.retentionPeriod ?? ""}
                  onChange={(e) => patchRow(r.itemKey, { retentionPeriod: e.target.value })}
                  placeholder="보유기간 (예: 탈퇴 후 5년)"
                  className={ic}
                />
                <input
                  type="text"
                  value={r.legalBasis ?? ""}
                  onChange={(e) => patchRow(r.itemKey, { legalBasis: e.target.value })}
                  placeholder="법적근거 (예: 동의)"
                  className={ic}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
