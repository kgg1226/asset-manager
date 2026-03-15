"use client";

import { useState } from "react";
import { BarChart3, Download, FileSpreadsheet, FileText, Send } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

const TYPE_LABELS: Record<string, string> = {
  SOFTWARE: "소프트웨어",
  CLOUD: "클라우드",
  HARDWARE: "하드웨어",
  DOMAIN_SSL: "도메인/SSL",
  OTHER: "기타",
};

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
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/reports/monthly/${yearMonth}/data`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "보고서 데이터를 불러오는데 실패했습니다.");
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
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
      if (!res.ok) throw new Error(json.error ?? "이메일 발송에 실패했습니다.");
      setEmailResult("이메일이 발송되었습니다.");
    } catch (e) {
      setEmailResult(e instanceof Error ? e.message : "오류가 발생했습니다.");
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
          </div>
        </div>

        {/* 월 선택 */}
        <div className="mb-6 flex items-end gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
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
            <div className="ml-auto flex items-center gap-2">
              <a
                href={`/api/reports/monthly/${yearMonth}/excel`}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </a>
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
              <SummaryCard label="기간" value={data.period} />
              <SummaryCard
                label="월간 총 비용"
                value={`₩${data.summary.totalMonthlyCost.toLocaleString("ko-KR")}`}
                highlight
              />
              <SummaryCard label="자산 수" value={`${data.summary.assetCount}개`} />
            </div>

            {data.expiringCount > 0 && (
              <div className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 ring-1 ring-yellow-200">
                ⚠️ 30일 이내 만료 예정 자산: <strong>{data.expiringCount}개</strong>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 유형별 비용 */}
              <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-4 text-base font-semibold text-gray-900">유형별 비용</h2>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">유형</th>
                      <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">자산 수</th>
                      <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">월간 비용</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byType.length === 0 ? (
                      <tr><td colSpan={3} className="py-4 text-center text-sm text-gray-400">데이터 없음</td></tr>
                    ) : (
                      data.byType.map((row) => (
                        <tr key={row.type}>
                          <td className="py-2 text-sm text-gray-900">{TYPE_LABELS[row.type] ?? row.type}</td>
                          <td className="py-2 text-right text-sm text-gray-600">{row.count}개</td>
                          <td className="py-2 text-right text-sm font-medium text-gray-900">
                            ₩{row.cost.toLocaleString("ko-KR")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 부서별 비용 */}
              <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="mb-4 text-base font-semibold text-gray-900">부서별 비용</h2>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">부서</th>
                      <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">자산 수</th>
                      <th className="pb-2 text-right text-xs font-medium uppercase text-gray-500">월간 비용</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byDepartment.length === 0 ? (
                      <tr><td colSpan={3} className="py-4 text-center text-sm text-gray-400">데이터 없음</td></tr>
                    ) : (
                      data.byDepartment.map((row) => (
                        <tr key={row.department}>
                          <td className="py-2 text-sm text-gray-900">{row.department}</td>
                          <td className="py-2 text-right text-sm text-gray-600">{row.count}개</td>
                          <td className="py-2 text-right text-sm font-medium text-gray-900">
                            ₩{row.cost.toLocaleString("ko-KR")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 이메일 발송 */}
            <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                <Send className="h-4 w-4 text-blue-500" />
                {t.report.sendEmail}
              </h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="이메일 주소 (쉼표로 구분)"
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
                <p className={`mt-2 text-sm ${emailResult.includes("발송") ? "text-green-600" : "text-red-600"}`}>
                  {emailResult}
                </p>
              )}
            </div>
          </>
        )}

        {!data && !loading && !error && (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-500">{t.common.noData}</p>
          </div>
        )}
      </div>
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
