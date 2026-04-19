"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Edit, Trash2, RefreshCw, FileDown, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import CiaBadge from "@/app/_components/cia-badge";
import { LifecycleGaugeInline } from "@/app/_components/lifecycle-gauge";
import { TourGuide } from "@/app/_components/tour-guide";
import { CLOUD_TOUR_KEY, getCloudSteps } from "@/app/_components/tours/cloud-tour";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface Asset {
  id: number;
  name: string;
  status: AssetStatus;
  cost?: number | null;
  monthlyCost?: number | string | null;
  currency: string;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  assignee?: { id: number; name: string } | null;
  ciaC?: number | null; ciaI?: number | null; ciaA?: number | null;
  cloudDetail?: { platform?: string | null; accountId?: string | null; resourceType?: string | null } | null;
}

const STATUS_KEYS: Record<AssetStatus, string> = {
  IN_STOCK: "statusInStock",
  IN_USE: "statusInUse",
  INACTIVE: "statusInactive",
  UNUSABLE: "statusUnusable",
  PENDING_DISPOSAL: "statusPendingDisposal",
  DISPOSED: "statusDisposed",
};

const STATUS_COLORS: Record<AssetStatus, string> = {
  IN_STOCK: "bg-blue-100 text-blue-800",
  IN_USE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  UNUSABLE: "bg-yellow-100 text-yellow-800",
  PENDING_DISPOSAL: "bg-orange-100 text-orange-800",
  DISPOSED: "bg-red-100 text-red-800",
};

