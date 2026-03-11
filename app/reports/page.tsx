"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileSpreadsheet, FileText, Download, Calendar, DollarSign, Package } from "lucide-react";

type ReportSummary = {
  totalCost: number;
  currency: string;
  assetCount: number;
};

type TypeBreakdown = {
  type: string;
  count: number;
  cost: number;
};

type ReportData = {
  period: string;
  startDate: string;
  endDate: string;
  summary: ReportSummary;
  byType: TypeBreakdown[];
  byStatus: { status: string; count: number; cost: number }[];
};

const TYPE_LABELS: Record<string, string> = {
  SOFTWARE: "소프트웨어",
  CLOUD: "클라우드",
  HARDWARE: "하드웨어",
  DOMAIN_SSL: "도메인/SSL",
  OTHER: "기타",
};

function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatCost(cost: number): string {
  return "₩" + Math.round(cost).toLocaleString("ko-KR");
}

export default function ReportsPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport(yearMonth);
  }, [yearMonth]);

  async function fetchReport(period: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/monthly/${period}/data`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `조회 실패 (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "보고서 조회에 실패했습니다.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">월별 보고서</h1>
        </div>

        {/* Month Selector */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Download Buttons */}
          {data && (
            <div className="flex items-center gap-2">
              <a
                href={`/api/reports/monthly/${yearMonth}/excel`}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel
              </a>
              <a
                href={`/api/reports/monthly/${yearMonth}/pdf`}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 text-red-500" />
                PDF
              </a>
            </div>
          )}
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">보고서를 불러오는 중...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-6 text-center shadow-sm ring-1 ring-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Report Content */}
        {data && !loading && (
          <>
            {/* Summary Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-medium uppercase text-gray-500">총 비용</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {formatCost(data.summary.totalCost)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <span className="text-xs font-medium uppercase text-gray-500">자산 수</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {data.summary.assetCount}개
                </p>
              </div>
              <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span className="text-xs font-medium uppercase text-gray-500">기간</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{data.period}</p>
              </div>
            </div>

            {/* Type Breakdown Table */}
            <div className="mb-6 rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">유형별 비용</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">유형</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">자산 수</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">비용</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">비중</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byType.map((row) => (
                      <tr key={row.type} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          {TYPE_LABELS[row.type] || row.type}
                        </td>
                        <td className="px-6 py-3 text-right text-sm tabular-nums text-gray-600">
                          {row.count}개
                        </td>
                        <td className="px-6 py-3 text-right text-sm tabular-nums text-gray-900 font-medium">
                          {formatCost(row.cost)}
                        </td>
                        <td className="px-6 py-3 text-right text-sm tabular-nums text-gray-500">
                          {data.summary.totalCost > 0
                            ? ((row.cost / data.summary.totalCost) * 100).toFixed(1) + "%"
                            : "—"}
                        </td>
                      </tr>
                    ))}
                    {data.byType.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                          해당 기간에 자산 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {data.byType.length > 0 && (
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900">합계</td>
                        <td className="px-6 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                          {data.summary.assetCount}개
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                          {formatCost(data.summary.totalCost)}
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">100%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Status Breakdown */}
            {data.byStatus && data.byStatus.length > 0 && (
              <div className="mb-6 rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-gray-900">상태별 현황</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">상태</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">자산 수</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">비용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.byStatus.map((row) => {
                        const statusLabel = row.status === "ACTIVE" ? "활성" : row.status === "INACTIVE" ? "비활성" : "폐기";
                        const statusColor = row.status === "ACTIVE" ? "text-green-700 bg-green-100" : row.status === "INACTIVE" ? "text-gray-700 bg-gray-100" : "text-red-700 bg-red-100";
                        return (
                          <tr key={row.status} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right text-sm tabular-nums text-gray-600">{row.count}개</td>
                            <td className="px-6 py-3 text-right text-sm tabular-nums font-medium text-gray-900">{formatCost(row.cost)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Link to Detail */}
            <div className="text-center">
              <Link
                href={`/reports/${yearMonth}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                상세 보고서 보기
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
