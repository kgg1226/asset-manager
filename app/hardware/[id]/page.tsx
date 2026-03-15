"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, AlertCircle, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import CiaScoreDisplay from "@/app/_components/cia-score-display";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface HardwareDetail {
  assetTag?: string | null; deviceType?: string | null; manufacturer?: string | null;
  model?: string | null; serialNumber?: string | null; hostname?: string | null;
  macAddress?: string | null; ipAddress?: string | null; os?: string | null;
  osVersion?: string | null; location?: string | null; usefulLifeYears: number;
  cpu?: string | null; ram?: string | null; storage?: string | null;
  gpu?: string | null; displaySize?: string | null;
  storageType?: string | null; imei?: string | null; phoneNumber?: string | null;
  portCount?: number | null; connectionType?: string | null; resolution?: string | null;
  // 보증/구매 관리
  warrantyEndDate?: string | null; warrantyProvider?: string | null;
  purchaseOrderNumber?: string | null; invoiceNumber?: string | null;
  condition?: string | null; notes?: string | null;
  // 네트워크/인프라
  secondaryIp?: string | null; subnetMask?: string | null; gateway?: string | null;
  vlanId?: string | null; dnsName?: string | null; firmwareVersion?: string | null;
}

interface Asset {
  id: number; name: string; status: AssetStatus; description?: string | null;
  vendor?: string | null; cost?: number | null; monthlyCost?: number | null;
  currency: string; billingCycle?: string | null; expiryDate?: string | null;
  purchaseDate?: string | null; assignee?: { id: number; name: string } | null;
  orgUnit?: { id: number; name: string } | null; company?: { id: number; name: string } | null;
  hardwareDetail?: HardwareDetail | null; createdAt: string; updatedAt: string;
  ciaC?: number | null; ciaI?: number | null; ciaA?: number | null;
}

interface AssignmentHistoryEntry {
  id: number; action: string; reason?: string | null; createdAt: string;
  employee: { id: number; name: string };
  performedBy?: { id: number; username: string } | null;
}

interface Employee {
  id: number; name: string; department?: string | null; email?: string | null;
}

const STATUS_KEYS: Record<AssetStatus, string> = { IN_STOCK: "statusInStock", IN_USE: "statusInUse", INACTIVE: "statusInactive", UNUSABLE: "statusUnusable", PENDING_DISPOSAL: "statusPendingDisposal", DISPOSED: "statusDisposed" };
const STATUS_COLORS: Record<AssetStatus, string> = { IN_STOCK: "bg-gray-100 text-gray-800", IN_USE: "bg-green-100 text-green-800", INACTIVE: "bg-yellow-100 text-yellow-800", UNUSABLE: "bg-orange-100 text-orange-800", PENDING_DISPOSAL: "bg-red-100 text-red-800", DISPOSED: "bg-gray-800 text-gray-100" };

// IP/MAC은 Server, Network만 표시
const SHOW_NETWORK_FIELDS = new Set(["Server", "Network"]);
// PC사양 필드(cpu/ram/storage)는 Laptop, Desktop, Server, Network에서 표시
const SHOW_SPEC_FIELDS = new Set(["Laptop", "Desktop", "Server", "Network"]);
// GPU는 Laptop, Desktop만
const SHOW_GPU = new Set(["Laptop", "Desktop"]);
// displaySize는 Laptop만
const SHOW_DISPLAY = new Set(["Laptop"]);

