"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import DeleteEmployeeButton from "./delete-button";
import EmployeeSearch from "./employee-search";
import { useTranslation } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/hooks/use-current-user";

type EmployeeItem = {
  id: number;
  name: string;
  department: string | null;
  email: string | null;
  status: string;
  assignmentCount: number;
};

type SortField = "name" | "department" | "status";

export default function EmployeesContent({
  rows,
  total,
  page,
  pageSize,
  displayNames,
  query,
  status,
  unassigned,
  sort,
  order,
}: {
  rows: EmployeeItem[];
  total: number;
  page: number;
  pageSize: number;
  displayNames: Record<number, string>;
  query: string;
  status: "ACTIVE" | "OFFBOARDING" | null;
  unassigned: boolean;
  sort: SortField;
  order: "asc" | "desc";
  isLoggedIn: boolean;
}) {
  const { t } = useTranslation();
  const { isAdmin } = useCurrentUser();
  const pathname = usePathname();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = !!query || !!status || unassigned;

  // q/status/unassigned 를 보존하면서 sort/order/page 만 바꾼 링크 생성
  function makeHref(next: { sort?: SortField; order?: "asc" | "desc"; page?: number }) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (status) p.set("status", status);
    if (unassigned) p.set("unassigned", "true");
    const s = next.sort ?? sort;
    const o = next.order ?? order;
    const pg = next.page ?? page;
    if (s !== "name") p.set("sort", s);
    if (o !== "asc") p.set("order", o);
    if (pg > 1) p.set("page", String(pg));
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  // 렌더 헬퍼 (컴포넌트 아님 — 렌더 중 컴포넌트 생성 회피)
  function sortHeader(field: SortField, label: string) {
    const active = sort === field;
    const nextOrder: "asc" | "desc" = active && order === "asc" ? "desc" : "asc";
    return (
      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
        <Link
          href={makeHref({ sort: field, order: nextOrder, page: 1 })}
          scroll={false}
          className="inline-flex items-center gap-1 hover:text-gray-700"
          aria-label={label}
        >
          {label}
          {active && (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
        </Link>
      </th>
    );
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + rows.length;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.employee.title} {t.common.list}</h1>
          {isAdmin && (
            <Link
              href="/employees/new"
              className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + {t.employee.newEmployee}
            </Link>
          )}
        </div>

        {/* 검색·필터 */}
        <EmployeeSearch currentQuery={query} currentStatus={status} currentUnassigned={unassigned} />

        {/* 결과 */}
        {rows.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">{t.common.noData}</p>
            {!hasFilters && isAdmin && (
              <Link
                href="/employees/new"
                className="mt-3 inline-block text-sm text-blue-600 hover:underline"
              >
                {t.employee.newEmployee} &rarr;
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {sortHeader("name", t.common.name)}
                  {sortHeader("department", t.employee.department)}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.employee.email}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">{t.employee.assignedLicenses}</th>
                  {sortHeader("status", t.common.status)}
                  {isAdmin && <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">{t.common.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link href={`/employees/${emp.id}`} className="hover:text-blue-600 hover:underline">
                        {displayNames[emp.id]}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.department && emp.department !== "-" ? emp.department : "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.email ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{emp.assignmentCount}</td>
                    <td className="px-4 py-3 text-sm">
                      {emp.status === "OFFBOARDING" ? (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          {t.employee.inactive}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          {t.employee.active}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/employees/${emp.id}`}
                            className="whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            {t.common.detail}
                          </Link>
                          <DeleteEmployeeButton id={emp.id} name={emp.name} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <span>
                {t.common.total} <span className="font-medium">{total}</span>
                {total > 0 && <span className="ml-1 text-gray-400">({from}–{to})</span>}
                {(status || query || unassigned) && (
                  <span className="ml-1 text-gray-400">
                    {" · "}
                    {status && `${status === "ACTIVE" ? t.employee.active : t.employee.inactive}`}
                    {status && query && " + "}
                    {query && `${t.common.search}: "${query}"`}
                    {unassigned && ` + ${t.license.unassigned}`}
                  </span>
                )}
              </span>
              {totalPages > 1 && (
                <span className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={makeHref({ page: page - 1 })} scroll={false} className="rounded p-1 hover:bg-gray-200" aria-label="prev">
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed p-1 text-gray-300"><ChevronLeft className="h-4 w-4" /></span>
                  )}
                  <span className="tabular-nums">{page} / {totalPages}</span>
                  {page < totalPages ? (
                    <Link href={makeHref({ page: page + 1 })} scroll={false} className="rounded p-1 hover:bg-gray-200" aria-label="next">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed p-1 text-gray-300"><ChevronRight className="h-4 w-4" /></span>
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
