"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import {
  KeyRound,
  Users,
  CheckCircle,
  AlertTriangle,
  Calendar,
  CreditCard,
  UserCircle,
  FileText,
  Clock,
  Calculator,
} from "lucide-react";
import LicenseAssignments from "./license-assignments";
import type { Currency, PaymentCycle } from "@/lib/cost-calculator";
import { CURRENCY_SYMBOLS, PAYMENT_CYCLE_LABELS } from "@/lib/cost-calculator";
import {
  RenewalStatusPanel,
  RenewalHistoryPanel,
  LicenseOwnersPanel,
} from "./license-renewal";

// Serialized types (dates as ISO strings for client transport)
type SeatData = {
  id: number;
  key: string | null;
  assignments: {
    id: number;
    employee: { id: number; name: string; department: string | null };
    assignedDate: string;
  }[];
};

type ChildLicense = {
  id: number;
  name: string;
  licenseType: string;
  totalQuantity: number;
  expiryDate: string | null;
  assignments: { id: number }[];
};

type AssignmentRow = {
  assignmentId: number;
  employeeId: number;
  employeeName: string;
  department: string;
  assignedDate: string;
  seatKey: string | null;
  licenseType: "NO_KEY" | "KEY_BASED" | "VOLUME";
  volumeKey: string | null;
};

type HistoryEntry = {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  source: "assignment" | "audit";
};

type CostBreakdownData = {
  totalAmountForeign: number;
  monthlyKRW: number;
  annualKRW: number;
};

type UserOption = { id: number; username: string };
type OrgUnitOption = { id: number; name: string; companyId: number };

interface LicenseDetailContentProps {
  licenseId: number;
  license: {
    name: string;
    licenseType: string;
    key: string | null;
    description: string | null;
    purchaseDate: string | null;
    expiryDate: string | null;
    price: number | null;
    adminName: string | null;
    noticePeriodDays: number | null;
    quantity: number | null;
    unitPrice: number | null;
    paymentCycle: string | null;
    currency: string;
    exchangeRate: number;
    isVatIncluded: boolean;
    renewalStatus?: string | null;
    renewalDate?: string | null;
    renewalDateManual?: string | null;
    parent: { id: number; name: string } | null;
  };
  seats: SeatData[];
  children: ChildLicense[];
  // Duplicate children block in original page — we handle both
  childrenSecond: ChildLicense[];
  assignmentData: AssignmentRow[];
  displayHistory: HistoryEntry[];
  costBreakdown: CostBreakdownData | null;
  hasCostData: boolean;
  totalSeats: number;
  assignedCount: number;
  remainingCount: number;
  missingKeyCount: number;
  isKeyBased: boolean;
  isLoggedIn: boolean;
  users: UserOption[];
  orgUnits: OrgUnitOption[];
}

const actionBadge: Record<string, string> = {
  ASSIGNED: "text-green-700 bg-green-50",
  RETURNED: "text-yellow-700 bg-yellow-50",
  REVOKED: "text-red-700 bg-red-50",
  UNASSIGNED: "text-red-700 bg-red-50",
  CREATED: "text-purple-700 bg-purple-50",
  UPDATED: "text-blue-700 bg-blue-50",
  DELETED: "text-red-700 bg-red-50",
  IMPORTED: "text-indigo-700 bg-indigo-50",
};

