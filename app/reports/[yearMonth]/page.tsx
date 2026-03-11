"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, FileText, Mail } from "lucide-react";

type AssetDetail = {
  id: string;
  name: string;
  type: string;
  status: string;
  cost: number;
  currency: string;
  billingCycle: string | null;
  assignedTo: string | null;
  department: string | null;
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
  summary: {
    totalCost: number;
    currency: string;
    assetCount: number;
  };
  byType: TypeBreakdown[];
  byStatus: { status: string; count: number; cost: number }[];
  byDepartment: { department: string; count: number; cost: number }[];
  assetDetails: AssetDetail[];
};

const TYPE_LABELS: Record<string, string> = {
  SOFTWARE: "소프트웨어",
  CLOUD: "클라우드",
  HARDWARE: "하드웨어",
  DOMAIN_SSL: "도메인/SSL",
  OTHER: "기타",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  DISPOSED: "폐기",
};

const TYPE_COLORS: Record<string, string> = {
  SOFTWARE: "#3B82F6",
  CLOUD: "#8B5CF6",
  HARDWARE: "#F59E0B",
  DOMAIN_SSL: "#10B981",
  OTHER: "#6B7280",
};

function formatCost(cost: number): string {
  return "₩" + Math.round(cost).toLocaleString("ko-KR");
}

export default function ReportDetailPage() {
  const params = useParams();
  const yearMonth = params.yearMonth as string;
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const DETAIL_PER_PAGE = 20;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/monthly/${yearMonth}/data`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `조회 실패 (${res.status})`);
        }
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "보고서 조회 실패");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [yearMonth]);

  const paginatedDetails = useMemo(() => {
    if (!data?.assetDetails) return [];
    const start = (detailPage - 1) * DETAIL_PER_PAGE;
    return data.assetDetails.slice(start, start + DETAIL_PER_PAGE);
  }, [data, detailPage]);

  const totalDetailPages = data?.assetDetails
    ? Math.ceil(data.assetDetails.length / DETAIL_PER_PAGE)
    : 0;

  // Simple bar chart for type breakdown
  const maxCost = data?.byType ? Math.max(...data.byType.map((t) => t.cost), 1) : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-center text-gray-500">보고서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-5xl px-4">
          <Link href="/reports" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> 보고서 목록
          </Link>
          <div className="rounded-lg bg-red-50 p-6 text-center ring-1 ring-red-200">
            <p className="text-sm text-red-700">{error || "데이터를 불러올 수 없습니다."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/reports" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> 보고서 목록
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{data.period} 월별 보고서</h1>
            <p className="mt-1 text-sm text-gray-500">
              {data.startDate} ~ {data.endDate}
            </p>
          </div>
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
            <Link
              href="/reports/settings"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Mail className="h-4 w-4 text-blue-500" />
              이메일 발송
            </Link>
          </div>
        </div>

        {/* Type Cost Bar Chart */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">유형별 비용 분포</h2>
          <div className="space-y-3">
            {data.byType.map((item) => (
              <div key={item.type} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-gray-700">
                  {TYPE_LABELS[item.type] || item.type}
                </span>
                <div className="flex-1">
                  <div className="h-6 rounded bg-gray-100">
                    <div
                      className="h-6 rounded"
                      style={{
                        width: `${(item.cost / maxCost) * 100}%`,
                        backgroundColor: TYPE_COLORS[item.type] || "#6B7280",
                        minWidth: item.cost > 0 ? "4px" : "0",
                      }}
                    />
                  </div>
                </div>
                <span className="w-32 shrink-0 text-right text-sm font-medium tabular-nums text-gray-900">
                  {formatCost(item.cost)}
                </span>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-gray-500">
                  {item.count}개
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Breakdown */}
        {data.byDepartment && data.byDepartment.length > 0 && (
          <div className="mb-6 rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">부서별 현황</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">부서</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">자산 수</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">비용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.byDepartment.map((row) => (
                    <tr key={row.department} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{row.department || "미배정"}</td>
                      <td className="px-6 py-3 text-right text-sm tabular-nums text-gray-600">{row.count}개</td>
                      <td className="px-6 py-3 text-right text-sm tabular-nums font-medium text-gray-900">{formatCost(row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Asset Details Table */}
        <div className="mb-6 rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              자산 상세 목록 ({data.assetDetails?.length || 0}건)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">자산명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">상태</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">비용</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">담당자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDetails.map((asset) => {
                  const statusColor =
                    asset.status === "ACTIVE" ? "bg-green-100 text-green-700"
                      : asset.status === "INACTIVE" ? "bg-gray-100 text-gray-700"
                      : "bg-red-100 text-red-700";
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{asset.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{TYPE_LABELS[asset.type] || asset.type}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                          {STATUS_LABELS[asset.status] || asset.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums font-medium text-gray-900">
                        {formatCost(asset.cost)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{asset.assignedTo || "—"}</td>
                    </tr>
                  );
                })}
                {(!data.assetDetails || data.assetDetails.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      자산 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalDetailPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
              <span className="text-sm text-gray-600">
                {(detailPage - 1) * DETAIL_PER_PAGE + 1}-
                {Math.min(detailPage * DETAIL_PER_PAGE, data.assetDetails.length)}
                / {data.assetDetails.length}건
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                  disabled={detailPage === 1}
                  className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  이전
                </button>
                <button
                  onClick={() => setDetailPage((p) => Math.min(totalDetailPages, p + 1))}
                  disabled={detailPage === totalDetailPages}
                  className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
