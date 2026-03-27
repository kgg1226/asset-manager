"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Edit, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import CiaBadge from "@/app/_components/cia-badge";
import { LifecycleGaugeInline } from "@/app/_components/lifecycle-gauge";
import { TourGuide } from "@/app/_components/tour-guide";
import { DOMAINS_TOUR_KEY, getDomainsSteps } from "@/app/_components/tours/domains-tour";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface Asset {
  id: number; name: string; status: AssetStatus; cost?: number | null; currency: string;
  vendor?: string | null; purchaseDate?: string | null; expiryDate?: string | null; assignee?: { id: number; name: string } | null;
  ciaC?: number | null; ciaI?: number | null; ciaA?: number | null;
}

const STATUS_KEYS: Record<AssetStatus, string> = { IN_STOCK: "statusInStock", IN_USE: "statusInUse", INACTIVE: "statusInactive", UNUSABLE: "statusUnusable", PENDING_DISPOSAL: "statusPendingDisposal", DISPOSED: "statusDisposed" };
const STATUS_COLORS: Record<AssetStatus, string> = { IN_STOCK: "bg-blue-100 text-blue-800", IN_USE: "bg-green-100 text-green-800", INACTIVE: "bg-gray-100 text-gray-800", UNUSABLE: "bg-yellow-100 text-yellow-800", PENDING_DISPOSAL: "bg-orange-100 text-orange-800", DISPOSED: "bg-red-100 text-red-800" };

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

export default function DomainsListPage() {
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

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "DOMAIN_SSL");
      if (searchQuery) params.set("search", searchQuery);
      if (selectedStatus) params.set("status", selectedStatus);
      params.set("limit", "50");
      const res = await fetch(`/api/assets?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssets(data.assets ?? []); setTotal(data.total ?? 0);
    } catch { toast.error(t.common.error); }
    finally { setIsLoading(false); }
  }, [searchQuery, selectedStatus]);

  useEffect(() => { const t = setTimeout(() => loadAssets(), 300); return () => clearTimeout(t); }, [loadAssets]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(t.toast.confirmDelete)) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || t.toast.deleteFail); return; }
      toast.success(t.toast.deleteSuccess); await loadAssets();
    } catch { toast.error(t.toast.deleteFail); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t.domain.title}</h1>
          <div className="flex gap-2">
            <TourGuide tourKey={DOMAINS_TOUR_KEY} steps={getDomainsSteps(t)} />
            <button onClick={loadAssets} disabled={isLoading} className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            {isAdmin && (
              <Link href="/domains/new" data-tour="domain-new-btn" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />{t.domain.newDomain}
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4">
            <input type="text" placeholder={`${t.asset.assetName} ${t.common.search}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedStatus("")} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === "" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>{t.common.all} {t.common.status}</button>
            {(Object.keys(STATUS_KEYS) as AssetStatus[]).map((s) => (
              <button key={s} onClick={() => setSelectedStatus(s)} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === s ? "bg-blue-600 text-white" : "bg-gray-100"}`}>{getStatusLabel(s)}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[700px]">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.asset.assetName}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.asset.vendor}</th>
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
                assets.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium"><Link href={`/domains/${a.id}`} className="text-blue-600 hover:underline">{a.name}</Link></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.vendor || "—"}</td>
                    <td className="px-6 py-4"><span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[a.status]}`}>{getStatusLabel(a.status)}</span></td>
                    <td className="px-6 py-4 text-sm">{formatCost(a.cost, a.currency)}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(a.expiryDate)}</td>
                    <td className="px-6 py-4"><LifecycleGaugeInline startDate={a.purchaseDate} endDate={a.expiryDate} /></td>
                    <td className="px-6 py-4 text-sm">{a.assignee?.name || "—"}</td>
                    <td className="px-6 py-4 text-sm"><CiaBadge ciaC={a.ciaC} ciaI={a.ciaI} ciaA={a.ciaA} /></td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => router.push(`/domains/${a.id}`)} className="rounded p-1 hover:bg-gray-200" title={t.common.detail}><Eye className="h-4 w-4" /></button>
                          <button onClick={() => router.push(`/domains/${a.id}/edit`)} className="rounded p-1 hover:bg-gray-200" title={t.common.edit}><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(a.id, a.name)} className="rounded p-1 hover:bg-gray-200" title={t.common.delete}><Trash2 className="h-4 w-4 text-red-600" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">{t.common.total} {total}{t.dashboard.items} {t.domain.title}</div>
      </div>
    </div>
  );
}
