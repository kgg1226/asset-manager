"use client";

import Link from "next/link";
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

export default function EmployeesContent({
  employees,
  filtered,
  displayNames,
  query,
  status,
  unassigned,
  isLoggedIn,
}: {
  employees: EmployeeItem[];
  filtered: EmployeeItem[];
  displayNames: Record<number, string>;
  query: string;
  status: "ACTIVE" | "OFFBOARDING" | null;
  unassigned: boolean;
  isLoggedIn: boolean;
}) {
  const { t } = useTranslation();
  const { isAdmin } = useCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t.employee.title} {t.common.list}</h1>
          {isAdmin && (
            <Link
              href="/employees/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + {t.employee.newEmployee}
            </Link>
          )}
        </div>

        {/* 검색·필터 */}
        <EmployeeSearch currentQuery={query} currentStatus={status} currentUnassigned={unassigned} />

        {/* 결과 */}
        {filtered.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">
              {employees.length === 0 ? t.common.noData : t.common.noData}
            </p>
            {employees.length === 0 && isAdmin && (
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.name}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.employee.department}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.employee.email}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">{t.employee.assignedLicenses}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.status}</th>
                  {isAdmin && <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">{t.common.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((emp) => (
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
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
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
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {t.common.total} <span className="font-medium">{filtered.length}</span> (
              {status && `${status === "ACTIVE" ? t.employee.active : t.employee.inactive}`}
              {status && query && " + "}
              {query && `${t.common.search}: "${query}"`}
              {unassigned && ` + ${t.license.unassigned}`}
              )
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
