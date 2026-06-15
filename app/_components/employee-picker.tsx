"use client";

// 직원 검색 피커 (dev-040) — 평면 <select>(500명 스크롤) 및 분산된 검색 리스트 통일.
// 두 축으로 변형:
//   · 데이터 소스: items 가 주어지면 그 목록을 클라이언트 검색, 없으면 서버 검색
//     (/api/employees?search=, 이름·부서·이메일 contains, 250ms 디바운스)
//   · 선택 방식: 기본 단일(팝오버 토글) / multi=true 다중(항상 열린 체크박스 리스트)
// single: 보안 조직도·하드웨어 상세 / multi: 라이선스 좌석 배정.

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";

type Emp = { id: number; name: string; department?: string | null; email?: string | null };

type CommonProps = {
  /** 주어지면 서버 검색 대신 이 목록을 클라이언트 검색 */
  items?: Emp[];
};

type SingleProps = CommonProps & {
  multi?: false;
  value: number | null;
  initialLabel?: string | null;
  onChange: (employeeId: number | null, label: string | null) => void;
  allowNone?: boolean;
};

type MultiProps = CommonProps & {
  multi: true;
  selectedIds: Set<number>;
  onToggle: (employeeId: number) => void;
  /** 목록에서 숨길 직원(이미 배정된 인원 등) */
  excludeIds?: number[];
  /** 선택 상한(좌석 수). 도달 시 미선택 항목 비활성 */
  maxSelect?: number;
};

type Props = SingleProps | MultiProps;

function useEmployeeSearch(items: Emp[] | undefined, search: string, active: boolean) {
  const [fetched, setFetched] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(false);

  // 클라이언트 검색 (items 제공 시)
  const clientFiltered = useMemo(() => {
    if (!items) return null;
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.department ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  // 서버 검색 (items 미제공 시, 활성 상태에서만)
  useEffect(() => {
    if (items || !active) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ status: "ACTIVE", limit: "50" });
        if (search.trim()) params.set("search", search.trim());
        const res = await fetch(`/api/employees?${params}`);
        const data = res.ok ? await res.json() : null;
        const list: Emp[] = Array.isArray(data) ? data : data?.data ?? data?.employees ?? [];
        if (!cancelled) setFetched(list);
      } catch {
        if (!cancelled) setFetched([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [items, search, active]);

  return { results: clientFiltered ?? fetched, loading: items ? false : loading };
}

const fmt = (e: Emp) => `${e.name}${e.department ? ` (${e.department})` : ""}`;
const INPUT = "w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function EmployeePicker(props: Props) {
  if (props.multi) return <MultiPicker {...props} />;
  return <SinglePicker {...props} />;
}

function SinglePicker({ value, initialLabel, onChange, allowNone = true, items }: SingleProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  // 방금 고른 항목(id+label). 표시 라벨은 effect 동기화 없이 파생 — 현재 value 와
  // 일치할 때만 그 라벨을, 아니면 외부 initialLabel 을 쓴다(편집 진입 시).
  const [picked, setPicked] = useState<{ id: number | null; label: string | null } | null>(null);
  const selectedLabel = picked && picked.id === value ? picked.label : value != null ? initialLabel ?? null : null;
  const boxRef = useRef<HTMLDivElement>(null);
  const { results, loading } = useEmployeeSearch(items, search, open);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(emp: Emp | null) {
    if (emp) { setPicked({ id: emp.id, label: fmt(emp) }); onChange(emp.id, fmt(emp)); }
    else { setPicked({ id: null, label: null }); onChange(null, null); }
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={boxRef} className="relative">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={`${INPUT} flex items-center justify-between text-left`}>
          <span className={selectedLabel ? "text-gray-900" : "text-gray-400"}>{selectedLabel ?? t.org.unassignedPerson}</span>
          <span className="text-gray-400">▾</span>
        </button>
      ) : (
        <input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.common.search} className={INPUT} />
      )}
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {allowNone && (
            <button type="button" onClick={() => pick(null)} className="block w-full px-2 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-50">
              {t.org.unassignedPerson}
            </button>
          )}
          {loading ? (
            <p className="px-2 py-2 text-center text-xs text-gray-400">{t.common.loading}</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-2 text-center text-xs text-gray-400">{t.common.noData}</p>
          ) : (
            results.map((emp) => (
              <button key={emp.id} type="button" onClick={() => pick(emp)}
                className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-blue-50 ${value === emp.id ? "bg-blue-100 font-medium text-blue-700" : "text-gray-700"}`}>
                {fmt(emp)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MultiPicker({ selectedIds, onToggle, excludeIds, maxSelect, items }: MultiProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { results, loading } = useEmployeeSearch(items, search, true);
  const excludeSet = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);
  const visible = results.filter((e) => !excludeSet.has(e.id));
  const atMax = maxSelect != null && selectedIds.size >= maxSelect;

  return (
    <div>
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.common.search} autoFocus className="input mb-3" />
      <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200">
        {loading ? (
          <p className="p-4 text-center text-sm text-gray-500">{t.common.loading}</p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">{t.common.noData}</p>
        ) : (
          visible.map((emp) => {
            const isChecked = selectedIds.has(emp.id);
            const isDisabled = !isChecked && atMax;
            return (
              <label key={emp.id}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isChecked ? "bg-blue-50" : isDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50"}`}>
                <input type="checkbox" checked={isChecked} disabled={isDisabled} onChange={() => onToggle(emp.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <span className="flex-1 font-medium text-gray-900">{emp.name}</span>
                <span className="text-xs text-gray-500">{emp.department}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