export default function LicenseDetailContent({
  licenseId,
  license,
  seats,
  children,
  childrenSecond,
  assignmentData,
  displayHistory,
  costBreakdown,
  hasCostData,
  totalSeats,
  assignedCount,
  remainingCount,
  missingKeyCount,
  isKeyBased,
  isLoggedIn,
  users,
  orgUnits,
}: LicenseDetailContentProps) {
  const { t, locale } = useTranslation();

  const localeTag = locale === "en" ? "en-US" : "ko-KR";

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString(localeTag);
  }

  function formatPrice(price: number | null): string {
    if (price === null) return "\u2014";
    if (locale === "en") return "\u20A9" + price.toLocaleString("en-US");
    return price.toLocaleString("ko-KR") + "\uC6D0";
  }

  const actionLabelMap: Record<string, string> = {
    ASSIGNED: t.license.assignedTo.split(" ")[0] || t.dashboard.assigned,
    RETURNED: t.history.title.includes("History") ? "Returned" : "\uBC18\uB0A9",
    REVOKED: t.history.title.includes("History") ? "Revoked" : "\uD574\uC81C",
    UNASSIGNED: t.license.unassigned,
    CREATED: t.history.created,
    UPDATED: t.history.updated,
    DELETED: t.history.deleted,
    IMPORTED: t.common.import,
  };

  const typeLabel =
    license.licenseType === "VOLUME" ? t.license.volume : null;

  const currencySymbol = CURRENCY_SYMBOLS[license.currency as Currency];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        {/* Parent breadcrumb */}
        {license.parent && (
          <div className="mb-2 text-sm text-gray-500">
            <Link href={`/licenses/${license.parent.id}`} className="text-blue-600 hover:underline">
              {license.parent.name}
            </Link>
            <span className="mx-1">/</span>
            <span className="text-gray-700">{license.name}</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{license.name}</h1>
            {typeLabel && (
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                license.licenseType === "VOLUME"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {typeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <Link
                href={`/licenses/${licenseId}/edit`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t.common.edit}
              </Link>
            )}
            <Link
              href="/licenses"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; {t.common.list}
            </Link>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DashboardCard
            icon={<KeyRound className="h-5 w-5 text-blue-600" />}
            label={`${t.common.total} ${t.license.seat}`}
            value={totalSeats}
          />
          <DashboardCard
            icon={<Users className="h-5 w-5 text-green-600" />}
            label={t.dashboard.assigned}
            value={assignedCount}
          />
          <DashboardCard
            icon={<CheckCircle className="h-5 w-5 text-gray-500" />}
            label={t.dashboard.available}
            value={remainingCount}
          />
          {isKeyBased && (
            <DashboardCard
              icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
              label={`${t.license.key} ${t.license.unassigned}`}
              value={missingKeyCount}
              warning={missingKeyCount > 0}
            />
          )}
        </div>

        {/* Basic Info */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {locale === "en" ? "Basic Information" : "\uAE30\uBCF8 \uC815\uBCF4"}
          </h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label={t.license.purchaseDate}
              value={formatDate(license.purchaseDate)}
            />
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label={t.license.expiryDate}
              value={formatDate(license.expiryDate)}
            />
            <InfoItem
              icon={<CreditCard className="h-4 w-4" />}
              label={t.license.price}
              value={formatPrice(license.price)}
            />
            <InfoItem
              icon={<UserCircle className="h-4 w-4" />}
              label={t.license.adminName}
              value={license.adminName ?? "\u2014"}
            />
            <InfoItem
              icon={<Clock className="h-4 w-4" />}
              label={t.license.noticePeriod}
              value={
                license.noticePeriodDays
                  ? locale === "en"
                    ? `${license.noticePeriodDays} days before renewal`
                    : `\uAC31\uC2E0 ${license.noticePeriodDays}\uC77C \uC804`
                  : "\u2014"
              }
            />
            {license.licenseType === "VOLUME" && license.key && (
              <div className="sm:col-span-3">
                <InfoItem
                  icon={<KeyRound className="h-4 w-4" />}
                  label={`${t.license.volume} ${t.license.key}`}
                  value={license.key}
                  mono
                />
              </div>
            )}
            {license.description && (
              <div className="sm:col-span-3">
                <InfoItem
                  icon={<FileText className="h-4 w-4" />}
                  label={t.common.description}
                  value={license.description}
                />
              </div>
            )}
          </dl>
        </div>

        {/* Cost Breakdown */}
        {costBreakdown && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Calculator className="h-5 w-5 text-blue-500" />
              {t.license.costInfo}
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label={t.license.paymentCycle}
                value={PAYMENT_CYCLE_LABELS[license.paymentCycle! as PaymentCycle]}
              />
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label={`${t.license.unitPrice} (${currencySymbol})`}
                value={`${currencySymbol}${license.unitPrice!.toLocaleString(localeTag)}`}
              />
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label={t.license.quantity}
                value={`${license.quantity!.toLocaleString(localeTag)}${locale === "en" ? "" : "\uAC1C"}`}
              />
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label={`${t.license.totalAmount} (${currencySymbol})`}
                value={`${currencySymbol}${costBreakdown.totalAmountForeign.toLocaleString(localeTag)} (${t.license.vatIncluded})`}
              />
              {license.currency !== "KRW" && (
                <InfoItem
                  icon={<CreditCard className="h-4 w-4" />}
                  label={t.license.exchangeRate}
                  value={`1 ${license.currency} = \u20A9${license.exchangeRate.toLocaleString(localeTag)}`}
                />
              )}
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-md bg-blue-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  {t.license.monthly} (\u20A9)
                </p>
                <p className="mt-1 text-xl font-bold text-blue-700">
                  \u20A9{costBreakdown.monthlyKRW.toLocaleString(localeTag)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  {t.license.yearly} (\u20A9)
                </p>
                <p className="mt-1 text-xl font-bold text-blue-700">
                  \u20A9{costBreakdown.annualKRW.toLocaleString(localeTag)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seat Table (KEY_BASED only) */}
        {isKeyBased && seats.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {t.license.seat} {t.common.status} ({seats.length}{locale === "en" ? "" : "\uAC1C"})
            </h2>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      {t.license.key}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      {t.common.status}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      {t.license.assignedTo}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {seats.map((seat, idx) => {
                    const activeAssignment = seat.assignments[0];
                    return (
                      <tr key={seat.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm tabular-nums text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {seat.key ? (
                            <span className="font-mono text-gray-900">
                              {seat.key}
                            </span>
                          ) : (
                            <span className="italic text-gray-400">
                              {t.license.unassigned}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {activeAssignment ? (
                            <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {t.asset.statusInUse}
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              {t.license.unassigned}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {activeAssignment ? (
                            <Link
                              href={`/employees/${activeAssignment.employee.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {activeAssignment.employee.name} (
                              {activeAssignment.employee.department})
                            </Link>
                          ) : (
                            "\u2014"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Renewal Management */}
        {isLoggedIn && <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RenewalStatusPanel
            licenseId={licenseId}
            currentStatus={license.renewalStatus as Parameters<typeof RenewalStatusPanel>[0]["currentStatus"] ?? null}
            renewalDate={license.renewalDate ?? null}
            renewalDateManual={license.renewalDateManual ?? null}
          />
          <LicenseOwnersPanel
            licenseId={licenseId}
            users={users}
            orgUnits={orgUnits}
          />
        </div>}
        <div className="mb-6">
          <RenewalHistoryPanel licenseId={licenseId} />
        </div>

        {/* Children Licenses (first block) */}
        {children.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {locale === "en"
                ? `Sub-Licenses \u2014 ${children.length}`
                : `\uAD00\uB828 \uB77C\uC774\uC120\uC2A4 (\uD558\uC704) \u2014 ${children.length}\uAC1C`}
            </h2>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.name}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.type}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.dashboard.assigned}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.license.expiryDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {children.map((child) => {
                    const childTypeLabel =
                      child.licenseType === "VOLUME" ? t.license.volume : t.license.keyBased;
                    return (
                      <tr key={child.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/licenses/${child.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {child.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{childTypeLabel}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">
                          {child.assignments.length} / {child.totalQuantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {child.expiryDate ? formatDate(child.expiryDate) : "\u2014"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Assignments */}
        <LicenseAssignments
          licenseId={licenseId}
          assignments={assignmentData}
        />

        {/* Parent License */}
        {license.parent && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
            <p className="text-sm text-blue-700">
              {t.license.parentLicense}:{" "}
              <Link href={`/licenses/${license.parent.id}`} className="font-medium underline hover:text-blue-900">
                {license.parent.name}
              </Link>
            </p>
          </div>
        )}

        {/* Child Licenses (second block) */}
        {childrenSecond.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {locale === "en"
                ? `Sub-Licenses \u2014 ${childrenSecond.length}`
                : `\uAD00\uB828 \uB77C\uC774\uC120\uC2A4 (\uD558\uC704) \u2014 ${childrenSecond.length}\uAC1C`}
            </h2>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.name}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.type}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.license.quantity}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.license.expiryDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {childrenSecond.map((child) => (
                    <tr key={child.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        <Link href={`/licenses/${child.id}`} className="text-blue-600 hover:underline">
                          {child.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{child.licenseType}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{child.totalQuantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {child.expiryDate ? formatDate(child.expiryDate) : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* History Timeline */}
        {displayHistory.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t.history.title}
              </h2>
              <Link
                href={`/history?entityType=LICENSE&entityId=${licenseId}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {t.common.all} &rarr;
              </Link>
            </div>
            <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <div className="divide-y divide-gray-100">
                {displayHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${actionBadge[entry.action] ?? "text-gray-700 bg-gray-50"}`}
                    >
                      {actionLabelMap[entry.action] ?? entry.action}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-900">
                        {entry.description}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-gray-400">
                      {formatDate(entry.createdAt)}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardCard({
  icon,
  label,
  value,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-lg bg-white p-4 shadow-sm ring-1 ${warning ? "ring-amber-300" : "ring-gray-200"}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium uppercase text-gray-500">
          {label}
        </span>
      </div>
      <p
        className={`mt-2 text-2xl font-bold ${warning ? "text-amber-600" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase text-gray-500">
        {icon}
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-gray-900 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
