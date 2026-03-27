"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { useTranslation } from "@/lib/i18n";
import type {
  TrendPoint,
  TypeDistPoint,
  StatusDistPoint,
  GrowthPoint,
} from "@/lib/dashboard-aggregator";

// ── Colors ──

const TYPE_COLORS: Record<string, string> = {
  SOFTWARE: "#3b82f6",
  CLOUD: "#8b5cf6",
  HARDWARE: "#f59e0b",
  DOMAIN_SSL: "#10b981",
  OTHER: "#6b7280",
};

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "#3b82f6",
  IN_USE: "#10b981",
  INACTIVE: "#6b7280",
  UNUSABLE: "#f59e0b",
  PENDING_DISPOSAL: "#f97316",
  DISPOSED: "#ef4444",
};

// ── Utils ──

function formatCostAxis(value: number): string {
  if (value === 0) return "0";
  return `₩${value.toLocaleString()}`;
}

function CostTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white p-3 shadow-lg ring-1 ring-gray-200 text-sm">
      <p className="mb-1 font-medium text-gray-700">{label}</p>
      <p className="text-blue-600 font-semibold">
        ₩{payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

function GrowthTooltip({
  active,
  payload,
  label,
  unitLabel,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unitLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white p-3 shadow-lg ring-1 ring-gray-200 text-sm">
      <p className="mb-1 font-medium text-gray-700">{label}</p>
      <p className="text-indigo-600 font-semibold">{payload[0].value}{unitLabel}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-md bg-gray-50">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

// ── Main Component ──

export default function DashboardCharts({
  monthlyTrend,
  typeDistribution,
  statusDistribution,
  growthTrend,
}: {
  monthlyTrend: TrendPoint[];
  typeDistribution: TypeDistPoint[];
  statusDistribution: StatusDistPoint[];
  growthTrend: GrowthPoint[];
}) {
  const { t } = useTranslation();

  const hasMonthlyData = monthlyTrend.some((d) => d.cost > 0);
  const hasTypeData = typeDistribution.length > 0;
  const hasStatusData = statusDistribution.length > 0;
  const hasGrowthData = growthTrend.some((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Row 1: Monthly cost trend */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-1 text-base font-semibold text-gray-900">{t.dashboard.monthlyExpenses}</h2>
        <p className="mb-4 text-xs text-gray-500">{t.dashboard.assetsByType}</p>
        {hasMonthlyData ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCostAxis} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} width={56} />
              <Tooltip content={<CostTooltip />} cursor={{ fill: "#eff6ff" }} />
              <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message={t.common.noData} />
        )}
      </div>

      {/* Row 2: Category distribution + Status distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category distribution */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-1 text-base font-semibold text-gray-900">{t.dashboard.assetsByType}</h2>
          <p className="mb-4 text-xs text-gray-500">{t.dashboard.totalAssets}</p>
          {hasTypeData ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                  paddingAngle={3}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {typeDistribution.map((d) => (
                    <Cell key={d.name} fill={TYPE_COLORS[d.name] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Legend formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>} />
                <Tooltip
                  formatter={((value: number, _name: string, props: { payload?: TypeDistPoint }) => {
                    const cost = props.payload?.cost ?? 0;
                    return [`${value}${t.dashboard.items} · ₩${cost.toLocaleString()}`, ""];
                  }) as never}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={t.common.noData} />
          )}
        </div>

        {/* Status distribution */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-1 text-base font-semibold text-gray-900">{t.common.status}</h2>
          <p className="mb-4 text-xs text-gray-500">{t.dashboard.totalAssets}</p>
          {hasStatusData ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                  paddingAngle={3}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusDistribution.map((d) => (
                    <Cell key={d.name} fill={STATUS_COLORS[d.name] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Legend formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>} />
                <Tooltip formatter={((value: number) => [`${value}${t.dashboard.items}`, t.dashboard.totalAssets]) as never} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={t.common.noData} />
          )}
        </div>
      </div>

      {/* Row 3: Asset growth trend */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-1 text-base font-semibold text-gray-900">{t.dashboard.totalAssets}</h2>
        <p className="mb-4 text-xs text-gray-500">{t.dashboard.recentActivities}</p>
        {hasGrowthData ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={growthTrend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<GrowthTooltip unitLabel={t.dashboard.items} />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#growthGradient)"
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message={t.common.noData} />
        )}
      </div>
    </div>
  );
}
