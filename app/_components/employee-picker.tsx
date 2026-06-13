"use client";

// 직원 검색 피커 (dev-040) — 평면 <select>(500명 스크롤) 대체.
// 서버 검색(/api/employees?search=, 이름·부서·이메일 contains)을 디바운스 호출해
// 결과를 좁힌다. 단일 선택. 좁은 카드/모달 어디든 들어가도록 컴팩트.

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";

type Emp = { id: number; name: string; department?: string | null; email?: string | null };

export default function EmployeePicker({
  value,
  initialLabel,
  onChange,
  allowNone = true,
}: {
  value: number | null;
  /** 편집 진입 시 현재 선택된 직원 표시용 (목록 재조회 없이) */
  initialLabel?: string | null;
  onChange: (employeeId: number | null, label: string | null) => void;
  allowNone?: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Emp[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // 선택된 직원의 표시 라벨 — 선택/초기값에서 유지(목록이 비어도 표시 가능)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(initialLabel ?? null);
  const boxRef = useRef<HTMLDivElement>(null);

  // value 가 외부에서 바뀌면 라벨 동기화(편집 대상 전환)
  useEffect(() => {
    if (value == null) setSelectedLabel(null);
    else if (initialLabel) setSelectedLabel(initialLabel);
  }, [value, initialLabel]);

  // 디바운스 서버 검색 (열려 있을 때만)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ status: "ACTIVE", limit: "50" });
        if (search.trim()) params.set("search", search.trim());
        const res = await fetch(`/api/employees?${params}`);
        const data = res.ok ? await res.json() : null;
        const list: Emp[] = Array.isArray(data) ? data : data?.data ?? data?.employees ?? [];
        if (!cancelled) setResults(list);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, open]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const fmt = (e: Emp) => `${e.name}${e.department ? ` (${e.department})` : ""}`;

  function pick(emp: Emp | null) {
    if (emp) {
      setSelectedLabel(fmt(emp));
      onChange(emp.id, fmt(emp));
    } else {
      setSelectedLabel(null);
      onChange(null, null);
    }
    setOpen(false);
    setSearch("");
  }

  const ic = "w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div ref={boxRef} className="relative">
      {/* 현재 선택 표시 / 검색 토글 */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${ic} flex items-center justify-between text-left`}
        >
          <span className={selectedLabel ? "text-gray-900" : "text-gray-400"}>
            {selectedLabel ?? t.org.unassignedPerson}
          </span>
          <span className="text-gray-400">▾</span>
        </button>
      ) : (
        <input
          autoFocus
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.common.search}
          className={ic}
        />
      )}

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {allowNone && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="block w-full px-2 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-50"
            >
              {t.org.unassignedPerson}
            </button>
          )}
          {loading ? (
            <p className="px-2 py-2 text-center text-xs text-gray-400">{t.common.loading}</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-2 text-center text-xs text-gray-400">{t.common.noData}</p>
          ) : (
            results.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => pick(emp)}
                className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-blue-50 ${value === emp.id ? "bg-blue-100 font-medium text-blue-700" : "text-gray-700"}`}
              >
                {fmt(emp)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
