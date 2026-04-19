"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Download, FileSpreadsheet, FileText, Send, SlidersHorizontal, X, Save, Trash2, Archive, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { REPORTS_TOUR_KEY, getReportsSteps } from "@/app/_components/tours/reports-tour";

// ── Field / Sheet definitions ──────────────────────────────────────────────

const DETAIL_FIELDS = [
  { key: "name", label: "Asset Name" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "vendor", label: "Vendor" },
  { key: "monthlyCost", label: "Monthly Cost" },
  { key: "currency", label: "Currency" },
  { key: "assignee", label: "Assignee" },
  { key: "department", label: "Department" },
  { key: "expiryDate", label: "Expiry Date" },
  { key: "purchaseDate", label: "Purchase Date" },
] as const;

const SHEET_OPTIONS = [
  { key: "Summary", label: "Summary" },
  { key: "ByType", label: "By Type" },
  { key: "ByStatus", label: "By Status" },
  { key: "ByDepartment", label: "By Department" },
  { key: "Detail", label: "Detail" },
  { key: "HardwareDetail", label: "Hardware Detail" },
] as const;

type FieldKey = typeof DETAIL_FIELDS[number]["key"];
type SheetKey = typeof SHEET_OPTIONS[number]["key"];

const PRESET_STORAGE_KEY = "report-export-presets";

type Preset = { name: string; fields: FieldKey[]; sheets: SheetKey[] };

