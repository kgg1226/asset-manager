"use client";

import { useState } from "react";
import { unassignLicenses } from "@/lib/assignment-actions";
import { useToast } from "@/app/toast";
import { useTranslation } from "@/lib/i18n";

type AssignedEmployee = {
  assignmentId: number;
  employeeId: number;
  employeeName: string;
  department: string;
};

export default function UnassignButton({
  licenseName,
  assignedEmployees,
}: {
  licenseName: string;
  assignedEmployees: AssignedEmployee[];
}) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, setIsPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggle(assignmentId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(assignmentId)) next.delete(assignmentId);
      else next.add(assignmentId);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === assignedEmployees.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assignedEmployees.map((a) => a.assignmentId)));
    }
  }

  async function handleUnassign() {
    if (selected.size === 0) return;
    setConfirmOpen(false);
    setIsPending(true);

    // Group by employee and call unassign for each
    const byEmployee = new Map<number, number[]>();
    for (const ae of assignedEmployees) {
      if (!selected.has(ae.assignmentId)) continue;
      const list = byEmployee.get(ae.employeeId) ?? [];
      list.push(ae.assignmentId);
      byEmployee.set(ae.employeeId, list);
    }

    let totalReturned = 0;
    let hasError = false;
    for (const [employeeId, assignmentIds] of byEmployee) {
      const result = await unassignLicenses(employeeId, assignmentIds);
      if (result.success) {
        totalReturned += result.count ?? 0;
      } else {
        hasError = true;
        toast(result.message, "error");
      }
    }

    setIsPending(false);
    if (totalReturned > 0) {
      toast(`${totalReturned} ${t.license.unassign}`, "success");
      setOpen(false);
      setSelected(new Set());
    } else if (!hasError) {
      toast(t.common.noData, "error");
    }
  }

  if (assignedEmployees.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50"
      >
        {t.license.unassign}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setSelected(new Set()); } }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">{t.license.seatAssignment}</h3>
            <p className="mb-4 text-sm text-gray-500">
              {licenseName} — {assignedEmployees.length}
            </p>

            <div className="mb-2 flex items-center gap-2 px-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selected.size === assignedEmployees.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                {t.common.all}
              </label>
              {selected.size > 0 && (
                <span className="text-xs text-gray-500">({selected.size}건 선택)</span>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200">
              {assignedEmployees.map((ae) => (
                <label
                  key={ae.assignmentId}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    selected.has(ae.assignmentId) ? "bg-orange-50" : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(ae.assignmentId)}
                    onChange={() => toggle(ae.assignmentId)}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600"
                  />
                  <span className="font-medium text-gray-900">{ae.employeeName}</span>
                  <span className="ml-auto text-xs text-gray-500">{ae.department}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => { setOpen(false); setSelected(new Set()); }}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                {t.common.close}
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={selected.size === 0 || isPending}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {isPending ? t.common.loading : `${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">{t.common.confirm}</h3>
            <p className="mb-4 text-sm text-gray-600">
              {t.toast.confirmUnassign} ({selected.size})
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleUnassign}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
