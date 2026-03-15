"use client";

import { useState, useEffect, useCallback } from "react";
import { Archive, Plus, Trash2, RefreshCw, CheckCircle, Clock, AlertCircle, Loader2, Upload } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type ArchiveItem = {
  id: number;
  yearMonth: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  trigger: string;
  createdAt: string;
  completedAt: string | null;
  fileUrl: string | null;
  category: { id: number; name: string } | null;
  logs: { level: string; message: string; createdAt: string }[];
  _count: { data: number };
};

function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const prevM = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevY = now.getMonth() === 0 ? y - 1 : y;
  return `${prevY}-${String(prevM).padStart(2, "0")}`;
}

export default function AdminArchivesPage() {
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newYearMonth, setNewYearMonth] = useState(getCurrentYearMonth());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { t } = useTranslation();

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: t.common.loading, color: "bg-yellow-100 text-yellow-700", icon: <Clock className="h-3 w-3" /> },
    RUNNING: { label: t.common.loading, color: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    COMPLETED: { label: t.common.success, color: "bg-green-100 text-green-700", icon: <CheckCircle className="h-3 w-3" /> },
    FAILED: { label: t.common.failure, color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3 w-3" /> },
  };

  const loadArchives = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/archives");
      if (res.ok) setArchives(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchives();
    const interval = setInterval(loadArchives, 5000);
    return () => clearInterval(interval);
  }, [loadArchives]);

  async function createArchive() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/archives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth: newYearMonth }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.toast.createFail);
      await loadArchives();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setCreating(false);
    }
  }

  async function deleteArchive(id: number) {
    if (!confirm(t.toast.confirmDelete)) return;
    try {
      const res = await fetch(`/api/admin/archives/${id}`, { method: "DELETE" });
      if (res.ok) await loadArchives();
    } catch {
      alert(t.toast.deleteFail);
    }
  }

  async function exportToGoogleDrive(id: number) {
    try {
      const res = await fetch(`/api/admin/archives/${id}/export`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      alert(json.message ?? t.common.success);
      await loadArchives();
    } catch (e) {
      alert(e instanceof Error ? e.message : t.common.error);
    }
  }

  const selectedArchive = archives.find((a) => a.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex items-center gap-3">
          <Archive className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.header.archives}</h1>
        </div>

        {/* new archive */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t.common.create} {t.header.archives}</h2>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs font-medium uppercase text-gray-500 mb-1">{t.report.period}</label>
              <input
                type="month"
                value={newYearMonth}
                onChange={(e) => setNewYearMonth(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={createArchive}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creating ? t.common.loading : t.common.create}
            </button>
            <button
              onClick={loadArchives}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              {t.common.reset}
            </button>
          </div>
          {createError && (
            <p className="mt-2 text-sm text-red-600">{createError}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* archive list */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">{t.header.archives} {t.common.list}</h2>
              </div>
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-400">{t.common.loading}</div>
              ) : archives.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">{t.common.noData}</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {archives.map((archive) => {
                    const cfg = STATUS_CONFIG[archive.status];
                    return (
                      <li
                        key={archive.id}
                        className={`flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-gray-50 ${selectedId === archive.id ? "bg-blue-50" : ""}`}
                        onClick={() => setSelectedId(archive.id === selectedId ? null : archive.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{archive.yearMonth}</p>
                          <p className="text-xs text-gray-400">
                            {archive.trigger === "cron" ? "Auto" : "Manual"} ·{" "}
                            {new Date(archive.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        {archive.status === "COMPLETED" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); exportToGoogleDrive(archive.id); }}
                            className="text-gray-300 hover:text-blue-500"
                            title={t.common.export}
                          >
                            <Upload className="h-4 w-4" />
                          </button>
                        )}
                        {archive.status !== "RUNNING" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteArchive(archive.id); }}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* archive detail / log */}
          <div>
            {selectedArchive ? (
              <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h2 className="text-sm font-semibold text-gray-900">{selectedArchive.yearMonth} Log</h2>
                </div>
                <div className="space-y-2 p-4 max-h-96 overflow-y-auto">
                  {selectedArchive.logs.length === 0 ? (
                    <p className="text-sm text-gray-400">{t.common.noData}</p>
                  ) : (
                    selectedArchive.logs.map((log, i) => (
                      <div key={i} className={`text-xs ${log.level === "error" ? "text-red-600" : log.level === "warn" ? "text-yellow-600" : "text-gray-600"}`}>
                        <span className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</span>{" "}
                        {log.message}
                      </div>
                    ))
                  )}
                </div>
                {selectedArchive._count.data > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-xs text-gray-500">{t.common.total}: {selectedArchive._count.data}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-white p-6 text-center shadow-sm ring-1 ring-gray-200">
                <p className="text-sm text-gray-400">{t.common.noData}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
