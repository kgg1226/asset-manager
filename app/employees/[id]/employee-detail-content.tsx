"use client";

import Link from "next/link";
import { Package, History, CheckCircle2, Circle, Monitor, Key, Building2, Mail } from "lucide-react";
import ManageLicenses from "./manage-licenses";
import OrgEditForm from "./org-edit-form";
import OffboardButton from "./offboard-button";
import { useTranslation } from "@/lib/i18n";

type OrgUnit = { id: number; name: string; parentId: number | null };
type Company = { id: number; name: string; orgs: OrgUnit[] };

type AssignedForManage = {
  assignmentId: number;
  licenseId: number;
  licenseName: string;
  licenseType: "NO_KEY" | "KEY_BASED" | "VOLUME";
  seatKey: string | null;
  volumeKey: string | null;
  assignedDate: string;
  reason: string | null;
};

type AvailableLicense = {
  id: number;
  name: string;
  remaining: number;
};

type PastAssignment = {
  id: number;
  licenseId: number;
  licenseName: string;
  assignedDate: string;
  returnedDate: string | null;
};

type HistoryEntry = {
  id: string;
  action: string;
  description: string;
  createdAt: string;
};

type EmployeeData = {
  id: number;
  name: string;
  email: string | null;
  title: string | null;
  department: string | null;
  orgUnitName: string | null;
  companyId: number | null;
  orgUnitId: number | null;
  status: string;
};

export default function EmployeeDetailContent({
  employee,
  displayName,
  companies,
  activeAssignmentCount,
  totalHistoryCount,
  assignedForManage,
  availableLicenses,
  pastAssignments,
  displayHistory,
  isLoggedIn,
  hardwareCount,
}: {
  employee: EmployeeData;
  displayName: string;
  companies: Company[];
  activeAssignmentCount: number;
  totalHistoryCount: number;
  assignedForManage: AssignedForManage[];
  availableLicenses: AvailableLicense[];
  pastAssignments: PastAssignment[];
  displayHistory: HistoryEntry[];
  isLoggedIn: boolean;
  hardwareCount: number;
}) {
  const { t } = useTranslation();

  const actionBadge: Record<string, string> = {
    ASSIGNED: "text-green-700 bg-green-50",
    RETURNED: "text-yellow-700 bg-yellow-50",
    REVOKED: "text-red-700 bg-red-50",
    UNASSIGNED: "text-red-700 bg-red-50",
    CREATED: "text-purple-700 bg-purple-50",
    UPDATED: "text-blue-700 bg-blue-50",
    IMPORTED: "text-indigo-700 bg-indigo-50",
  };

  const actionLabelMap: Record<string, string> = {
    ASSIGNED: t.dashboard.assigned,
    RETURNED: t.common.back,
    REVOKED: t.license.unassign,
    UNASSIGNED: t.license.unassign,
    CREATED: t.history.created,
    UPDATED: t.history.updated,
    IMPORTED: t.common.import,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <OffboardButton
                employeeId={employee.id}
                employeeName={employee.name}
                currentStatus={employee.status}
              />
            )}
            <Link href="/employees" className="text-sm text-gray-500 hover:text-gray-700">
              &larr; {t.common.list}
            </Link>
          </div>
        </div>

        {/* Onboarding Checklist (admin only, ACTIVE employees with incomplete steps) */}
        {isLoggedIn && employee.status === "ACTIVE" && (() => {
          const steps = [
            { done: !!employee.email, label: t.employee.onboardEmail, icon: Mail, link: null },
            { done: !!employee.orgUnitId, label: t.employee.onboardDept, icon: Building2, link: null },
            { done: activeAssignmentCount > 0, label: t.employee.onboardLicense, icon: Key, link: "#manage-licenses" },
            { done: hardwareCount > 0, label: t.employee.onboardHardware, icon: Monitor, link: `/hardware?search=${encodeURIComponent(employee.name)}` },
          ];
          const incomplete = steps.filter((s) => !s.done);
          if (incomplete.length === 0) return null;
          return (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold">{incomplete.length}</div>
                <p className="text-sm font-semibold text-amber-800">{t.employee.onboardIncompleteTitle}</p>
                <span className="ml-auto text-xs text-amber-600">{steps.length - incomplete.length}/{steps.length} {t.employee.onboardCompleteCount}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${step.done ? "bg-white text-gray-400" : "bg-white text-gray-800 ring-1 ring-amber-300"}`}>
                      {step.done
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        : <Circle className="h-4 w-4 shrink-0 text-amber-400" />
                      }
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {step.done || !step.link
                        ? <span>{step.label}</span>
                        : <a href={step.link} className="text-blue-600 hover:underline">{step.label}</a>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Asset Overview Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-xs font-medium uppercase text-gray-500">{t.employee.assignedLicenses}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{activeAssignmentCount}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              <span className="text-xs font-medium uppercase text-gray-500">{t.history.title}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totalHistoryCount}</p>
          </div>
        </div>

        {/* Employee Info */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <dl className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">{t.common.name}</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">{t.employee.department}</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.orgUnitName ?? (employee.department && employee.department !== "-" ? employee.department : "—")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">{t.employee.email}</dt>
              <dd className="mt-1 text-sm text-gray-900">{employee.email ?? "—"}</dd>
            </div>
          </dl>
          <div className="border-t border-gray-100 pt-4">
            <OrgEditForm
              employeeId={employee.id}
              initialTitle={employee.title}
              initialCompanyId={employee.companyId}
              initialOrgUnitId={employee.orgUnitId}
              companies={companies}
              readOnly={!isLoggedIn}
            />
          </div>
        </div>

        {/* Manage Licenses */}
        {isLoggedIn && (
          <div id="manage-licenses">
          <ManageLicenses
            employeeId={employee.id}
            assigned={assignedForManage}
            availableLicenses={availableLicenses}
          />
          </div>
        )}

        {/* Past Assignments */}
        {pastAssignments.length > 0 && (
          <>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {t.history.title} ({pastAssignments.length})
            </h2>
            <div className="mb-6 overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.license.title}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.dashboard.assigned}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.history.title}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pastAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <Link href={`/licenses/${a.licenseId}`} className="text-blue-600 hover:underline">
                          {a.licenseName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {a.assignedDate}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {a.returnedDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* History Timeline */}
        {displayHistory.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{t.history.title}</h2>
              <Link
                href={`/history?entityType=EMPLOYEE&entityId=${employee.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {t.common.detail} &rarr;
              </Link>
            </div>
            <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <div className="divide-y divide-gray-100">
                {displayHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${actionBadge[h.action] ?? "text-gray-700 bg-gray-50"}`}>
                      {actionLabelMap[h.action] ?? h.action}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-900">{h.description}</p>
                    </div>
                    <time className="shrink-0 text-xs text-gray-400">
                      {h.createdAt}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