function loadPresets(): Preset[] {
  try { return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function savePresets(presets: Preset[]) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

// ── Field Picker Modal ─────────────────────────────────────────────────────

function FieldPickerModal({
  yearMonth,
  onClose,
}: {
  yearMonth: string;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<Set<FieldKey>>(new Set(DETAIL_FIELDS.map((f) => f.key)));
  const [sheets, setSheets] = useState<Set<SheetKey>>(new Set(SHEET_OPTIONS.map((s) => s.key)));
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState("");

  useEffect(() => { setPresets(loadPresets()); }, []);

  function toggleField(key: FieldKey) {
    setFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSheet(key: SheetKey) {
    setSheets((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function applyPreset(preset: Preset) {
    setFields(new Set(preset.fields));
    setSheets(new Set(preset.sheets));
  }

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) return;
    const next = [...presets.filter((p) => p.name !== name), { name, fields: [...fields], sheets: [...sheets] }];
    setPresets(next);
    savePresets(next);
    setPresetName("");
  }

  function handleDeletePreset(name: string) {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    savePresets(next);
  }

  function buildUrl() {
    const params = new URLSearchParams();
    if (fields.size < DETAIL_FIELDS.length) params.set("fields", [...fields].join(","));
    if (sheets.size < SHEET_OPTIONS.length) params.set("sheets", [...sheets].join(","));
    const qs = params.toString();
    return `/api/reports/monthly/${yearMonth}/excel${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-gray-900">커스텀 내보내기</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Presets */}
          {presets.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase text-gray-500 mb-2">저장된 프리셋</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <div key={p.name} className="flex items-center gap-1 rounded-full border border-gray-300 px-2.5 py-1 text-xs">
                    <button onClick={() => applyPreset(p)} className="text-gray-700 hover:text-blue-600">{p.name}</button>
                    <button onClick={() => handleDeletePreset(p.name)} className="text-gray-300 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sheets */}
          <div>
            <p className="text-xs font-medium uppercase text-gray-500 mb-2">포함할 시트</p>
            <div className="grid grid-cols-2 gap-2">
              {SHEET_OPTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sheets.has(s.key)}
                    onChange={() => toggleSheet(s.key)}
                    className="rounded border-gray-300"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          {/* Detail Fields */}
          {sheets.has("Detail") && (
            <div>
              <p className="text-xs font-medium uppercase text-gray-500 mb-2">Detail 시트 컬럼</p>
              <div className="grid grid-cols-2 gap-2">
                {DETAIL_FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fields.has(f.key)}
                      onChange={() => toggleField(f.key)}
                      className="rounded border-gray-300"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Save preset */}
          <div>
            <p className="text-xs font-medium uppercase text-gray-500 mb-2">프리셋 저장</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="프리셋 이름"
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                저장
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            취소
          </button>
          <a
            href={buildUrl()}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel 다운로드
          </a>
        </div>
      </div>
    </div>
  );
}

type ReportData = {
  period: string;
  startDate: string;
  endDate: string;
  summary: { totalMonthlyCost: number; assetCount: number; currency: string };
  byType: { type: string; count: number; cost: number }[];
  byDepartment: { department: string; count: number; cost: number }[];
  expiringCount: number;
};

function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const TYPE_LABELS: Record<string, string> = {
    SOFTWARE: t.nav.licenses,
    CLOUD: t.cloud.title,
    HARDWARE: t.hw.title,
    DOMAIN_SSL: t.domain.title,
    OTHER: t.hw.other,
  };
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  type ArchiveItem = {
    id: number; yearMonth: string; status: string; trigger: string;
    createdAt: string; completedAt: string | null;
    data: { dataType: string; recordCount: number }[];
  };
  const [archives, setArchives] = useState<ArchiveItem[]>([]);

  const fetchArchives = useCallback(async () => {
    try {
      const res = await fetch(`/api/archives?yearMonth=${yearMonth}&limit=5`);
      if (res.ok) {
        const json = await res.json();
        setArchives(json.items ?? []);
      }
    } catch { /* ignore */ }
  }, [yearMonth]);

  useEffect(() => { fetchArchives(); }, [fetchArchives]);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/reports/monthly/${yearMonth}/data`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? t.report.loadFail);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  async function sendEmail() {
    if (!emailInput.trim()) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch(`/api/reports/monthly/${yearMonth}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: emailInput.split(",").map((e) => e.trim()).filter(Boolean) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? t.report.emailSendFail);
      setEmailResult(t.report.emailSent);
    } catch (e) {
      setEmailResult(e instanceof Error ? e.message : t.common.error);
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t.report.monthlyReport}</h1>
            <TourGuide tourKey={REPORTS_TOUR_KEY} steps={getReportsSteps(t)} />
          </div>
          <a
            href="/api/reports/asset-register"
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            title="ISMS 정보자산관리대장 엑셀 내보내기"
          >
            <Download className="h-4 w-4" />
            정보자산관리대장
          </a>
        </div>

        {/* 월 선택 */}
        <div className="mb-6 flex items-end gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" data-tour="report-period">
          <div>
            <label className="block text-xs font-medium uppercase text-gray-500 mb-1">{t.report.period}</label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t.common.loading : t.report.generate}
          </button>

          {data && (
            <div className="ml-auto flex items-center gap-2" data-tour="report-export">
              <a
                href={`/api/reports/monthly/${yearMonth}/excel`}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </a>
              <button
                onClick={() => setShowFieldPicker(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-green-600 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                title="커스텀 내보내기"
              >
                <SlidersHorizontal className="h-4 w-4" />
                커스텀
              </button>
              <a
                href={`/api/reports/monthly/${yearMonth}/pdf`}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <FileText className="h-4 w-4" />
                PDF
              </a>
              <Link
                href={`/reports/${yearMonth}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.common.detail}
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* 요약 카드 */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard label={t.report.period} value={data.period} />
              <SummaryCard
                label={t.report.totalMonthlyCost}
                value={`₩${data.summary.totalMonthlyCost.toLocaleString()}`}
                highlight
              />
              <SummaryCard label={t.report.assetCount} value={`${data.summary.assetCount}${t.dashboard.items}`} />
            </div>

            {data.expiringCount > 0 && (
              <div className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 ring-1 ring-yellow-200">
                {t.report.expiringWarning} <strong>{data.expiringCount}{t.dashboard.items}</strong>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 유형별 비용 */}
              <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-4 text-base font-semibold text-gray-900">{t.report.costByType}</h2>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">{t.common.type}</th>
                      <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">{t.report.assetCount}</th>
                      <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">{t.report.monthlyCost}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byType.length === 0 ? (
                      <tr><td colSpan={3} className="py-4 text-center text-sm text-gray-400">{t.common.noData}</td></tr>
                    ) : (
                      data.byType.map((row) => (
                        <tr key={row.type}>
                          <td className="py-2 text-sm text-gray-900">{TYPE_LABELS[row.type] ?? row.type}</td>
                          <td className="py-2 text-right text-sm text-gray-600">{row.count}{t.dashboard.items}</td>
                          <td className="py-2 text-right text-sm font-medium text-gray-900">
                            ₩{row.cost.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 부서별 비용 */}
              <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-4 text-base font-semibold text-gray-900">{t.report.costByDept}</h2>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">{t.employee.department}</th>
                      <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">{t.report.assetCount}</th>
                      <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">{t.report.monthlyCost}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byDepartment.length === 0 ? (
                      <tr><td colSpan={3} className="py-4 text-center text-sm text-gray-400">{t.common.noData}</td></tr>
                    ) : (
                      data.byDepartment.map((row) => (
                        <tr key={row.department}>
                          <td className="py-2 text-sm text-gray-900">{row.department}</td>
                          <td className="py-2 text-right text-sm text-gray-600">{row.count}{t.dashboard.items}</td>
                          <td className="py-2 text-right text-sm font-medium text-gray-900">
                            ₩{row.cost.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 이메일 발송 */}
            <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200" data-tour="report-email">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                <Send className="h-4 w-4 text-blue-500" />
                {t.report.sendEmail}
              </h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={t.report.emailPlaceholder}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={sendEmail}
                  disabled={emailSending || !emailInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {emailSending ? t.common.loading : t.common.submit}
                </button>
              </div>
              {emailResult && (
                <p className={`mt-2 text-sm ${emailResult === t.report.emailSent ? "text-green-600" : "text-red-600"}`}>
                  {emailResult}
                </p>
              )}
            </div>
          </>
        )}

        {/* 증적 이력 */}
        {archives.length > 0 && (
          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Archive className="h-4 w-4 text-purple-500" />
                증적 이력 ({yearMonth})
              </h2>
              <a href="/admin/archives" className="text-xs text-purple-600 hover:underline">전체 보기 →</a>
            </div>
            <div className="space-y-2">
              {archives.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-md border border-gray-100 px-4 py-2.5 text-sm">
                  {a.status === "COMPLETED" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : a.status === "FAILED" ? (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                  )}
                  <span className="font-medium text-gray-900">{a.yearMonth}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{a.data.find((d) => d.dataType === "assets")?.recordCount ?? 0}건</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{a.trigger === "manual" ? "수동" : "자동"}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!data && !loading && !error && (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-500">{t.common.noData}</p>
          </div>
        )}
      </div>

      {showFieldPicker && (
        <FieldPickerModal yearMonth={yearMonth} onClose={() => setShowFieldPicker(false)} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-4 shadow-sm ring-1 ${highlight ? "bg-blue-50 ring-blue-200" : "bg-white ring-gray-200"}`}>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-blue-700" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
