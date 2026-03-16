"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Edit, Trash2, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import CiaBadge from "@/app/_components/cia-badge";
import { TourGuide } from "@/app/_components/tour-guide";
import { CONTRACTS_TOUR_KEY, getContractsSteps } from "@/app/_components/tours/contracts-tour";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface Asset {
  id: number; name: string; status: AssetStatus; cost?: number | null; currency: string;
  vendor?: string | null; expiryDate?: string | null;
  ciaC?: number | null; ciaI?: number | null; ciaA?: number | null;
  assignee?: { id: number; name: string } | null;
  orgUnit?: { id: number; name: string } | null;
  contractDetail?: { contractNumber?: string | null; counterparty?: string | null; contractType?: string | null; autoRenew?: boolean } | null;
}

const STATUS_KEYS: Record<AssetStatus, string> = { IN_STOCK: "statusInStock", IN_USE: "statusInUse", INACTIVE: "statusInactive", UNUSABLE: "statusUnusable", PENDING_DISPOSAL: "statusPendingDisposal", DISPOSED: "statusDisposed" };
const STATUS_COLORS: Record<AssetStatus, string> = { IN_STOCK: "bg-gray-100 text-gray-800", IN_USE: "bg-green-100 text-green-800", INACTIVE: "bg-yellow-100 text-yellow-800", UNUSABLE: "bg-orange-100 text-orange-800", PENDING_DISPOSAL: "bg-red-100 text-red-800", DISPOSED: "bg-gray-800 text-gray-100" };

type SortField = "name" | "counterparty" | "contractType" | "status" | "cost" | "expiryDate" | "assignee" | "orgUnit";
type SortOrder = "asc" | "desc";

function formatCost(cost: number | null | undefined, currency: string): string {
  if (cost == null) return "—";
  const symbols: Record<string, string> = { KRW: "₩", USD: "$", EUR: "€", JPY: "¥", GBP: "£", CNY: "¥" };
  const sym = symbols[currency] ?? currency;
  return `${sym}${cost.toLocaleString()}`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

const STATUS_ORDER: Record<AssetStatus, number> = { IN_STOCK: 0, IN_USE: 1, INACTIVE: 2, UNUSABLE: 3, PENDING_DISPOSAL: 4, DISPOSED: 5 };

function sortAssets(assets: Asset[], field: SortField | null, order: SortOrder): Asset[] {
  if (!field) return assets;
  return [...assets].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "name": cmp = a.name.localeCompare(b.name, "ko"); break;
      case "counterparty": {
        const av = a.contractDetail?.counterparty ?? a.vendor ?? "";
        const bv = b.contractDetail?.counterparty ?? b.vendor ?? "";
        cmp = av.localeCompare(bv, "ko");
        break;
      }
      case "contractType": {
        const av = a.contractDetail?.contractType ?? "";
        const bv = b.contractDetail?.contractType ?? "";
        cmp = av.localeCompare(bv, "ko");
        break;
      }
      case "status": cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
      case "cost": cmp = (a.cost ?? -Infinity) - (b.cost ?? -Infinity); break;
      case "expiryDate": cmp = (a.expiryDate ?? "").localeCompare(b.expiryDate ?? ""); break;
      case "assignee": cmp = (a.assignee?.name ?? "\uffff").localeCompare(b.assignee?.name ?? "\uffff", "ko"); break;
      case "orgUnit": cmp = (a.orgUnit?.name ?? "\uffff").localeCompare(b.orgUnit?.name ?? "\uffff", "ko"); break;
    }
    return order === "desc" ? -cmp : cmp;
  });
}

