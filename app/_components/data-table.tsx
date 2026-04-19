"use client";

/**
 * DataTable — 필터·정렬·URL 상태 공통 컴포넌트
 *
 * 사용법:
 *   <DataTable
 *     columns={[{ key: "name", label: "이름", sortable: true }]}
 *     data={rows}
 *     filterKeys={["name", "vendor"]}
 *     urlState        // URL searchParams에 sort/order/search 동기화
 *   />
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronUp, ChevronDown, Search, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export type ColumnDef<T> = {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  /** Custom cell renderer. `row` is the full row object. */
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
};

type SortOrder = "asc" | "desc";

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Keys used for full-text filter (client-side). String comparison. */
  filterKeys?: (keyof T)[];
  /** Sync sort/order/search to URL searchParams */
  urlState?: boolean;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Key column used as React key. Defaults to "id". */
  rowKey?: keyof T;
  /** Additional header toolbar content (rendered to the right of search) */
  toolbar?: React.ReactNode;
  /** Shown when no data */
  emptyText?: string;
  loading?: boolean;
  loadingText?: string;
  /** Called when sort changes */
  onSortChange?: (field: string | null, order: SortOrder) => void;
  /** Called when filter changes */
  onFilterChange?: (value: string) => void;
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

function defaultSort<T extends Record<string, unknown>>(
  data: T[],
  field: string | null,
  order: SortOrder
): T[] {
  if (!field) return data;
  return [...data].sort((a, b) => {
    const av = getNestedValue(a, field);
    const bv = getNestedValue(b, field);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv), "ko");
    }
    return order === "desc" ? -cmp : cmp;
  });
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  filterKeys = [],
  urlState = false,
  searchPlaceholder,
  rowKey = "id" as keyof T,
  toolbar,
  emptyText,
  loading = false,
  loadingText,
  onSortChange,
  onFilterChange,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resolvedSearchPlaceholder = searchPlaceholder ?? t.common.search;
  const resolvedEmptyText = emptyText ?? t.common.noData;
  const resolvedLoadingText = loadingText ?? t.common.loading;

  const initSort = urlState ? (searchParams.get("sort") ?? null) : null;
  const initOrder = urlState ? ((searchParams.get("order") as SortOrder) ?? "asc") : "asc";
  const initFilter = urlState ? (searchParams.get("search") ?? "") : "";

  const [sortField, setSortField] = useState<string | null>(initSort);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initOrder);
  const [filterValue, setFilterValue] = useState(initFilter);

  const pushUrl = useCallback(
    (field: string | null, order: SortOrder, filter: string) => {
      if (!urlState) return;
      const params = new URLSearchParams(searchParams.toString());
      if (field) {
        params.set("sort", field);
        params.set("order", order);
      } else {
        params.delete("sort");
        params.delete("order");
      }
      if (filter) {
        params.set("search", filter);
      } else {
        params.delete("search");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [urlState, pathname, router, searchParams]
  );

  const handleSort = (key: string) => {
    let newField: string | null = key;
    let newOrder: SortOrder = "asc";
    if (sortField === key) {
      if (sortOrder === "asc") {
        newOrder = "desc";
      } else {
        newField = null;
        newOrder = "asc";
      }
    }
    setSortField(newField);
    setSortOrder(newOrder);
    onSortChange?.(newField, newOrder);
    pushUrl(newField, newOrder, filterValue);
  };

  const handleFilter = (value: string) => {
    setFilterValue(value);
    onFilterChange?.(value);
    pushUrl(sortField, sortOrder, value);
  };

  const filteredData = useMemo(() => {
    if (!filterValue.trim() || filterKeys.length === 0) return data;
    const q = filterValue.toLowerCase();
    return data.filter((row) =>
      filterKeys.some((key) => {
        const v = getNestedValue(row, String(key));
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, filterValue, filterKeys]);

  const sortedData = useMemo(
    () => defaultSort(filteredData, sortField, sortOrder),
    [filteredData, sortField, sortOrder]
  );

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300 text-xs">⇅</span>;
    return sortOrder === "asc"
      ? <ChevronUp className="ml-0.5 inline h-3 w-3 text-blue-600" />
      : <ChevronDown className="ml-0.5 inline h-3 w-3 text-blue-600" />;
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2">
        {filterKeys.length > 0 && (
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filterValue}
              onChange={(e) => handleFilter(e.target.value)}
              placeholder={resolvedSearchPlaceholder}
              className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {filterValue && (
              <button
                onClick={() => handleFilter("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {toolbar}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-max">
          <thead className="border-b bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap ${
                    col.sortable ? "cursor-pointer select-none hover:text-blue-600" : ""
                  } ${col.className ?? ""}`}
                >
                  {col.label}
                  {col.sortable && <SortIcon field={String(col.key)} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-400">
                  {resolvedLoadingText}
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                  {resolvedEmptyText}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr
                  key={String(row[rowKey] ?? Math.random())}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  {columns.map((col) => {
                    const value = getNestedValue(row, String(col.key));
                    return (
                      <td
                        key={String(col.key)}
                        className={`px-4 py-3 text-sm ${col.className ?? ""}`}
                      >
                        {col.render ? col.render(value, row) : (value != null ? String(value) : "—")}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Count footer */}
      {!loading && (
        <p className="mt-2 text-xs text-gray-500">
          {sortedData.length !== data.length
            ? `${sortedData.length} / ${data.length}건`
            : `${data.length}건`}
        </p>
      )}
    </div>
  );
}
