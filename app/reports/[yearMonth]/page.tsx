import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

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

type Props = { params: Promise<{ yearMonth: string }> };

export default async function ReportDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) return notFound();

  const { yearMonth } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) return notFound();

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  let data: {
    period: string;
    startDate: string;
    endDate: string;
    summary: { totalMonthlyCost: number; assetCount: number };
    byType: { type: string; count: number; cost: number }[];
    byStatus: { status: string; count: number; cost: number }[];
    byDepartment: { department: string; count: number; cost: number }[];
    expiringCount: number;
    assetDetails: {
      id: string;
      name: string;
      type: string;
      status: string;
      vendor: string | null;
      monthlyCost: number | null;
      expiryDate: string | null;
      assignee: { id: string; name: string } | null;
      department: string | null;
    }[];
  } | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/reports/monthly/${yearMonth}/data`, {
      headers: { Cookie: "" },
      cache: "no-store",
    });
    if (res.ok) {
      data = await res.json();
    }
  } catch {
    // fallback: data remains null
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <Link href="/reports" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> 보고서 목록
          </Link>
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">{yearMonth} 보고서 데이터를 불러올 수 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{yearMonth} 보고서</h1>
            <span className="text-sm text-gray-400">{data.startDate} ~ {data.endDate}</span>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
            <p className="text-xs font-medium uppercase text-gray-500">월간 총 비용</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">
              ₩{data.summary.totalMonthlyCost.toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <p className="text-xs font-medium uppercase text-gray-500">전체 자산</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{data.summary.assetCount}개</p>
          </div>
          <div className={`rounded-lg p-4 ring-1 ${data.expiringCount > 0 ? "bg-yellow-50 ring-yellow-200" : "bg-white ring-gray-200"}`}>
            <p className="text-xs font-medium uppercase text-gray-500">30일 내 만료</p>
            <p className={`mt-1 text-2xl font-bold ${data.expiringCount > 0 ? "text-yellow-700" : "text-gray-900"}`}>
              {data.expiringCount}개
            </p>
          </div>
        </div>

        {/* Charts: Type & Status */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TableSection
            title="유형별 현황"
            headers={["유형", "자산 수", "월간 비용"]}
            rows={data.byType.map((r) => [
              TYPE_LABELS[r.type] ?? r.type,
              `${r.count}개`,
              `₩${r.cost.toLocaleString("ko-KR")}`,
            ])}
          />
          <TableSection
            title="상태별 현황"
            headers={["상태", "자산 수", "월간 비용"]}
            rows={data.byStatus.map((r) => [
              STATUS_LABELS[r.status] ?? r.status,
              `${r.count}개`,
              `₩${r.cost.toLocaleString("ko-KR")}`,
            ])}
          />
        </div>

        {/* Department */}
        <div className="mb-6">
          <TableSection
            title="부서별 비용"
            headers={["부서", "자산 수", "월간 비용"]}
            rows={data.byDepartment.map((r) => [
              r.department,
              `${r.count}개`,
              `₩${r.cost.toLocaleString("ko-KR")}`,
            ])}
          />
        </div>

        {/* Asset Details Table */}
        <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">자산 상세 목록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">자산명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">상태</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">월간 비용</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">담당자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">만료일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.assetDetails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                      해당 기간에 자산이 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.assetDetails.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:underline">
                          {asset.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {TYPE_LABELS[asset.type] ?? asset.type}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {asset.monthlyCost != null ? `₩${asset.monthlyCost.toLocaleString("ko-KR")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {asset.assignee?.name ?? asset.department ?? "미배정"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {asset.expiryDate
                          ? new Date(asset.expiryDate).toLocaleDateString("ko-KR")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableSection({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`pb-2 text-xs font-medium uppercase text-gray-500 ${i > 0 ? "text-right" : "text-left"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-4 text-center text-sm text-gray-400">
                데이터 없음
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`py-2 text-sm ${ci === 0 ? "text-gray-900" : "text-right text-gray-600"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    INACTIVE: "bg-gray-100 text-gray-600",
    DISPOSED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