export default function ContractListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === "ADMIN";

  const getStatusLabel = (s: AssetStatus) => (t.asset as Record<string, string>)[STATUS_KEYS[s]] ?? s;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | "">("");

  const [sortField, setSortField] = useState<SortField | null>((searchParams.get("sort") as SortField) || null);
  const [sortOrder, setSortOrder] = useState<SortOrder>((searchParams.get("order") as SortOrder) || "asc");

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "CONTRACT");
      if (searchQuery) params.set("search", searchQuery);
      if (selectedStatus) params.set("status", selectedStatus);
      params.set("limit", "100");
      const res = await fetch(`/api/assets?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssets(data.assets ?? []); setTotal(data.total ?? 0);
    } catch { toast.error(t.common.error); }
    finally { setIsLoading(false); }
  }, [searchQuery, selectedStatus]);

  useEffect(() => { const t = setTimeout(() => loadAssets(), 300); return () => clearTimeout(t); }, [loadAssets]);

  const handleSort = (field: SortField) => {
    let newField: SortField | null = field;
    let newOrder: SortOrder = "asc";
    if (sortField === field) {
      if (sortOrder === "asc") { newOrder = "desc"; }
      else { newField = null; newOrder = "asc"; }
    }
    setSortField(newField);
    setSortOrder(newOrder);
    const url = new URL(window.location.href);
    if (newField) { url.searchParams.set("sort", newField); url.searchParams.set("order", newOrder); }
    else { url.searchParams.delete("sort"); url.searchParams.delete("order"); }
    window.history.replaceState(null, "", url.toString());
  };

  const sortedAssets = useMemo(() => sortAssets(assets, sortField, sortOrder), [assets, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300">⇅</span>;
    return sortOrder === "asc" ? <ChevronUp className="ml-0.5 inline h-3 w-3 text-blue-600" /> : <ChevronDown className="ml-0.5 inline h-3 w-3 text-blue-600" />;
  };

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
          <h1 className="text-3xl font-bold text-gray-900">{t.contract.title}</h1>
          <div className="flex gap-2">
            <TourGuide tourKey={CONTRACTS_TOUR_KEY} steps={getContractsSteps(t)} />
            <button onClick={loadAssets} disabled={isLoading} className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            {isAdmin && (
              <Link href="/contracts/new" data-tour="contract-new-btn" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />{t.contract.newContract}
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4" data-tour="contract-search">
            <input type="text" placeholder={`${t.asset.assetName} ${t.common.search}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2" data-tour="contract-filter">
            <button onClick={() => setSelectedStatus("")} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === "" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>{t.common.all} {t.common.status}</button>
            {(Object.keys(STATUS_KEYS) as AssetStatus[]).map((s) => (
              <button key={s} onClick={() => setSelectedStatus(s)} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === s ? "bg-blue-600 text-white" : "bg-gray-100"}`}>{getStatusLabel(s)}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow-sm" data-tour="contract-table">
          <table className="w-full min-w-[800px]">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("name")}>{t.asset.assetName}<SortIcon field="name" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("counterparty")}>{t.contract.counterparty}<SortIcon field="counterparty" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("contractType")}>{t.contract.contractType}<SortIcon field="contractType" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("status")}>{t.common.status}<SortIcon field="status" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("cost")}>{t.asset.cost}<SortIcon field="cost" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("expiryDate")}>{t.asset.expiryDate}<SortIcon field="expiryDate" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("assignee")}>{t.asset.assignee}<SortIcon field="assignee" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("orgUnit")}>{t.license.managingOrg}<SortIcon field="orgUnit" /></th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.cia.title}</th>
                {isAdmin && <th className="px-6 py-3 text-right text-xs font-semibold whitespace-nowrap">{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-400">{t.common.loading}</td></tr>
              ) : sortedAssets.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-500">{t.common.noData}</td></tr>
              ) : (
                sortedAssets.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium"><Link href={`/contracts/${a.id}`} className="text-blue-600 hover:underline">{a.name}</Link></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.contractDetail?.counterparty || a.vendor || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.contractDetail?.contractType || "—"}</td>
                    <td className="px-6 py-4"><span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[a.status]}`}>{getStatusLabel(a.status)}</span></td>
                    <td className="px-6 py-4 text-sm">{formatCost(a.cost, a.currency)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(a.expiryDate)}</td>
                    <td className="px-6 py-4 text-sm">{a.assignee ? <Link href={`/employees/${a.assignee.id}`} className="text-blue-600 hover:underline">{a.assignee.name}</Link> : <span className="text-gray-400">{t.license.unassigned}</span>}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.orgUnit?.name || "—"}</td>
                    <td className="px-6 py-4 text-sm"><CiaBadge ciaC={a.ciaC} ciaI={a.ciaI} ciaA={a.ciaA} /></td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => router.push(`/contracts/${a.id}`)} className="rounded p-1 hover:bg-gray-200" title={t.common.detail}><Eye className="h-4 w-4" /></button>
                          <button onClick={() => router.push(`/contracts/${a.id}/edit`)} className="rounded p-1 hover:bg-gray-200" title={t.common.edit}><Edit className="h-4 w-4" /></button>
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
        <div className="mt-4 text-sm text-gray-600">{t.common.total} {total}{t.dashboard.items} {t.contract.title}</div>
      </div>
    </div>
  );
}
