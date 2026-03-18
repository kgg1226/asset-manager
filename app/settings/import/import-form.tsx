"use client";

import { useState, useRef, useTransition } from "react";
import type { ImportType, ImportResult } from "@/lib/csv-import";
import { importCsv, getTemplateCsv } from "./actions";
import { templates } from "./templates";
import { useToast } from "@/app/toast";
import { useTranslation } from "@/lib/i18n";

export default function ImportForm() {
  const [type, setType] = useState<ImportType>("licenses");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const importTypes: { value: ImportType; label: string }[] = [
    { value: "licenses", label: t.license.title },
    { value: "employees", label: t.employee.title },
    { value: "groups", label: t.license.group },
    { value: "assignments", label: t.license.seatAssignment },
    { value: "seats", label: t.license.seat },
    { value: "cloud", label: t.cloud?.title ?? "클라우드" },
    { value: "domains", label: t.domain?.title ?? "도메인·SSL" },
    { value: "hardware", label: t.hw?.title ?? "하드웨어" },
  ];

  async function handleDownloadTemplate() {
    const csv = await getTemplateCsv(type);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFileChange(f: File | null) {
    setFile(f);
    setResult(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange(f);
  }

  function handleSubmit() {
    if (!file) return;
    const formData = new FormData();
    formData.set("type", type);
    formData.set("file", file);

    startTransition(async () => {
      const res = await importCsv(formData);
      setResult(res);
      if (res.success) {
        const parts: string[] = [];
        if (res.created > 0) parts.push(`${res.created} ${t.common.create}`);
        if (res.updated > 0) parts.push(`${res.updated} ${t.common.edit}`);
        toast(parts.join(", ") || t.common.success);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else if (res.message) {
        toast(res.message, "error");
      }
    });
  }

  const template = templates[type];

  return (
    <div className="space-y-6">
      {/* Type Selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">{t.common.type}</label>
        <div className="flex flex-wrap gap-3">
          {importTypes.map((it) => (
            <label
              key={it.value}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition ${
                type === it.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="importType"
                value={it.value}
                checked={type === it.value}
                onChange={() => { setType(it.value); setResult(null); }}
                className="sr-only"
              />
              {it.label}
            </label>
          ))}
        </div>
      </div>

      {/* Template Download */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">CSV</p>
            <p className="mt-1 text-xs text-gray-500">
              {t.common.required}: {getRequiredHeaders(type).join(", ")} | {t.common.all}: {template.headers.join(", ")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t.common.export}
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
          file ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400"
        }`}
      >
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="mt-1 text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              type="button"
              onClick={() => handleFileChange(null)}
              className="mt-2 text-xs text-red-600 hover:underline"
            >
              {t.common.delete}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              CSV{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-medium text-blue-600 hover:underline"
              >
                {t.common.search}
              </button>
            </p>
            <p className="mt-1 text-xs text-gray-400">Max 5MB, .csv</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>

      {/* Submit */}
      <button
        type="button"
        disabled={!file || isPending}
        onClick={handleSubmit}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? `${t.common.loading}` : t.common.import}
      </button>

      {/* Results */}
      {result && (
        <div
          className={`rounded-lg border p-4 ${
            result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          {result.success ? (
            <div>
              <p className="text-sm font-medium text-green-800">{t.common.success}</p>
              <p className="mt-1 text-sm text-green-700">
                {result.created > 0 && `${result.created} ${t.common.create}`}
                {result.created > 0 && result.updated > 0 && ", "}
                {result.updated > 0 && `${result.updated} ${t.common.edit}`}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-red-800">
                {result.message || `${result.errors.length} ${t.common.error}`}
              </p>
              {result.errors.length > 0 && (
                <div className="mt-3 max-h-64 overflow-auto rounded border border-red-200 bg-white">
                  <table className="min-w-full text-xs">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-red-700">#</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700">{t.common.name}</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700">{t.common.error}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {result.errors.map((err, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-red-600">{err.row}</td>
                          <td className="px-3 py-1.5 font-mono text-red-600">{err.column}</td>
                          <td className="px-3 py-1.5 text-red-800">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getRequiredHeaders(type: ImportType): string[] {
  switch (type) {
    case "licenses": return ["name", "totalQuantity", "purchaseDate"];
    case "employees": return ["name", "department"];
    case "groups": return ["name"];
    case "assignments": return ["licenseName", "employeeEmail"];
    case "seats": return ["licenseName", "key"];
    case "cloud": return ["name"];
    case "domains": return ["name"];
    case "hardware": return ["name"];
  }
}
