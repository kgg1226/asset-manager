"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import CategoryTabs from "./category-tabs";
import DashboardMetricCards from "./metric-cards";
import DashboardCharts from "./dashboard-charts";
import OrgUsageWidget from "./org-usage-widget";
import ExpiringWidget from "./expiring-widget";
import type { DashboardData, AssetCategory } from "@/lib/dashboard-aggregator";
import { CATEGORY_LABELS } from "@/lib/dashboard-aggregator";
import { TourGuide } from "@/app/_components/tour-guide";
import { DASHBOARD_TOUR_KEY, getDashboardSteps } from "@/app/_components/tours/dashboard-tour";
import { Settings, GripVertical, Eye, EyeOff, X } from "lucide-react";

// ── 위젯 정의 ──────────────────────────────────────────────────
type WidgetId = "metrics" | "charts" | "orgUsage" | "expiring";

const DEFAULT_WIDGETS: WidgetId[] = ["metrics", "charts", "orgUsage", "expiring"];
function getWidgetLabels(t: ReturnType<typeof import("@/lib/i18n").useTranslation>["t"]): Record<WidgetId, string> {
  return {
    metrics: t.dashboard.widgetMetrics,
    charts: t.dashboard.widgetCharts,
    orgUsage: t.dashboard.widgetOrgUsage,
    expiring: t.dashboard.widgetExpiring,
  };
}

const STORAGE_KEY = "dashboard-widget-config";

type WidgetConfig = { id: WidgetId; visible: boolean };

function loadConfig(): WidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_WIDGETS.map((id) => ({ id, visible: true }));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS.map((id) => ({ id, visible: true }));
    const parsed: WidgetConfig[] = JSON.parse(raw);
    // Ensure all default widgets are present (handles new widgets added after save)
    const presentIds = new Set(parsed.map((w) => w.id));
    const merged = [
      ...parsed.filter((w) => DEFAULT_WIDGETS.includes(w.id)),
      ...DEFAULT_WIDGETS.filter((id) => !presentIds.has(id)).map((id) => ({ id, visible: true })),
    ];
    return merged;
  } catch {
    return DEFAULT_WIDGETS.map((id) => ({ id, visible: true }));
  }
}

function saveConfig(config: WidgetConfig[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// ── 위젯 커스터마이즈 패널 ──────────────────────────────────────
function WidgetConfigPanel({
  config,
  onChange,
  onClose,
}: {
  config: WidgetConfig[];
  onChange: (config: WidgetConfig[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const WIDGET_LABELS = getWidgetLabels(t);
  const [local, setLocal] = useState<WidgetConfig[]>(config);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const toggleVisible = (id: WidgetId) => {
    setLocal((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...local];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setLocal(next);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const apply = () => {
    onChange(local);
    saveConfig(local);
    onClose();
  };

  const reset = () => {
    const defaultConfig = DEFAULT_WIDGETS.map((id) => ({ id, visible: true }));
    setLocal(defaultConfig);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
      <div className="w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{t.dashboard.widgetConfig}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="p-4">
          <p className="mb-3 text-xs text-gray-500">{t.dashboard.widgetConfigDesc}</p>
          <div className="space-y-1.5">
            {local.map((widget, idx) => (
              <div
                key={widget.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-grab active:cursor-grabbing ${
                  dragIdx === idx ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="flex-1 text-sm text-gray-700">{WIDGET_LABELS[widget.id]}</span>
                <button
                  onClick={() => toggleVisible(widget.id)}
                  className={`rounded p-1 ${widget.visible ? "text-blue-600 hover:bg-blue-50" : "text-gray-400 hover:bg-gray-100"}`}
                  title={widget.visible ? t.common.hide : t.common.show}
                >
                  {widget.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 border-t px-4 py-3">
          <button onClick={reset} className="flex-1 rounded-md border border-gray-300 py-1.5 text-sm text-gray-600 hover:bg-gray-50">{t.common.reset}</button>
          <button onClick={apply} className="flex-1 rounded-md bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-700">{t.common.apply}</button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ───────────────────────────────────────────────

export default function DashboardContent({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedType, setSelectedType] = useState<AssetCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[]>(() =>
    DEFAULT_WIDGETS.map((id) => ({ id, visible: true }))
  );
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setWidgetConfig(loadConfig());
  }, []);

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

  const isVisible = (id: WidgetId) => widgetConfig.find((w) => w.id === id)?.visible ?? true;

  // Render widgets in configured order
  const widgetRenderer: Record<WidgetId, React.ReactNode> = {
    metrics: isVisible("metrics") ? (
      <div key="metrics" data-tour="dashboard-summary">
        <DashboardMetricCards metrics={data.metrics} />
      </div>
    ) : null,
    charts: isVisible("charts") ? (
      <DashboardCharts
        key="charts"
        monthlyTrend={data.charts.monthlyTrend}
        typeDistribution={data.charts.typeDistribution}
        statusDistribution={data.charts.statusDistribution}
        growthTrend={data.charts.growthTrend}
      />
    ) : null,
    orgUsage: isVisible("orgUsage") ? <OrgUsageWidget key="orgUsage" data={data.orgUsage} /> : null,
    expiring: isVisible("expiring") ? <ExpiringWidget key="expiring" items={data.expiringItems} /> : null,
  };

  return (
    <div className={loading ? "opacity-60 transition-opacity" : ""}>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigPanel(true)}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            title={t.dashboard.widgetConfig}
          >
            <Settings className="h-4 w-4" />
            {t.dashboard.widgetConfig}
          </button>
          <TourGuide tourKey={DASHBOARD_TOUR_KEY} steps={getDashboardSteps(t)} />
        </div>
      </div>
      <p className="mb-6 text-sm text-gray-500">{subtitle}</p>

      <div data-tour="dashboard-categories">
        <CategoryTabs selected={selectedType} onChange={handleTabChange} />
      </div>

      {/* Render widgets in configured order */}
      {widgetConfig.map((w) => widgetRenderer[w.id])}

      {showConfigPanel && (
        <WidgetConfigPanel
          config={widgetConfig}
          onChange={setWidgetConfig}
          onClose={() => setShowConfigPanel(false)}
        />
      )}
    </div>
  );
}