export default function HardwareDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === "ADMIN";

  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status change modals
  const [showUnusableModal, setShowUnusableModal] = useState(false);
  const [showDisposedModal, setShowDisposedModal] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Assign/Unassign
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [assignReason, setAssignReason] = useState("");
  const [unassignReason, setUnassignReason] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "">("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Assignment history
  const [assignHistory, setAssignHistory] = useState<AssignmentHistoryEntry[]>([]);

  const loadAsset = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}`);
      if (!res.ok) { toast.error(t.common.noData); router.push("/hardware"); return; }
      const data = await res.json();
      setAsset(data);
    } catch { toast.error(t.toast.saveFail); router.push("/hardware"); }
    finally { setIsLoading(false); }
  }, [assetId, router]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}/assignment-history`);
      if (res.ok) { const data = await res.json(); setAssignHistory(data); }
    } catch { /* ignore */ }
  }, [assetId]);

  useEffect(() => { loadAsset(); loadHistory(); }, [loadAsset, loadHistory]);

  // Load employees for assign modal
  const loadEmployees = async (search: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`/api/employees?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || t.toast.deleteFail); return; }
      toast.success(t.toast.deleteSuccess); router.push("/hardware");
    } catch { toast.error(t.toast.deleteFail); }
    finally { setIsDeleting(false); setShowDeleteModal(false); }
  };

  // 불용 처리 → UNUSABLE → auto PENDING_DISPOSAL
  const handleUnusable = async () => {
    if (!statusReason.trim()) { toast.error(t.common.required); return; }
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "UNUSABLE", reason: statusReason }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || t.toast.updateFail); return; }
      const result = await res.json();
      setAsset((p) => (p ? { ...p, status: result.asset?.status ?? "PENDING_DISPOSAL", assignee: null } : null));
      toast.success(t.toast.updateSuccess);
      setShowUnusableModal(false); setStatusReason("");
      loadHistory();
    } catch { toast.error(t.toast.updateFail); }
    finally { setIsUpdatingStatus(false); }
  };

  // 폐기 완료
  const handleDisposed = async () => {
    if (!statusReason.trim()) { toast.error(t.common.required); return; }
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISPOSED", reason: statusReason }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || t.toast.updateFail); return; }
      setAsset((p) => (p ? { ...p, status: "DISPOSED" } : null));
      toast.success(t.toast.updateSuccess);
      setShowDisposedModal(false); setStatusReason("");
    } catch { toast.error(t.toast.updateFail); }
    finally { setIsUpdatingStatus(false); }
  };

  // 할당
  const handleAssign = async () => {
    if (!selectedEmployeeId) { toast.error(t.common.required); return; }
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmployeeId, reason: assignReason || undefined }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || t.toast.saveFail); return; }
      toast.success(t.toast.saveSuccess);
      setShowAssignModal(false); setAssignReason(""); setSelectedEmployeeId("");
      loadAsset(); loadHistory();
    } catch { toast.error(t.toast.saveFail); }
    finally { setIsAssigning(false); }
  };

  // 회수
  const handleUnassign = async () => {
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unassignReason || undefined }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || t.toast.saveFail); return; }
      toast.success(t.toast.saveSuccess);
      setShowUnassignModal(false); setUnassignReason("");
      loadAsset(); loadHistory();
    } catch { toast.error(t.toast.saveFail); }
    finally { setIsAssigning(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-4xl"><p className="text-center text-gray-600">{t.common.loading}</p></div></div>;
  if (!asset) return <div className="min-h-screen bg-gray-50 p-6"><div className="mx-auto max-w-4xl"><p className="text-center text-red-600">{t.common.noData}</p><div className="mt-4 text-center"><Link href="/hardware" className="text-blue-600 hover:underline">{t.common.list}</Link></div></div></div>;

  const getStatusLabel = (s: AssetStatus) => (t.asset as Record<string, string>)[STATUS_KEYS[s]] ?? s;
  const syms: Record<string, string> = { KRW: "₩", USD: "$", EUR: "€", JPY: "¥", GBP: "£", CNY: "¥" };
  const fmtCost = (v: number | null | undefined) => v != null ? `${syms[asset.currency] ?? asset.currency}${v.toLocaleString()}` : "—";
  const hd = asset.hardwareDetail;
  const deviceType = hd?.deviceType ?? "";

  // Status button visibility
  const canMarkUnusable = isAdmin && ["IN_STOCK", "IN_USE", "INACTIVE"].includes(asset.status);
  const canMarkDisposed = isAdmin && asset.status === "PENDING_DISPOSAL";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/hardware" className="rounded-md p-2 hover:bg-gray-200"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{asset.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.hw.title} &bull; {t.asset.registeredDate}: {new Date(asset.createdAt).toLocaleDateString()}</p>
          </div>
          <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[asset.status]}`}>{getStatusLabel(asset.status)}</span>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">{t.asset.cost}</p><p className="mt-2 text-2xl font-bold">{fmtCost(asset.cost)}</p></div>
          <div className="rounded-lg bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">{t.hw.deviceType}</p><p className="mt-2 text-2xl font-bold text-gray-900">{deviceType || "—"}</p></div>
          <div className="rounded-lg bg-white p-6 shadow-sm"><p className="text-sm text-gray-600">{t.hw.manufacturer} / {t.hw.model}</p><p className="mt-2 text-lg font-bold text-gray-900">{[hd?.manufacturer, hd?.model].filter(Boolean).join(" ") || "—"}</p></div>
        </div>

        {/* 상태 관리 (Admin only) */}
        {isAdmin && (canMarkUnusable || canMarkDisposed) && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{t.common.status}</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{t.common.status}:</span>
              <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[asset.status]}`}>{getStatusLabel(asset.status)}</span>
            </div>
            <div className="mt-4 flex gap-3">
              {canMarkUnusable && (
                <button
                  onClick={() => setShowUnusableModal(true)}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                >
                  {t.hw.markUnusable}
                </button>
              )}
              {canMarkDisposed && (
                <button
                  onClick={() => setShowDisposedModal(true)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  {t.hw.markDisposed}
                </button>
              )}
            </div>
            {canMarkUnusable && (
              <p className="mt-3 text-xs text-gray-500">{t.hw.unusableAutoNote}</p>
            )}
          </div>
        )}

        {/* 할당 정보 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{t.asset.assignee}</h2>
          {asset.assignee ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t.asset.assignee}</p>
                <p className="mt-1 text-gray-900">
                  <Link href={`/employees/${asset.assignee.id}`} className="text-blue-600 hover:underline">{asset.assignee.name}</Link>
                </p>
              </div>
              {isAdmin && !["UNUSABLE", "PENDING_DISPOSAL", "DISPOSED"].includes(asset.status) && (
                <button
                  onClick={() => setShowUnassignModal(true)}
                  className="flex items-center gap-2 rounded-md border border-orange-300 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
                >
                  <UserMinus className="h-4 w-4" />{t.hw.actionRetrieved}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{t.license.unassigned}</p>
              {isAdmin && !["UNUSABLE", "PENDING_DISPOSAL", "DISPOSED"].includes(asset.status) && (
                <button
                  onClick={() => { setShowAssignModal(true); loadEmployees(""); }}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" />{t.hw.actionAssigned}
                </button>
              )}
            </div>
          )}

          {/* Assignment History */}
          {assignHistory.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">{t.hw.assignHistory}</h3>
              <div className="space-y-2">
                {assignHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2">
                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${h.action === "ASSIGNED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {h.action === "ASSIGNED" ? t.hw.actionAssigned : t.hw.actionRetrieved}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-900">{h.employee.name}</span>
                      {h.reason && <span className="ml-2 text-xs text-gray-500">({h.reason})</span>}
                    </div>
                    <time className="shrink-0 text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</time>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 상세 정보 */}
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
              <div><p className="text-sm text-gray-600">{t.asset.purchaseDate}</p><p className="mt-1 text-gray-900">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}</p></div>
            </div>
            <div className="border-t border-gray-200 pt-4"><p className="text-xs text-gray-500">{t.common.createdAt}: {new Date(asset.createdAt).toLocaleString()} &bull; {t.common.updatedAt}: {new Date(asset.updatedAt).toLocaleString()}</p></div>
          </div>
        </div>

        {/* 장비 정보 */}
        {hd && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{t.hw.title}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hd.assetTag && <div><p className="text-sm text-gray-600">{t.hw.assetTag}</p><p className="mt-1 font-mono text-gray-900">{hd.assetTag}</p></div>}
              {hd.deviceType && <div><p className="text-sm text-gray-600">{t.hw.deviceType}</p><p className="mt-1 text-gray-900">{hd.deviceType}</p></div>}
              {hd.manufacturer && <div><p className="text-sm text-gray-600">{t.hw.manufacturer}</p><p className="mt-1 text-gray-900">{hd.manufacturer}</p></div>}
              {hd.model && <div><p className="text-sm text-gray-600">{t.hw.model}</p><p className="mt-1 text-gray-900">{hd.model}</p></div>}
              {hd.serialNumber && <div><p className="text-sm text-gray-600">{t.hw.serialNumber}</p><p className="mt-1 font-mono text-gray-900">{hd.serialNumber}</p></div>}

              {/* PC Spec fields */}
              {SHOW_SPEC_FIELDS.has(deviceType) && hd.cpu && <div><p className="text-sm text-gray-600">CPU</p><p className="mt-1 text-gray-900">{hd.cpu}</p></div>}
              {SHOW_SPEC_FIELDS.has(deviceType) && hd.ram && <div><p className="text-sm text-gray-600">RAM</p><p className="mt-1 text-gray-900">{hd.ram}</p></div>}
              {SHOW_SPEC_FIELDS.has(deviceType) && hd.storage && <div><p className="text-sm text-gray-600">{t.hw.storageCap}</p><p className="mt-1 text-gray-900">{hd.storage}</p></div>}
              {SHOW_GPU.has(deviceType) && hd.gpu && <div><p className="text-sm text-gray-600">GPU</p><p className="mt-1 text-gray-900">{hd.gpu}</p></div>}
              {SHOW_DISPLAY.has(deviceType) && hd.displaySize && <div><p className="text-sm text-gray-600">{t.hw.displaySize}</p><p className="mt-1 text-gray-900">{hd.displaySize}</p></div>}

              {hd.hostname && <div><p className="text-sm text-gray-600">{t.hw.hostname}</p><p className="mt-1 font-mono text-gray-900">{hd.hostname}</p></div>}

              {/* IP/MAC - Server, Network only */}
              {SHOW_NETWORK_FIELDS.has(deviceType) && hd.ipAddress && <div><p className="text-sm text-gray-600">{t.hw.ipAddress}</p><p className="mt-1 font-mono text-gray-900">{hd.ipAddress}</p></div>}
              {SHOW_NETWORK_FIELDS.has(deviceType) && hd.macAddress && <div><p className="text-sm text-gray-600">{t.hw.macAddress}</p><p className="mt-1 font-mono text-gray-900">{hd.macAddress}</p></div>}

              {hd.os && <div><p className="text-sm text-gray-600">{t.hw.os}</p><p className="mt-1 text-gray-900">{hd.os}{hd.osVersion && ` ${hd.osVersion}`}</p></div>}
              {hd.cpu && <div><p className="text-sm text-gray-600">CPU</p><p className="mt-1 text-gray-900">{hd.cpu}</p></div>}
              {hd.ram != null && <div><p className="text-sm text-gray-600">RAM</p><p className="mt-1 text-gray-900">{hd.ram} GB</p></div>}
              {hd.storage != null && <div><p className="text-sm text-gray-600">{t.hw.storageCap}</p><p className="mt-1 text-gray-900">{hd.storage} GB{hd.storageType && ` (${hd.storageType})`}</p></div>}
              {hd.imei && <div><p className="text-sm text-gray-600">IMEI</p><p className="mt-1 font-mono text-gray-900">{hd.imei}</p></div>}
              {hd.phoneNumber && <div><p className="text-sm text-gray-600">{t.hw.phoneNumber}</p><p className="mt-1 text-gray-900">{hd.phoneNumber}</p></div>}
              {hd.portCount != null && <div><p className="text-sm text-gray-600">{t.hw.portCount}</p><p className="mt-1 text-gray-900">{hd.portCount}</p></div>}
              {hd.connectionType && <div><p className="text-sm text-gray-600">{t.hw.connectionType}</p><p className="mt-1 text-gray-900">{hd.connectionType}</p></div>}
              {hd.resolution && <div><p className="text-sm text-gray-600">{t.hw.resolution}</p><p className="mt-1 text-gray-900">{hd.resolution}</p></div>}
              {hd.location && <div><p className="text-sm text-gray-600">{t.hw.location}</p><p className="mt-1 text-gray-900">{hd.location}</p></div>}
              {hd.condition && <div><p className="text-sm text-gray-600">{t.hw.conditionGrade}</p><p className="mt-1"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${hd.condition === "A" ? "bg-green-100 text-green-700" : hd.condition === "B" ? "bg-blue-100 text-blue-700" : hd.condition === "C" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{hd.condition}</span></p></div>}
            </div>

            {/* 보증/구매 관리 */}
            {(hd.warrantyEndDate || hd.warrantyProvider || hd.purchaseOrderNumber || hd.invoiceNumber || hd.notes) && (
              <>
                <h3 className="mt-6 mb-3 text-sm font-semibold text-gray-700 border-t pt-4">{t.hw.warrantyPurchase}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {hd.warrantyEndDate && <div><p className="text-sm text-gray-600">{t.hw.warrantyExpiry}</p><p className={`mt-1 ${new Date(hd.warrantyEndDate) < new Date() ? "font-semibold text-red-600" : "text-gray-900"}`}>{new Date(hd.warrantyEndDate).toLocaleDateString()}{new Date(hd.warrantyEndDate) < new Date() && ` (${t.asset.statusExpired})`}</p></div>}
                  {hd.warrantyProvider && <div><p className="text-sm text-gray-600">{t.hw.warrantyProvider}</p><p className="mt-1 text-gray-900">{hd.warrantyProvider}</p></div>}
                  {hd.purchaseOrderNumber && <div><p className="text-sm text-gray-600">{t.hw.poNumber}</p><p className="mt-1 font-mono text-gray-900">{hd.purchaseOrderNumber}</p></div>}
                  {hd.invoiceNumber && <div><p className="text-sm text-gray-600">{t.hw.invoiceNumber}</p><p className="mt-1 font-mono text-gray-900">{hd.invoiceNumber}</p></div>}
                </div>
                {hd.notes && <div className="mt-3"><p className="text-sm text-gray-600">{t.hw.notes}</p><p className="mt-1 whitespace-pre-wrap text-gray-900">{hd.notes}</p></div>}
              </>
            )}

            {/* 네트워크/인프라 */}
            {(hd.secondaryIp || hd.subnetMask || hd.gateway || hd.vlanId || hd.dnsName || hd.portCount || hd.firmwareVersion) && (
              <>
                <h3 className="mt-6 mb-3 text-sm font-semibold text-gray-700 border-t pt-4">{t.hw.networkInfra}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {hd.secondaryIp && <div><p className="text-sm text-gray-600">{t.hw.secondaryIp}</p><p className="mt-1 font-mono text-gray-900">{hd.secondaryIp}</p></div>}
                  {hd.subnetMask && <div><p className="text-sm text-gray-600">{t.hw.subnetMask}</p><p className="mt-1 font-mono text-gray-900">{hd.subnetMask}</p></div>}
                  {hd.gateway && <div><p className="text-sm text-gray-600">{t.hw.gateway}</p><p className="mt-1 font-mono text-gray-900">{hd.gateway}</p></div>}
                  {hd.vlanId && <div><p className="text-sm text-gray-600">{t.hw.vlanId}</p><p className="mt-1 font-mono text-gray-900">{hd.vlanId}</p></div>}
                  {hd.dnsName && <div><p className="text-sm text-gray-600">{t.hw.dnsHostname}</p><p className="mt-1 font-mono text-gray-900">{hd.dnsName}</p></div>}
                  {hd.portCount != null && <div><p className="text-sm text-gray-600">{t.hw.portCount}</p><p className="mt-1 text-gray-900">{hd.portCount}</p></div>}
                  {hd.firmwareVersion && <div><p className="text-sm text-gray-600">{t.hw.firmwareVersion}</p><p className="mt-1 font-mono text-gray-900">{hd.firmwareVersion}</p></div>}
                </div>
              </>
            )}
          </div>
        )}

        {/* 보안 등급 (CIA) */}
        <CiaScoreDisplay ciaC={asset.ciaC as 1 | 2 | 3 | null ?? null} ciaI={asset.ciaI as 1 | 2 | 3 | null ?? null} ciaA={asset.ciaA as 1 | 2 | 3 | null ?? null} />

        {/* 감가상각 */}
        {asset.cost != null && asset.cost > 0 && asset.purchaseDate && (() => {
          const purchaseCost = Number(asset.cost);
          const usefulLife = hd?.usefulLifeYears ?? 5;
          const annualDep = Math.floor(purchaseCost / usefulLife);
          const monthlyDep = Math.floor(annualDep / 12);
          const elapsedMs = Date.now() - new Date(asset.purchaseDate!).getTime();
          const elapsedYears = elapsedMs / (365.25 * 24 * 60 * 60 * 1000);
          const accumulated = Math.min(purchaseCost, Math.floor(annualDep * elapsedYears));
          const residual = Math.max(0, purchaseCost - accumulated);
          const pct = Math.min(100, (accumulated / purchaseCost) * 100);
          const elapsedMonths = elapsedYears * 12;
          return (
            <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">{t.hw.depreciation}</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div><p className="text-sm text-gray-600">{t.hw.acquisitionCost}</p><p className="mt-1 text-lg font-semibold text-gray-900">{syms[asset.currency] ?? asset.currency}{purchaseCost.toLocaleString()}</p></div>
                <div><p className="text-sm text-gray-600">{t.hw.usefulLife}</p><p className="mt-1 text-lg font-semibold text-gray-900">{usefulLife}{t.hw.years}</p></div>
                <div><p className="text-sm text-gray-600">{t.hw.annualDepreciation}</p><p className="mt-1 text-lg font-semibold text-gray-900">{syms[asset.currency] ?? asset.currency}{annualDep.toLocaleString()}</p></div>
                <div><p className="text-sm text-gray-600">{t.hw.monthlyDepreciation}</p><p className="mt-1 text-lg font-semibold text-gray-900">{syms[asset.currency] ?? asset.currency}{monthlyDep.toLocaleString()}</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-600">{t.hw.accumulatedDepreciation}</p><p className="mt-1 text-lg font-semibold text-red-600">-{syms[asset.currency] ?? asset.currency}{accumulated.toLocaleString()}</p></div>
                <div><p className="text-sm text-gray-600">{t.hw.residualValue}</p><p className="mt-1 text-lg font-semibold text-blue-600">{syms[asset.currency] ?? asset.currency}{residual.toLocaleString()}</p></div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{t.hw.elapsed}: {Math.floor(elapsedMonths / 12)}{t.hw.years} {Math.round(elapsedMonths % 12)}{t.hw.months}</span>
                  <span>{pct.toFixed(1)}% {t.hw.depreciationPct}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-red-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Action Buttons (Admin) */}
        {isAdmin && asset.status !== "DISPOSED" && (
          <div className="flex gap-3">
            <Link href={`/hardware/${asset.id}/edit`} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Edit className="h-4 w-4" />{t.common.edit}</Link>
            <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />{t.common.delete}</button>
          </div>
        )}

        {/* 불용 처리 모달 */}
        {showUnusableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-bold">{t.hw.markUnusable}</h2>
              </div>
              <p className="mb-2 text-sm text-gray-600">{t.hw.unusableConfirm}</p>
              <p className="mb-4 rounded-md bg-orange-50 p-3 text-xs text-orange-700">{t.hw.unusableWarning}</p>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">{t.common.reason} <span className="text-red-500">*</span></label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder={t.hw.reasonPlaceholderUnusable}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleUnusable} disabled={isUpdatingStatus || !statusReason.trim()} className="flex-1 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">{isUpdatingStatus ? t.common.processing : t.hw.markUnusable}</button>
                <button onClick={() => { setShowUnusableModal(false); setStatusReason(""); }} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              </div>
            </div>
          </div>
        )}

        {/* 폐기 완료 모달 */}
        {showDisposedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-bold">{t.hw.markDisposed}</h2>
              </div>
              <p className="mb-2 text-sm text-gray-600">{t.hw.disposedConfirm}</p>
              <p className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-700"><strong>{t.hw.disposedWarning}</strong></p>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">{t.common.reason} <span className="text-red-500">*</span></label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder={t.hw.reasonPlaceholderDisposed}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleDisposed} disabled={isUpdatingStatus || !statusReason.trim()} className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{isUpdatingStatus ? t.common.processing : t.hw.markDisposed}</button>
                <button onClick={() => { setShowDisposedModal(false); setStatusReason(""); }} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              </div>
            </div>
          </div>
        )}

        {/* 할당 모달 */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold">{t.hw.assignAsset}</h2>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">{t.hw.searchEmployee}</label>
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => { setEmployeeSearch(e.target.value); loadEmployees(e.target.value); }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder={t.hw.searchByName}
                />
              </div>
              <div className="mb-4 max-h-48 overflow-y-auto rounded-md border border-gray-200">
                {employees.length === 0 ? (
                  <p className="p-3 text-center text-sm text-gray-500">{t.hw.noEmployees}</p>
                ) : (
                  employees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${selectedEmployeeId === emp.id ? "bg-blue-100 font-medium text-blue-700" : "text-gray-700"}`}
                    >
                      {emp.name}{emp.department ? ` (${emp.department})` : ""}{emp.email ? ` — ${emp.email}` : ""}
                    </button>
                  ))
                )}
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">{t.common.reasonOptional}</label>
                <input
                  type="text"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder={t.hw.assignPlaceholder}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleAssign} disabled={isAssigning || !selectedEmployeeId} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{isAssigning ? t.common.assigning : t.hw.actionAssigned}</button>
                <button onClick={() => { setShowAssignModal(false); setSelectedEmployeeId(""); setEmployeeSearch(""); setAssignReason(""); }} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              </div>
            </div>
          </div>
        )}

        {/* 회수 모달 */}
        {showUnassignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold">{t.hw.unassignAsset}</h2>
              <p className="mb-4 text-sm text-gray-600">&quot;{asset.assignee?.name}&quot; {t.hw.unassignDesc}</p>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">{t.common.reasonOptional}</label>
                <input
                  type="text"
                  value={unassignReason}
                  onChange={(e) => setUnassignReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder={t.hw.unassignPlaceholder}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleUnassign} disabled={isAssigning} className="flex-1 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">{isAssigning ? t.common.retrieving : t.hw.actionRetrieved}</button>
                <button onClick={() => { setShowUnassignModal(false); setUnassignReason(""); }} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              </div>
            </div>
          </div>
        )}

        {/* 삭제 모달 */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" /><h2 className="text-lg font-bold">{t.hw.deleteConfirmTitle}</h2></div>
              <p className="mb-6 text-sm text-gray-600">&quot;{asset.name}&quot; {t.hw.deleteConfirmMessage}</p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={isDeleting} className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{isDeleting ? t.common.deleting : t.common.delete}</button>
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t.common.cancel}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
