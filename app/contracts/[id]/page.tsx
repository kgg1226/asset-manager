"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import CiaScoreDisplay from "@/app/_components/cia-score-display";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface Asset {
  id: number; name: string; status: AssetStatus; description?: string | null;
  vendor?: string | null; cost?: number | null; monthlyCost?: number | null;
  currency: string; billingCycle?: string | null; expiryDate?: string | null;
  purchaseDate?: string | null; assignee?: { id: number; name: string } | null;
  orgUnit?: { id: number; name: string } | null; company?: { id: number; name: string } | null;
  contractDetail?: { contractNumber?: string | null; counterparty?: string | null; contractType?: string | null; autoRenew?: boolean } | null;
  ciaC?: number | null; ciaI?: number | null; ciaA?: number | null;
  createdAt: string; updatedAt: string;
}

const STATUS_KEYS: Record<AssetStatus, string> = { IN_STOCK: "statusInStock", IN_USE: "statusInUse", INACTIVE: "statusInactive", UNUSABLE: "statusUnusable", PENDING_DISPOSAL: "statusPendingDisposal", DISPOSED: "statusDisposed" };
const STATUS_COLORS: Record<AssetStatus, string> = { IN_STOCK: "bg-blue-100 text-blue-800", IN_USE: "bg-green-100 text-green-800", INACTIVE: "bg-gray-100 text-gray-800", UNUSABLE: "bg-yellow-100 text-yellow-800", PENDING_DISPOSAL: "bg-orange-100 text-orange-800", DISPOSED: "bg-red-100 text-red-800" };

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user } = useAuth();
  const { t } = useTranslation();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<AssetStatus>("IN_USE");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/assets/${assetId}`);
        if (!res.ok) { toast.error(t.common.noData); router.push("/contracts"); return; }
        const data = await res.json();
        setAsset(data);
        setNewStatus(data.status);
      } catch { toast.error(t.common.error); router.push("/contracts"); }
      finally { setIsLoading(false); }
    })();
  }, [assetId, router]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || t.toast.deleteFail); return; }
      toast.success(t.toast.deleteSuccess);
      router.push("/contracts");
    } catch { toast.error(t.toast.deleteFail); }
    finally { setIsDeleting(false); setShowDeleteModal(false); }
  };

  const handleStatusChange = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || t.toast.updateFail); return; }
      setAsset((p) => (p ? { ...p, status: newStatus } : null));
      toast.success(t.toast.updateSuccess);
      setShowStatusModal(false);
    } catch { toast.error(t.toast.updateFail); }
    finally { setIsUpdatingStatus(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-4xl"><p className="text-center text-gray-600">{t.common.loading}</p></div></div>;
  if (!asset) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-4xl"><p className="text-center text-red-600">{t.common.noData}</p><div className="mt-4 text-center"><Link href="/contracts" className="text-blue-600 hover:underline">{t.common.list}</Link></div></div></div>;

  const getStatusLabel = (s: AssetStatus) => (t.asset as Record<string, string>)[STATUS_KEYS[s]] ?? s;
  const syms: Record<string, string> = { KRW: "₩", USD: "$", EUR: "€", JPY: "¥", GBP: "£", CNY: "¥" };
  const fmtCost = (v: number | null | undefined) => v != null ? `${syms[asset.currency] ?? asset.currency}${v.toLocaleString()}` : "—";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/contracts" className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.contract.title} &bull; {t.asset.purchaseDate}: {new Date(asset.createdAt).toLocaleDateString()}</p>
          </div>
          <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[asset.status]}`}>{getStatusLabel(asset.status)}</span>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">{t.asset.cost}</p>
            <p className="mt-2 text-2xl font-bold">{fmtCost(asset.cost)}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">{t.contract.counterparty}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{asset.contractDetail?.counterparty || asset.vendor || "—"}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">{t.asset.expiryDate}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{asset.expiryDate ? new Date(asset.expiryDate).toLocaleDateString() : "—"}</p>
          </div>
        </div>

        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{t.common.detail}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><p className="text-sm text-gray-600">{t.asset.assetName}</p><p className="mt-1 text-gray-900">{asset.name}</p></div>
              <div><p className="text-sm text-gray-600">{t.asset.vendor}</p><p className="mt-1 text-gray-900">{asset.vendor || "—"}</p></div>
            </div>
            {asset.description && <div><p className="text-sm text-gray-600">{t.common.description}</p><p className="mt-1 text-gray-900">{asset.description}</p></div>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><p className="text-sm text-gray-600">{t.asset.cost}</p><p className="mt-1 text-gray-900">{fmtCost(asset.cost)}</p></div>
              <div><p className="text-sm text-gray-600">{t.license.monthly} {t.asset.cost}</p><p className="mt-1 text-gray-900">{fmtCost(asset.monthlyCost)}</p></div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {asset.purchaseDate && <div><p className="text-sm text-gray-600">{t.asset.purchaseDate}</p><p className="mt-1 text-gray-900">{new Date(asset.purchaseDate).toLocaleDateString()}</p></div>}
              {asset.expiryDate && <div><p className="text-sm text-gray-600">{t.asset.expiryDate}</p><p className="mt-1 text-gray-900">{new Date(asset.expiryDate).toLocaleDateString()}</p></div>}
            </div>
            {asset.assignee && <div><p className="text-sm text-gray-600">{t.asset.assignee}</p><p className="mt-1"><Link href={`/employees/${asset.assignee.id}`} className="text-blue-600 hover:underline">{asset.assignee.name}</Link></p></div>}
            <div className="border-t border-gray-200 pt-4"><p className="text-xs text-gray-500">{t.common.createdAt}: {new Date(asset.createdAt).toLocaleString()} &bull; {t.common.updatedAt}: {new Date(asset.updatedAt).toLocaleString()}</p></div>
          </div>
        </div>

        {asset.contractDetail && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{t.contract.title} {t.common.detail}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {asset.contractDetail.contractNumber && <div><p className="text-sm text-gray-600">{t.contract.title} #</p><p className="mt-1 font-mono text-gray-900">{asset.contractDetail.contractNumber}</p></div>}
              {asset.contractDetail.counterparty && <div><p className="text-sm text-gray-600">{t.contract.counterparty}</p><p className="mt-1 text-gray-900">{asset.contractDetail.counterparty}</p></div>}
              {asset.contractDetail.contractType && <div><p className="text-sm text-gray-600">{t.contract.contractType}</p><p className="mt-1 text-gray-900">{asset.contractDetail.contractType}</p></div>}
              <div><p className="text-sm text-gray-600">{t.contract.autoRenewal}</p><p className="mt-1 text-gray-900">{asset.contractDetail.autoRenew ? t.common.yes : t.common.no}</p></div>
            </div>
          </div>
        )}

        <CiaScoreDisplay ciaC={asset.ciaC as 1 | 2 | 3 | null} ciaI={asset.ciaI as 1 | 2 | 3 | null} ciaA={asset.ciaA as 1 | 2 | 3 | null} />

        {user && (
          <div className="flex gap-3">
            <Link href={`/contracts/${asset.id}/edit`} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Edit className="h-4 w-4" />{t.common.edit}</Link>
            <button onClick={() => setShowStatusModal(true)} className="flex-1 rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">{t.common.status}</button>
            <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />{t.common.delete}</button>
          </div>
        )}

        {showStatusModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold">{t.common.status}</h2>
              <div className="mb-6 space-y-2">
                {(Object.keys(STATUS_KEYS) as AssetStatus[]).map((s) => (
                  <label key={s} className="flex items-center gap-2"><input type="radio" name="status" value={s} checked={newStatus === s} onChange={(e) => setNewStatus(e.target.value as AssetStatus)} className="h-4 w-4" /><span className="text-sm text-gray-700">{getStatusLabel(s)}</span></label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleStatusChange} disabled={isUpdatingStatus || newStatus === asset.status} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{t.common.confirm}</button>
                <button onClick={() => setShowStatusModal(false)} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" /><h2 className="text-lg font-bold">{t.toast.confirmDelete}</h2></div>
              <p className="mb-6 text-sm text-gray-600">&quot;{asset.name}&quot;</p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={isDeleting} className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{isDeleting ? t.common.loading : t.common.delete}</button>
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
