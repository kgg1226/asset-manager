"use client";

import { useState } from "react";
import { assignLicenses } from "@/lib/assignment-actions";
import { useToast } from "@/app/toast";
import { useTranslation } from "@/lib/i18n";
import EmployeePicker from "@/app/_components/employee-picker";

type Employee = { id: number; name: string; department: string };
type LicenseType = "NO_KEY" | "KEY_BASED" | "VOLUME";

export default function AssignButton({
  licenseId,
  licenseName,
  remaining,
  employees,
  assignedEmployeeIds,
  licenseType = "KEY_BASED",
}: {
  licenseId: number;
  licenseName: string;
  remaining: number;
  employees: Employee[];
  assignedEmployeeIds: number[];
  licenseType?: LicenseType;
}) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, setIsPending] = useState(false);

  function toggleSelect(empId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        if (next.size >= remaining) return prev;
        next.add(empId);
      }
      return next;
    });
  }

  async function handleAssign() {
    if (selected.size === 0) return;
    setIsPending(true);

    let totalAssigned = 0;
    const errors: string[] = [];

    for (const empId of selected) {
      const result = await assignLicenses(empId, [licenseId]);
      if (result.success) {
        totalAssigned += result.count ?? 0;
      } else {
        errors.push(result.message);
      }
    }

    setIsPending(false);

    if (totalAssigned > 0) {
      toast(`${totalAssigned} ${t.common.assign} ${t.common.success}`, "success");
      close();
    }
    if (errors.length > 0) {
      toast(errors.join(", "), "error");
    }
  }

  function close() {
    setOpen(false);
    setSelected(new Set());
  }

  const typeLabel =
    licenseType === "VOLUME"
      ? "Volume License"
      : licenseType === "NO_KEY"
        ? "No-Key License"
        : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={remaining <= 0}
        className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
        title={remaining <= 0 ? t.license.unassigned : `${t.common.assign} (${remaining})`}
      >
        {t.common.assign}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              {t.license.seatAssignment}
              {typeLabel && (
                <span className={`ml-2 rounded px-2 py-0.5 text-xs font-semibold ${licenseType === "VOLUME"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-600"
                  }`}>
                  {typeLabel}
                </span>
              )}
            </h3>
            <p className="mb-1 text-sm text-gray-500">
              {licenseName} — {remaining}
            </p>
            {selected.size > 0 && (
              <p className="mb-1 text-xs text-blue-600">
                {selected.size} / {remaining}
                {selected.size >= remaining && (
                  <span className="ml-1 text-amber-600">(max)</span>
                )}
              </p>
            )}
            {licenseType === "VOLUME" && (
              <p className="mb-3 text-xs text-purple-600">
                {t.license.volume}
              </p>
            )}
            {licenseType !== "VOLUME" && <div className="mb-2" />}

            {/* 검색+다중선택 체크박스 리스트 — 공용 EmployeePicker 로 통일 (dev-040).
                좌석 제한(maxSelect)·이미 배정자 제외(excludeIds)는 그대로 보존 */}
            <EmployeePicker
              multi
              items={employees}
              selectedIds={selected}
              onToggle={toggleSelect}
              excludeIds={assignedEmployeeIds}
              maxSelect={remaining}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={close}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                {t.common.close}
              </button>
              {selected.size > 0 && (
                <button
                  onClick={handleAssign}
                  disabled={isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? t.common.loading : `${selected.size} ${t.common.assign}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
