"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import CategoryTabs from "./category-tabs";
import DashboardMetricCards from "./metric-cards";
import DashboardCharts from "./dashboard-charts";
import ExpiringWidget from "./expiring-widget";
import type { DashboardData, AssetCategory } from "@/lib/dashboard-aggregator";
import { CATEGORY_LABELS } from "@/lib/dashboard-aggregator";

export default function DashboardContent({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedType, setSelectedType] = useState<AssetCategory | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (type: AssetCategory | null) => {
    setLoading(true);
    try {
      const url = type ? `/api/dashboard?type=${type}` : "/api/dashboard";
      const res = await fetch(url);
      if (res.ok) {
        const json: DashboardData = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Dashboard data load failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTabChange = useCallback(
    (type: AssetCategory | null) => {
      setSelectedType(type);
      if (type === null) {
        setData(initialData);
      } else {
        fetchData(type);
      }
    },
    [initialData, fetchData]
  );

  useEffect(() => {
    if (selectedType === null) {
      setData(initialData);
    }
  }, [initialData, selectedType]);

  const title = selectedType
    ? `${CATEGORY_LABELS[selectedType]} ${t.dashboard.totalAssets}`
    : t.dashboard.title;

  const subtitle = selectedType
    ? `${CATEGORY_LABELS[selectedType]} ${t.dashboard.assetsByType}`
    : `${t.dashboard.totalAssets} · ${t.dashboard.monthlyExpenses}`;

  return (
    <div className={loading ? "opacity-60 transition-opacity" : ""}>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mb-6 text-sm text-gray-500">{subtitle}</p>

      <CategoryTabs selected={selectedType} onChange={handleTabChange} />
      <DashboardMetricCards metrics={data.metrics} />
      <DashboardCharts
        monthlyTrend={data.charts.monthlyTrend}
        typeDistribution={data.charts.typeDistribution}
        statusDistribution={data.charts.statusDistribution}
        growthTrend={data.charts.growthTrend}
      />
      <ExpiringWidget items={data.expiringItems} />
    </div>
  );
}
