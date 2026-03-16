"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";

interface TitleCiaMapping {
  id: number;
  title: string;
  ciaC: number;
  ciaI: number;
  ciaA: number;
  affectedAssetCount: number;
  createdAt: string;
  updatedAt: string;
}

const CIA_LEVELS = [
  { value: 1, labelKey: "low" },
  { value: 2, labelKey: "medium" },
  { value: 3, labelKey: "high" },
] as const;

const CIA_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-red-100 text-red-800",
};

export default function TitleCiaMappingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === "ADMIN";

  const [mappings, setMappings] = useState<TitleCiaMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", ciaC: 2, ciaI: 2, ciaA: 2 });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const loadMappings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/title-cia");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMappings(data.mappings ?? []);
    } catch {
      toast.error(t.toast.loadFail);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user?.role === "ADMIN") loadMappings();
  }, [user, loadMappings]);

  const resetForm = () => {
    setForm({ title: "", ciaC: 2, ciaI: 2, ciaA: 2 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (m: TitleCiaMapping) => {
    setForm({ title: m.title, ciaC: m.ciaC, ciaI: m.ciaI, ciaA: m.ciaA });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(`${t.admin.titleCiaTitle} ${t.common.required}`);
      return;
    }

    try {
      const url = editingId
        ? `/api/admin/title-cia/${editingId}`
        : "/api/admin/title-cia";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success(editingId ? t.toast.updateSuccess : t.toast.createSuccess);
      resetForm();
      await loadMappings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.toast.saveFail);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(t.toast.confirmDelete)) return;
    try {
      const res = await fetch(`/api/admin/title-cia/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      toast.success(t.toast.deleteSuccess);
      await loadMappings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.toast.deleteFail);
    }
  };

  const getCiaLabel = (level: number) => {
    return (t.cia as Record<string, string>)[CIA_LEVELS.find((l) => l.value === level)?.labelKey ?? "medium"] ?? String(level);
  };

  if (authLoading || !user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-gray-500">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-md p-2 hover:bg-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{t.admin.titleCiaMapping}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.admin.titleCiaMappingDesc}</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t.admin.addMapping}
          </button>
        </div>

        {/* Hint */}
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <p className="text-sm text-blue-800">{t.admin.ciaMappingHint}</p>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editingId ? t.admin.editMapping : t.admin.addMapping}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.admin.titleCiaTitle} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="예: 대표이사, 임원, 팀장, 사원"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(["ciaC", "ciaI", "ciaA"] as const).map((field, idx) => {
                  const labels = [t.cia.confidentiality, t.cia.integrity, t.cia.availability];
                  return (
                    <div key={field}>
                      <label className="mb-1 block text-sm font-medium text-gray-700">{labels[idx]}</label>
                      <div className="flex gap-2">
                        {CIA_LEVELS.map((level) => (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, [field]: level.value }))}
                            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                              form[field] === level.value
                                ? CIA_COLORS[level.value]
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {getCiaLabel(level.value)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingId ? t.common.edit : t.common.create}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">{t.admin.titleCiaTitle}</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t.cia.confidentiality}</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t.cia.integrity}</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t.cia.availability}</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">{t.admin.affectedAssets}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    {t.common.loading}
                  </td>
                </tr>
              ) : mappings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {t.admin.noMappings}
                  </td>
                </tr>
              ) : (
                mappings.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{m.title}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CIA_COLORS[m.ciaC]}`}>
                        {getCiaLabel(m.ciaC)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CIA_COLORS[m.ciaI]}`}>
                        {getCiaLabel(m.ciaI)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CIA_COLORS[m.ciaA]}`}>
                        {getCiaLabel(m.ciaA)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {m.affectedAssetCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          <ShieldCheck className="h-3 w-3" />
                          {m.affectedAssetCount}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(m)}
                          className="rounded p-1 hover:bg-gray-200"
                          title={t.common.edit}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.title)}
                          className="rounded p-1 hover:bg-gray-200"
                          title={t.common.delete}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
