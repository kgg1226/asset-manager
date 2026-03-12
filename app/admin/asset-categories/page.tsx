"use client";

// FE-030: AssetCategory 관리 페이지

import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight } from "lucide-react";

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
      if (!res.ok) throw new Error(json.error ?? "저장 실패");
      await loadCategories();
      cancelForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
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
      alert("상태 변경에 실패했습니다.");
    }
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/asset-categories/${cat.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await loadCategories();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-6 w-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">자산 카테고리 관리</h1>
          </div>
          {!showForm && (
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              새 카테고리
            </button>
          )}
        </div>

        {/* 생성/수정 폼 */}
        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editingId ? "카테고리 수정" : "새 카테고리 생성"}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">
                  카테고리명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="예: 소프트웨어 라이선스"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">
                  코드 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="예: SW"
                  maxLength={20}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase text-gray-500 mb-1">
                  Google Drive 폴더 ID (선택)
                </label>
                <input
                  type="text"
                  value={form.driveFolder}
                  onChange={(e) => setForm((p) => ({ ...p, driveFolder: e.target.value }))}
                  placeholder="Google Drive 폴더 ID"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-purple-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">비워두면 기본 드라이브 루트에 업로드됩니다.</p>
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
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                onClick={cancelForm}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                취소
              </button>
            </div>
          </div>
        )}

        {/* 카테고리 목록 */}
        <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">카테고리 목록</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">로딩 중...</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">등록된 카테고리가 없습니다.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <th className="px-4 py-3 text-left">카테고리명</th>
                  <th className="px-4 py-3 text-left">코드</th>
                  <th className="px-4 py-3 text-left">Drive 폴더</th>
                  <th className="px-4 py-3 text-center">증적 수</th>
                  <th className="px-4 py-3 text-center">상태</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className={`hover:bg-gray-50 ${!cat.isActive ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{cat.code}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-[160px]">
                      {cat.driveFolder ?? <span className="italic">미설정</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{cat._count.archives}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(cat)}
                        title={cat.isActive ? "비활성화" : "활성화"}
                        className="inline-flex items-center gap-1 text-xs"
                      >
                        {cat.isActive ? (
                          <><ToggleRight className="h-4 w-4 text-green-500" /><span className="text-green-600">활성</span></>
                        ) : (
                          <><ToggleLeft className="h-4 w-4 text-gray-400" /><span className="text-gray-400">비활성</span></>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => startEdit(cat)}
                          className="text-gray-400 hover:text-blue-500"
                          title="수정"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat)}
                          className="text-gray-400 hover:text-red-500"
                          title="삭제"
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

        <div className="mt-4 rounded-lg bg-purple-50 p-4 ring-1 ring-purple-200">
          <p className="text-sm text-purple-700">
            카테고리는 증적 생성 시 자산 분류에 사용됩니다. 증적이 연결된 카테고리는 삭제할 수 없습니다.
            <br />
            Google Drive 폴더 ID를 설정하면 증적 파일이 해당 폴더에 자동 업로드됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
