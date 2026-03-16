"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

type Employee = { id: number; name: string; department: string };

export default function HwAssignButton({
  assetId,
  assetName,
  onDone,
}: {
  assetId: number;
  assetName: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/employees?status=ACTIVE&limit=200")
      .then((r) => r.json())
      .then((d) => setEmployees(d.data ?? []))
      .catch(() => toast.error(t.common.error));
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q),
    );
  }, [employees, search]);

  async function handleAssign() {
    if (!selectedId) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedId }),
      });
      if (!res.ok) {
        const e = await res.json();
        toast.error(e.error || t.toast.saveFail);
        return;
      }
      toast.success(t.toast.saveSuccess);
      close();
      onDone();
    } catch {
      toast.error(t.toast.saveFail);
    } finally {
      setIsPending(false);
    }
  }

  function close() {
    setOpen(false);
    setSearch("");
    setSelectedId(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
        title={t.hw.assignAsset}
      >
        {t.hw.assignAsset}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">{t.hw.assignAsset}</h3>
            <p className="mb-3 text-sm text-gray-500">{assetName}</p>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.common.search}
              autoFocus
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />

            <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">{t.common.noData}</p>
              ) : (
                filtered.map((emp) => (
                  <label
                    key={emp.id}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      selectedId === emp.id ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignee"
                      checked={selectedId === emp.id}
                      onChange={() => setSelectedId(emp.id)}
                      className="h-4 w-4 border-gray-300 text-blue-600"
                    />
                    <span className="flex-1 font-medium text-gray-900">{emp.name}</span>
                    <span className="text-xs text-gray-500">{emp.department}</span>
                  </label>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={close}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                {t.common.close}
              </button>
              {selectedId && (
                <button
                  onClick={handleAssign}
                  disabled={isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? t.common.loading : t.hw.assignAsset}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
