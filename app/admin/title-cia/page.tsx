"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2, ShieldCheck, Info, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";

interface TitleCiaMapping {
  id: number;
  title: string;
  ciaC: number;
  ciaI: number;
  ciaA: number;
  description: string | null;
  rationale: string | null;
  affectedAssetCount: number;
  createdAt: string;
  updatedAt: string;
}

// 1=최상(빨강), 2=보통(노랑), 3=낮음(초록) — 등급이 낮을수록 중요
const SCORE_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-800 ring-red-200",
  2: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  3: "bg-green-100 text-green-800 ring-green-200",
};

const SCORE_LABELS: Record<number, string> = {
  1: "1등급",
  2: "2등급",
  3: "3등급",
};

function calcGrade(c: number, i: number, a: number): number {
  const avg = (c + i + a) / 3;
  if (avg <= 1.5) return 1;
  if (avg <= 2.5) return 2;
  return 3;
}

export default function TitleCiaMappingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [mappings, setMappings] = useState<TitleCiaMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", ciaC: 2, ciaI: 2, ciaA: 2, description: "", rationale: "" });
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

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
    setForm({ title: "", ciaC: 2, ciaI: 2, ciaA: 2, description: "", rationale: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (m: TitleCiaMapping) => {
    setForm({ title: m.title, ciaC: m.ciaC, ciaI: m.ciaI, ciaA: m.ciaA, description: m.description ?? "", rationale: m.rationale ?? "" });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("직책명은 필수입니다."); return; }

    try {
      const url = editingId ? `/api/admin/title-cia/${editingId}` : "/api/admin/title-cia";
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

  const handleDelete = async (id: number) => {
    if (!confirm(t.toast.confirmDelete)) return;
    try {
      const res = await fetch(`/api/admin/title-cia/${id}`, { method: "DELETE" });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
      toast.success(t.toast.deleteSuccess);
      await loadMappings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.toast.deleteFail);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) { toast.error("데이터를 입력해주세요."); return; }
    setBulkSaving(true);
    try {
      const lines = bulkText.trim().split("\n").filter(l => l.trim());
      const bulk = lines.map(line => {
        const parts = line.split("\t").length > 1 ? line.split("\t") : line.split(",");
        return {
          title: parts[0]?.trim() || "",
          ciaC: Number(parts[1]?.trim()) || 2,
          ciaI: Number(parts[2]?.trim()) || 2,
          ciaA: Number(parts[3]?.trim()) || 2,
          description: parts[4]?.trim() || "",
          rationale: parts[5]?.trim() || "",
        };
      });

      const res = await fetch("/api/admin/title-cia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk }),
      });
      const data = await res.json();
      toast.success(`${data.success}/${data.total}건 등록 완료`);
      setShowBulk(false);
      setBulkText("");
      await loadMappings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "대량 등록 실패");
    } finally {
      setBulkSaving(false);
    }
  };

  if (authLoading || !user || user.role !== "ADMIN") {
    return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-5xl"><p className="text-center text-gray-500">{t.common.loading}</p></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-md p-2 hover:bg-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{t.admin.titleCiaMapping}</h1>
            <p className="mt-1 text-sm text-gray-500">직책별 CIA 점수(1~3)를 설정합니다. 1이 가장 높은 등급입니다.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              대량 등록
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {t.admin.addMapping}
            </button>
          </div>
        </div>

        {/* Hint */}
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p>CIA 점수: <strong>1 = 최상</strong> (기밀성/무결성/가용성이 매우 중요), <strong>3 = 낮음</strong>. 평균 점수로 등급이 자동 산출됩니다.</p>
            <p className="mt-1">등급은 할당된 하드웨어 자산에 자동 적용됩니다.</p>
          </div>
        </div>

        {/* Bulk Import Modal */}
        {showBulk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">대량 등록</h2>
                <button onClick={() => setShowBulk(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <p className="mb-3 text-sm text-gray-500">
                탭 또는 쉼표로 구분하여 입력합니다. 이미 존재하는 직책은 업데이트됩니다.
              </p>
              <div className="mb-3 rounded bg-gray-50 p-3 text-xs font-mono text-gray-600">
                직책명, C점수(1~3), I점수(1~3), A점수(1~3), 업무내용, 점수근거<br />
                대표이사, 1, 1, 1, 전사 경영 총괄, 최고 의사결정권자<br />
                팀장, 1, 2, 2, 팀 업무 관리, 부서 내 주요 정보 접근<br />
                사원, 2, 2, 3, 일반 업무 수행, 제한된 정보 접근
              </div>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={8}
                className="w-full rounded-md border px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="대표이사, 1, 1, 1, 전사 경영 총괄, 최고 의사결정권자"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowBulk(false)} className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={bulkSaving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {bulkSaving ? "등록 중..." : "등록"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Form */}
        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              {editingId ? t.admin.editMapping : t.admin.addMapping}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  직책명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="대표이사, 팀장, 사원 등"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(["ciaC", "ciaI", "ciaA"] as const).map((field, idx) => {
                  const labels = [t.cia.confidentiality, t.cia.integrity, t.cia.availability];
                  return (
                    <div key={field}>
                      <label className="mb-1 block text-sm font-medium text-gray-700">{labels[idx]}</label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map(score => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, [field]: score }))}
                            className={`flex-1 rounded-md px-2 py-2 text-sm font-medium ring-1 transition ${
                              form[field] === score ? SCORE_COLORS[score] : "bg-gray-50 text-gray-500 ring-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {score}점
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* 평균 등급 미리보기 */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">산출 등급:</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${SCORE_COLORS[calcGrade(form.ciaC, form.ciaI, form.ciaA)]}`}>
                  {SCORE_LABELS[calcGrade(form.ciaC, form.ciaI, form.ciaA)]}
                </span>
                <span className="text-gray-400">
                  (평균 {((form.ciaC + form.ciaI + form.ciaA) / 3).toFixed(1)})
                </span>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">업무 내용</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="해당 직책의 주요 업무를 기술합니다"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">점수 부여 근거</label>
                <textarea
                  value={form.rationale}
                  onChange={e => setForm(p => ({ ...p, rationale: e.target.value }))}
                  rows={2}
                  placeholder="이 점수를 부여한 이유를 기록합니다 (감사/심사 시 근거 자료로 활용)"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  {editingId ? t.common.edit : t.common.create}
                </button>
                <button type="button" onClick={resetForm} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">직책</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">C</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">I</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">A</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">등급</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">업무 내용</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">자산</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">{t.common.loading}</td></tr>
              ) : mappings.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">{t.admin.noMappings}</td></tr>
              ) : (
                mappings.map(m => {
                  const grade = calcGrade(m.ciaC, m.ciaI, m.ciaA);
                  const isExpanded = expandedRow === m.id;
                  return (
                    <tr key={m.id} className="group border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : m.id)}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {m.title}
                        </button>
                        {isExpanded && m.rationale && (
                          <p className="mt-1 text-xs text-gray-500">근거: {m.rationale}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ring-1 ${SCORE_COLORS[m.ciaC]}`}>{m.ciaC}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ring-1 ${SCORE_COLORS[m.ciaI]}`}>{m.ciaI}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ring-1 ${SCORE_COLORS[m.ciaA]}`}>{m.ciaA}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${SCORE_COLORS[grade]}`}>
                          {SCORE_LABELS[grade]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={m.description ?? ""}>
                        {m.description || "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.affectedAssetCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                            <ShieldCheck className="h-3 w-3" />{m.affectedAssetCount}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(m)} className="rounded p-1 hover:bg-gray-200" title={t.common.edit}>
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(m.id)} className="rounded p-1 hover:bg-gray-200" title={t.common.delete}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
