"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { CURRENCY_SYMBOLS } from "@/lib/cost-calculator";
import DeleteButton from "./delete-button";
import AssignButton from "./assign-button";
import UnassignButton from "./unassign-button";
import LicenseRow from "./license-row";
import { LifecycleGaugeInline } from "@/app/_components/lifecycle-gauge";

type SortField = "name" | "totalQuantity" | "assigned" | "expiryDate";
type SortOrder = "asc" | "desc";

type LicenseType = "NO_KEY" | "KEY_BASED" | "VOLUME";

type EnrichedLicense = {
  id: number;
  name: string;
  licenseType: LicenseType;
  totalQuantity: number;
  totalAmountKRW: number | null;
  paymentCycle: "MONTHLY" | "YEARLY" | null;
  purchaseDate: Date | null;
  expiryDate: Date | null;
  noticePeriodDays: number | null;
  adminName: string | null;
  parentId: number | null;
  assignedCount: number;
  maxCapacity: number;
  missingKeyCount: number;
  remainingCount: number;
  assignedEmployeeIds: number[];
  assignedEmployees: {
    assignmentId: number;
    employeeId: number;
    employeeName: string;
    department: string;
  }[];
  depth: number;
};

type Employee = {
  id: number;
  name: string;
  department: string;
};

interface LicensesContentProps {
  licenses: EnrichedLicense[];
  employees: Employee[];
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  sortField: SortField;
  sortOrder: SortOrder;
  isLoggedIn: boolean;
}

const badgeColors = {
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-700",
};

