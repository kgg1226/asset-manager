"use client";

// FE-030: AssetCategory management page

import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Category = {
  id: number;
  name: string;
  code: string;
  driveFolder: string | null;
  isActive: boolean;
  _count: { archives: number };
};

type FormState = { name: string; code: string; driveFolder: string };
const EMPTY_FORM: FormState = { name: "", code: "", driveFolder: "" };

export default function AssetCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/asset-categories");
      if (res.ok) setCategories(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({ name: cat.name, code: cat.code, driveFolder: cat.driveFolder ?? "" });
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function saveCategory() {
    setSaving(true);
    setError(null);
    try {
      const url = editingId
        ? `/api/admin/asset-categories/${editingId}`
        : "/api/admin/asset-categories";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t.toast.saveFail);
      await loadCategories();
      cancelForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: Category) {
    try {
      const res = await fetch(`/api/admin/asset-categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cat.name,
          code: cat.code,
          driveFolder: cat.driveFolder,
          isActive: !cat.isActive,
        }),
      });
      if (res.ok) await loadCategories();
    } catch {
      alert(t.common.error);
    }
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(t.toast.confirmDelete)) return;
    try {
      const res = await fetch(`/api/admin/asset-categories/${cat.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await loadCategories();
    } catch (e) {
      alert(e instanceof Error ? e.message : t.toast.deleteFail);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-6 w-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t.header.assetCategory}</h1>
          </div>
          {!showForm && (
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              {t.common.new}
            </button>
          )}
        </div>

        {/* create/edit form */}
        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editingId ? t.common.edit : t.common.create}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">
                  {t.common.name} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  maxLength={20}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">
                  Google Drive Folder ID ({t.common.optional})
                </label>
                <input
                  type="text"
                  value={form.driveFolder}
                  onChange={(e) => setForm((p) => ({ ...p, driveFolder: e.target.value }))}
                  placeholder="Google Drive Folder ID"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={saveCategory}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {saving ? t.common.loading : t.common.save}
              </button>
              <button
                onClick={cancelForm}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                {t.common.cancel}
              </button>
            </div>
          </div>
        )}

        {/* category list */}
        <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">{t.common.list}</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">{t.common.loading}</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">{t.common.noData}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <th className="px-4 py-3 text-left">{t.common.name}</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Drive</th>
                  <th className="px-4 py-3 text-center">{t.header.archives}</th>
                  <th className="px-4 py-3 text-center">{t.common.status}</th>
                  <th className="px-4 py-3 text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className={`hover:bg-gray-50 ${!cat.isActive ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{cat.code}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-[160px]">
                      {cat.driveFolder ?? <span className="italic">{t.common.none}</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{cat._count.archives}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(cat)}
                        className="inline-flex items-center gap-1 text-xs"
                      >
                        {cat.isActive ? (
                          <><ToggleRight className="h-4 w-4 text-green-500" /><span className="text-green-600">{t.dashboard.active}</span></>
                        ) : (
                          <><ToggleLeft className="h-4 w-4 text-gray-400" /><span className="text-gray-400">{t.employee.inactive}</span></>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => startEdit(cat)}
                          className="text-gray-400 hover:text-blue-500"
                          title={t.common.edit}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat)}
                          className="text-gray-400 hover:text-red-500"
                          title={t.common.delete}
                          disabled={cat._count.archives > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