function formatCost(cost: number | null | undefined, currency: string): string {
  if (cost == null) return "—";
  const symbols: Record<string, string> = { KRW: "₩", USD: "$", EUR: "€", JPY: "¥", GBP: "£", CNY: "¥" };
  const sym = symbols[currency] ?? currency;
  return `${sym}${cost.toLocaleString()}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

export default function CloudListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === "ADMIN";

  const getStatusLabel = (s: AssetStatus) => (t.asset as Record<string, string>)[STATUS_KEYS[s]] ?? s;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | "">("");
  const [showExpiryBanner, setShowExpiryBanner] = useState(true);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "CLOUD");
      if (searchQuery) params.set("search", searchQuery);
      if (selectedStatus) params.set("status", selectedStatus);
      params.set("limit", "50");

      const res = await fetch(`/api/assets?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssets(data.assets ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error(t.toast.saveFail);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => loadAssets(), 300);
    return () => clearTimeout(timer);
  }, [loadAssets]);

  const costForecast = useMemo(() => {
    const ACTIVE = new Set(["IN_USE", "IN_STOCK"]);
    const activeAssets = assets.filter((a) => ACTIVE.has(a.status));
    const toNum = (v: number | string | null | undefined) => {
      if (v == null) return 0;
      return typeof v === "number" ? v : parseFloat(String(v)) || 0;
    };
    const currentMonthly = activeAssets.reduce((s, a) => s + toNum(a.monthlyCost), 0);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthly = activeAssets
      .filter((a) => !a.expiryDate || new Date(a.expiryDate) >= nextMonth)
      .reduce((s, a) => s + toNum(a.monthlyCost), 0);
    const expiringNextMonth = activeAssets.filter((a) => {
      if (!a.expiryDate) return false;
      const exp = new Date(a.expiryDate);
      const now = new Date();
      return exp >= now && exp < nextMonth;
    });
    return { currentMonthly: Math.round(currentMonthly), nextMonthly: Math.round(nextMonthly), expiringNextMonth };
  }, [assets]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(t.toast.confirmDelete)) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t.toast.deleteFail);
        return;
      }
      toast.success(t.toast.deleteSuccess);
      await loadAssets();
    } catch {
      toast.error(t.toast.deleteFail);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t.cloud.title}</h1>
          <div className="flex gap-2">
            <TourGuide tourKey={CLOUD_TOUR_KEY} steps={getCloudSteps(t)} />
            <button onClick={loadAssets} disabled={isLoading} className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            {isAdmin && (
              <a href="/api/export/all?type=CLOUD&format=xlsx" className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" title="Excel 내보내기">
                <FileDown className="h-4 w-4" />Excel
              </a>
            )}
            {isAdmin && (
              <Link href="/cloud/new" data-tour="cloud-new-btn" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                {t.cloud.newCloud}
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4">
            <input type="text" placeholder={`${t.asset.assetName} ${t.common.search}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedStatus("")} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === "" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
              {t.common.all} {t.common.status}
            </button>
            {(Object.keys(STATUS_KEYS) as AssetStatus[]).map((status) => (
              <button key={status} onClick={() => setSelectedStatus(status)} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === status ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {/* 비용 예측 카드 */}
        {!isLoading && assets.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase">{t.cloud.currentMonthEstimate}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">₩{costForecast.currentMonthly.toLocaleString()}</p>
              <p className="mt-0.5 text-xs text-gray-400">{t.cloud.activeSubscriptionBasis}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase">{t.cloud.nextMonthForecast}</p>
              <p className={`mt-1 text-xl font-bold ${costForecast.nextMonthly < costForecast.currentMonthly ? "text-green-600" : "text-gray-900"}`}>
                ₩{costForecast.nextMonthly.toLocaleString()}
              </p>
              {costForecast.currentMonthly > 0 && (
                <p className={`mt-0.5 text-xs ${costForecast.nextMonthly < costForecast.currentMonthly ? "text-green-600" : "text-gray-400"}`}>
                  {costForecast.nextMonthly < costForecast.currentMonthly
                    ? `▼ ₩${(costForecast.currentMonthly - costForecast.nextMonthly).toLocaleString()} ${t.cloud.decreaseForecast}`
                    : t.cloud.noChange}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase">{t.cloud.expiringNextMonthSub}</p>
              <p className="mt-1 text-xl font-bold text-amber-600">{costForecast.expiringNextMonth.length}{t.common.countSuffix}</p>
              {costForecast.expiringNextMonth.length > 0 && (
                <p className="mt-0.5 text-xs text-amber-500 truncate">
                  {costForecast.expiringNextMonth.map((a) => a.name).join(", ")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 만료 임박 배너 */}
        {showExpiryBanner && !isLoading && (() => {
          const now = new Date();
          const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const expiring = assets.filter((a) => a.expiryDate && a.status !== "DISPOSED" && new Date(a.expiryDate) >= now && new Date(a.expiryDate) <= in30);
          if (expiring.length === 0) return null;
          return (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">{t.cloud.expiryBanner} {expiring.length}{t.common.countSuffix}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {expiring.map((a) => {
                    const daysLeft = Math.ceil((new Date(a.expiryDate!).getTime() - now.getTime()) / 86400000);
                    return (
                      <Link key={a.id} href={`/cloud/${a.id}`} className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200">
                        {a.name}
                        <span className="rounded bg-red-600 px-1 py-0.5 text-[10px] text-white">D-{daysLeft}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => setShowExpiryBanner(false)} className="shrink-0 rounded p-1 text-red-400 hover:bg-red-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })()}

        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[800px]">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.asset.assetName}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.cloud.platform}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.common.status}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.asset.cost}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.asset.expiryDate}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.lifecycle.heading}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.asset.assignee}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.cia.title}</th>
                {isAdmin && <th className="px-6 py-3 text-right text-xs font-semibold whitespace-nowrap">{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-400">{t.common.loading}</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500">{t.common.noData}</td></tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/cloud/${asset.id}`} className="text-blue-600 hover:underline">{asset.name}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {asset.cloudDetail?.platform || "—"}
                      {asset.cloudDetail?.resourceType && <span className="ml-1.5 inline-flex rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-600">{asset.cloudDetail.resourceType}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[asset.status]}`}>{getStatusLabel(asset.status)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">{formatCost(asset.cost, asset.currency)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(asset.expiryDate)}</td>
                    <td className="px-6 py-4"><LifecycleGaugeInline startDate={asset.purchaseDate} endDate={asset.expiryDate} /></td>
                    <td className="px-6 py-4 text-sm">{asset.assignee?.name || "—"}</td>
                    <td className="px-6 py-4"><CiaBadge ciaC={asset.ciaC} ciaI={asset.ciaI} ciaA={asset.ciaA} /></td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => router.push(`/cloud/${asset.id}`)} className="rounded p-1 hover:bg-gray-200" title={t.common.detail}><Eye className="h-4 w-4" /></button>
                          <button onClick={() => router.push(`/cloud/${asset.id}/edit`)} className="rounded p-1 hover:bg-gray-200" title={t.common.edit}><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(asset.id, asset.name)} className="rounded p-1 hover:bg-gray-200" title={t.common.delete}><Trash2 className="h-4 w-4 text-red-600" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">{t.common.total} {total}{t.dashboard.items}</div>
      </div>
    </div>
  );
}
