"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTranslation } from "@/lib/i18n";
import type { OrgUsagePoint } from "@/lib/dashboard-aggregator";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

function CostTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white p-3 shadow-lg ring-1 ring-gray-200 text-sm">
      {payload.map((p, i) => (
        <p key={i} className="font-medium" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}{p.name.includes("비용") ? " 원" : "건"}
        </p>
      ))}
    </div>
  );
}

export default function OrgUsageWidget({ data }: { data: OrgUsagePoint[] }) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          {t.dashboard.orgUsage ?? "조직별 자산 현황"}
        </h2>
        <div className="flex h-48 items-center justify-center rounded-md bg-gray-50">
          <p className="text-sm text-gray-400">{t.common.noData}</p>
        </div>
      </div>
    );
  }

  // 차트 데이터: 상위 10개 조직
  const chartData = data.slice(0, 10).map((d) => ({
    name: d.orgName.length > 12 ? d.orgName.slice(0, 12) + "…" : d.orgName,
    fullName: d.orgName,
    company: d.companyName,
    licenses: d.licenseCount,
    assets: d.assetCount,
    cost: Math.round(d.monthlyCostKRW),
  }));

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-1 text-base font-semibold text-gray-900">
        {t.dashboard.orgUsage ?? "조직별 자산 현황"}
      </h2>
      <p className="mb-4 text-xs text-gray-500">
        {t.dashboard.orgUsageDesc ?? "조직별 라이선스·자산 수 및 월간 비용"}
      </p>

      {/* 차트 */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={<CostTooltip />} cursor={{ fill: "#eff6ff" }} />
            <Legend formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>} />
            <Bar dataKey="licenses" name="라이선스" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="assets" name="자산" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">조직</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">회사</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">라이선스</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">자산</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">합계</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">월 비용 (₩)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((d, i) => (
              <tr key={d.orgId ?? `unassigned-${i}`} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {d.orgName}
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-500">{d.companyName || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">{d.licenseCount}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-700">{d.assetCount}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">{d.totalCount}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-blue-700">
                  ₩{Math.round(d.monthlyCostKRW).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