export default function LicensesContent({
  licenses,
  employees,
  totalCount,
  currentPage,
  itemsPerPage,
  sortField,
  sortOrder,
  isLoggedIn,
}: LicensesContentProps) {
  const { t, locale } = useTranslation();

  const SORTABLE_COLUMNS: { key: SortField; label: string }[] = [
    { key: "name", label: t.license.licenseName },
    { key: "totalQuantity", label: t.license.quantity },
    { key: "assigned", label: t.license.seatAssignment },
    { key: "expiryDate", label: t.license.expiryDate },
  ];

  function formatAnnualCost(
    totalAmountKRW: number | null,
    paymentCycle: "MONTHLY" | "YEARLY" | null
  ): string {
    if (!totalAmountKRW || !paymentCycle) return "\u2014";
    const annual =
      paymentCycle === "YEARLY" ? totalAmountKRW : totalAmountKRW * 12;
    return CURRENCY_SYMBOLS["KRW"] + annual.toLocaleString();
  }

  function getNoticeBadge(
    expiryDate: string | null,
    noticePeriodDays: number | null
  ): { label: string; variant: "red" | "yellow" | "green" } | null {
    if (!expiryDate || !noticePeriodDays) return null;

    const noticeDate = new Date(expiryDate);
    noticeDate.setDate(noticeDate.getDate() - noticePeriodDays);

    const now = new Date();
    const diffMs = noticeDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: locale === "en" ? "Overdue" : "\uAE30\uD55C \uCD08\uACFC", variant: "red" };
    if (diffDays <= 7) return { label: `D-${diffDays}`, variant: "red" };
    if (diffDays <= 30) return { label: `D-${diffDays}`, variant: "yellow" };
    return { label: `D-${diffDays}`, variant: "green" };
  }

  function sortUrl(field: SortField): string {
    const nextOrder = sortField === field && sortOrder === "asc" ? "desc" : "asc";
    return `/licenses?sort=${field}&order=${nextOrder}`;
  }

  function sortIndicator(field: SortField): string {
    if (sortField !== field) return "";
    return sortOrder === "asc" ? " \u2191" : " \u2193";
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "\u2014";
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {t.license.title} {t.common.list}
          </h1>
          {isLoggedIn && (
            <Link
              href="/licenses/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + {t.license.newLicense}
            </Link>
          )}
        </div>

        {licenses.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">{t.common.noData}</p>
            <Link
              href="/licenses/new"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              {t.license.newLicense} &rarr;
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {SORTABLE_COLUMNS.map((col) => (
                      <th key={col.key} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap">
                        <Link
                          href={sortUrl(col.key)}
                          className="inline-flex items-center gap-1 hover:text-gray-900"
                        >
                          {col.label}
                          <span className="text-blue-500">{sortIndicator(col.key)}</span>
                        </Link>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 whitespace-nowrap">
                      {t.license.yearly} {t.asset.cost}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap">
                      {t.license.adminName}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap">
                      {t.license.noticePeriod}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap">
                      {t.lifecycle.heading}
                    </th>
                    {isLoggedIn && (
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 whitespace-nowrap">
                        {t.common.actions}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {licenses.map((license) => {
                    const badge = getNoticeBadge(
                      license.expiryDate ? new Date(license.expiryDate).toISOString() : null,
                      license.noticePeriodDays
                    );
                    const pct = license.maxCapacity > 0
                      ? Math.round((license.assignedCount / license.maxCapacity) * 100)
                      : 0;
                    const barColor =
                      pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-blue-500";

                    return (
                      <LicenseRow key={license.id} id={license.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <span className="inline-flex items-center gap-1.5" style={{ paddingLeft: license.depth > 0 ? `${license.depth * 16}px` : undefined }}>
                            {license.depth > 0 && (
                              <span className="text-gray-400 select-none">{"\u2514\u2500"}</span>
                            )}
                            {license.name}
                            {license.licenseType === "VOLUME" && (
                              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                                {t.license.volume}
                              </span>
                            )}
                            {license.licenseType === "KEY_BASED" && license.missingKeyCount > 0 && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                {t.license.key} {t.license.unassigned} {license.missingKeyCount}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">
                          {license.maxCapacity === 0 ? (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                              {t.license.group}
                            </span>
                          ) : license.maxCapacity}
                        </td>
                        <td className="px-4 py-3">
                          {license.maxCapacity === 0 ? (
                            <span className="text-sm text-gray-400">{"\u2014"}</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-gray-200">
                                <div
                                  className={`h-2 rounded-full ${barColor}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm tabular-nums text-gray-600">
                                {license.assignedCount} / {license.maxCapacity}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(license.expiryDate ? new Date(license.expiryDate).toISOString() : null)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right tabular-nums">
                          {formatAnnualCost(license.totalAmountKRW, license.paymentCycle)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {license.adminName ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {badge ? (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[badge.variant]}`}>
                              {badge.label}
                            </span>
                          ) : (
                            <span className="text-gray-400">{"\u2014"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <LifecycleGaugeInline
                            startDate={license.purchaseDate}
                            endDate={license.expiryDate}
                          />
                        </td>
                        {isLoggedIn && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {license.maxCapacity > 0 ? (
                                <AssignButton
                                  licenseId={license.id}
                                  licenseName={license.name}
                                  remaining={license.remainingCount}
                                  employees={employees}
                                  assignedEmployeeIds={license.assignedEmployeeIds}
                                  licenseType={license.licenseType}
                                />
                              ) : <span className="inline-block w-8" />}
                              {license.maxCapacity > 0 ? (
                                <UnassignButton
                                  licenseName={license.name}
                                  assignedEmployees={license.assignedEmployees}
                                />
                              ) : <span className="inline-block w-8" />}
                              <DeleteButton id={license.id} name={license.name} />
                            </div>
                          </td>
                        )}
                      </LicenseRow>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > itemsPerPage && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {t.common.total} <span className="font-medium">{totalCount}</span> {t.license.title}
                  <span className="ml-2">
                    ({(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, totalCount)})
                  </span>
                </div>

                <div className="flex gap-1">
                  {currentPage > 1 && (
                    <Link
                      href={`/licenses?sort=${sortField}&order=${sortOrder}&page=1`}
                      className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      &larr;
                    </Link>
                  )}

                  {currentPage > 1 && (
                    <Link
                      href={`/licenses?sort=${sortField}&order=${sortOrder}&page=${currentPage - 1}`}
                      className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      &lsaquo; {t.common.back}
                    </Link>
                  )}

                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: Math.min(5, Math.ceil(totalCount / itemsPerPage)) }).map(
                      (_, i) => {
                        const pageNum =
                          currentPage <= 3
                            ? i + 1
                            : i + currentPage - 2;
                        const totalPages = Math.ceil(totalCount / itemsPerPage);
                        if (pageNum > totalPages) return null;
                        return (
                          <Link
                            key={pageNum}
                            href={`/licenses?sort=${sortField}&order=${sortOrder}&page=${pageNum}`}
                            className={`inline-flex items-center justify-center rounded px-2 py-1.5 text-sm ${
                              currentPage === pageNum
                                ? "bg-blue-600 text-white font-medium"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {pageNum}
                          </Link>
                        );
                      }
                    )}
                  </div>

                  {currentPage < Math.ceil(totalCount / itemsPerPage) && (
                    <Link
                      href={`/licenses?sort=${sortField}&order=${sortOrder}&page=${currentPage + 1}`}
                      className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      {t.common.next} &rsaquo;
                    </Link>
                  )}

                  {currentPage < Math.ceil(totalCount / itemsPerPage) && (
                    <Link
                      href={`/licenses?sort=${sortField}&order=${sortOrder}&page=${Math.ceil(totalCount / itemsPerPage)}`}
                      className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      &rarr;
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
