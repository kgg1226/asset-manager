"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Edit, Trash2, RefreshCw, ChevronUp, ChevronDown, Keyboard, FileDown, Tag, Printer, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import CiaBadge from "@/app/_components/cia-badge";
import { TourGuide } from "@/app/_components/tour-guide";
import { HARDWARE_TOUR_KEY, getHardwareSteps } from "@/app/_components/tours/hardware-tour";
import { LifecycleGaugeInline } from "@/app/_components/lifecycle-gauge";
import HwAssignButton from "./hw-assign-button";
import HwUnassignButton from "./hw-unassign-button";

type AssetStatus = "IN_STOCK" | "IN_USE" | "INACTIVE" | "UNUSABLE" | "PENDING_DISPOSAL" | "DISPOSED";

interface Asset {
  id: number; name: string; status: AssetStatus; cost?: number | null; currency: string;
  purchaseDate?: string | null; expiryDate?: string | null;
  ciaC?: number | null; ciaI?: number | null; ciaA?: number | null;
  assignee?: { id: number; name: string } | null;
  hardwareDetail?: { assetTag?: string | null; deviceType?: string | null; manufacturer?: string | null; model?: string | null; condition?: string | null; usefulLifeYears?: number | null } | null;
}

const STATUS_KEYS: Record<AssetStatus, string> = { IN_STOCK: "statusInStock", IN_USE: "statusInUse", INACTIVE: "statusInactive", UNUSABLE: "statusUnusable", PENDING_DISPOSAL: "statusPendingDisposal", DISPOSED: "statusDisposed" };
const STATUS_COLORS: Record<AssetStatus, string> = { IN_STOCK: "bg-gray-100 text-gray-800", IN_USE: "bg-green-100 text-green-800", INACTIVE: "bg-yellow-100 text-yellow-800", UNUSABLE: "bg-orange-100 text-orange-800", PENDING_DISPOSAL: "bg-red-100 text-red-800", DISPOSED: "bg-gray-800 text-gray-100" };

type SortField = "assetTag" | "name" | "deviceType" | "manufacturer" | "status" | "cost" | "assignee" | "purchaseDate";
type SortOrder = "asc" | "desc";

function formatCost(cost: number | null | undefined, currency: string): string {
  if (cost == null) return "—";
  const symbols: Record<string, string> = { KRW: "₩", USD: "$", EUR: "€", JPY: "¥", GBP: "£", CNY: "¥" };
  const sym = symbols[currency] ?? currency;
  return `${sym}${cost.toLocaleString()}`;
}

const STATUS_ORDER: Record<AssetStatus, number> = { IN_STOCK: 0, IN_USE: 1, INACTIVE: 2, UNUSABLE: 3, PENDING_DISPOSAL: 4, DISPOSED: 5 };

function sortAssets(assets: Asset[], field: SortField | null, order: SortOrder): Asset[] {
  if (!field) return assets;
  return [...assets].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "assetTag": {
        const at = a.hardwareDetail?.assetTag ?? "";
        const bt = b.hardwareDetail?.assetTag ?? "";
        cmp = at.localeCompare(bt, "ko");
        break;
      }
      case "name": cmp = a.name.localeCompare(b.name, "ko"); break;
      case "deviceType": {
        const av = a.hardwareDetail?.deviceType ?? "";
        const bv = b.hardwareDetail?.deviceType ?? "";
        cmp = av.localeCompare(bv, "ko");
        break;
      }
      case "manufacturer": {
        const av = [a.hardwareDetail?.manufacturer, a.hardwareDetail?.model].filter(Boolean).join(" ");
        const bv = [b.hardwareDetail?.manufacturer, b.hardwareDetail?.model].filter(Boolean).join(" ");
        cmp = av.localeCompare(bv, "ko");
        break;
      }
      case "status": cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
      case "cost": {
        const av = a.cost ?? -Infinity;
        const bv = b.cost ?? -Infinity;
        cmp = av - bv;
        break;
      }
      case "assignee": {
        const av = a.assignee?.name ?? "\uffff";
        const bv = b.assignee?.name ?? "\uffff";
        cmp = av.localeCompare(bv, "ko");
        break;
      }
      case "purchaseDate": {
        const av = a.purchaseDate ?? "";
        const bv = b.purchaseDate ?? "";
        cmp = av.localeCompare(bv);
        break;
      }
    }
    return order === "desc" ? -cmp : cmp;
  });
}

export default function HardwareListPage() {
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showShortcutHint, setShowShortcutHint] = useState(false);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [bulkTagDraft, setBulkTagDraft] = useState<Record<number, string>>({});
  const [bulkTagSaving, setBulkTagSaving] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showExpiryBanner, setShowExpiryBanner] = useState(true);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<AssetStatus>("IN_STOCK");
  const [bulkStatusSaving, setBulkStatusSaving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === sortedAssets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedAssets.map(a => a.id)));
  };
  const openBulkTagModal = () => {
    const draft: Record<number, string> = {};
    for (const id of selectedIds) {
      const asset = sortedAssets.find((a) => a.id === id);
      draft[id] = asset?.hardwareDetail?.assetTag ?? "";
    }
    setBulkTagDraft(draft);
    setShowBulkTagModal(true);
  };

  const handleBulkTagSave = async () => {
    setBulkTagSaving(true);
    try {
      const entries = Object.entries(bulkTagDraft).map(([id, assetTag]) => ({ id: Number(id), assetTag }));
      const res = await fetch("/api/assets/bulk-tag", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.updated}개 태그 수정 완료`);
        setShowBulkTagModal(false);
        setSelectedIds(new Set());
        await loadAssets();
      } else {
        const err = await res.json().catch(() => ({ error: "수정 실패" }));
        toast.error(err.error || "태그 수정에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류로 수정에 실패했습니다.");
    }
    setBulkTagSaving(false);
  };

  const handleBulkStatusSave = async () => {
    setBulkStatusSaving(true);
    try {
      const res = await fetch("/api/assets/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status: bulkStatusTarget }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.updated}개 상태 변경 완료`);
        setShowBulkStatusModal(false);
        setSelectedIds(new Set());
        await loadAssets();
      } else {
        const err = await res.json().catch(() => ({ error: "변경 실패" }));
        toast.error(err.error || "상태 변경에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류로 변경에 실패했습니다.");
    }
    setBulkStatusSaving(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}개 자산을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/assets/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.deleted}개 삭제 완료${data.notFound > 0 ? ` (${data.notFound}개 미발견)` : ""}`);
      } else {
        const err = await res.json().catch(() => ({ error: "삭제 실패" }));
        toast.error(err.error || "삭제에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류로 삭제에 실패했습니다.");
    }
    setSelectedIds(new Set());
    setBulkDeleting(false);
    await loadAssets();
  };

  // Sorting state from URL
  const [sortField, setSortField] = useState<SortField | null>((searchParams.get("sort") as SortField) || null);
  const [sortOrder, setSortOrder] = useState<SortOrder>((searchParams.get("order") as SortOrder) || "asc");

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", "HARDWARE");
      if (searchQuery) params.set("search", searchQuery);
      if (selectedStatus) params.set("status", selectedStatus);
      params.set("limit", "100");
      const res = await fetch(`/api/assets?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssets(data.assets ?? []); setTotal(data.total ?? 0);
    } catch { toast.error(t.toast.saveFail); }
    finally { setIsLoading(false); }
  }, [searchQuery, selectedStatus]);

  useEffect(() => { const t = setTimeout(() => loadAssets(), 300); return () => clearTimeout(t); }, [loadAssets]);

  // ── 키보드 단축키 ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 입력 필드 포커스 시 무시
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // N — 신규 자산 등록 (ADMIN 전용)
      if (e.key === "n" || e.key === "N") {
        if (isAdmin) router.push("/hardware/new");
      }

      // E — 첫 번째 선택 항목 편집 (ADMIN 전용)
      if ((e.key === "e" || e.key === "E") && isAdmin) {
        const firstSelected = Array.from(selectedIds)[0];
        if (firstSelected) router.push(`/hardware/${firstSelected}/edit`);
      }

      // Esc — 선택 해제
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setShowShortcutHint(false);
      }

      // / — 검색 포커스
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // ? — 단축키 힌트 토글
      if (e.key === "?") {
        setShowShortcutHint((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAdmin, selectedIds, router]);

  // Update URL when sort changes
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
    if (newField) {
      url.searchParams.set("sort", newField);
      url.searchParams.set("order", newOrder);
    } else {
      url.searchParams.delete("sort");
      url.searchParams.delete("order");
    }
    window.history.replaceState(null, "", url.toString());
  };

  const sortedAssets = useMemo(() => sortAssets(assets, sortField, sortOrder), [assets, sortField, sortOrder]);

  const depreciationSummary = useMemo(() => {
    const now = Date.now();
    let totalCost = 0, totalBookValue = 0, fullyDepreciated = 0, overHalf = 0, underHalf = 0, noData = 0;
    for (const a of assets) {
      if (!a.cost || !a.purchaseDate) { noData++; continue; }
      const cost = a.cost;
      const lifeMo = (a.hardwareDetail?.usefulLifeYears ?? 5) * 12;
      const elapsedMo = Math.max(0, (now - new Date(a.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      const depr = Math.min(cost, (cost / lifeMo) * elapsedMo);
      const bv = Math.max(0, cost - depr);
      const pct = cost > 0 ? depr / cost : 0;
      totalCost += cost;
      totalBookValue += bv;
      if (pct >= 1) fullyDepreciated++;
      else if (pct >= 0.5) overHalf++;
      else underHalf++;
    }
    return { totalCost: Math.round(totalCost), totalBookValue: Math.round(totalBookValue), fullyDepreciated, overHalf, underHalf, noData };
  }, [assets]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300">⇅</span>;
    return sortOrder === "asc" ? <ChevronUp className="ml-0.5 inline h-3 w-3 text-blue-600" /> : <ChevronDown className="ml-0.5 inline h-3 w-3 text-blue-600" />;
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`${t.toast.confirmDelete}`)) return;
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
          <h1 className="text-3xl font-bold text-gray-900">{t.hw.title}</h1>
          <div className="flex gap-2">
            <TourGuide tourKey={HARDWARE_TOUR_KEY} steps={getHardwareSteps(t)} />
            {/* 단축키 힌트 */}
            <div className="relative">
              <button
                onClick={() => setShowShortcutHint((v) => !v)}
                className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-500 hover:bg-gray-50"
                title="키보드 단축키 (? 키)"
              >
                <Keyboard className="h-4 w-4" />
              </button>
              {showShortcutHint && (
                <div className="absolute right-0 top-full z-10 mt-1 w-52 rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-800 mb-2">키보드 단축키</p>
                  {isAdmin && <p><kbd className="rounded border border-gray-300 bg-gray-100 px-1">N</kbd> — 신규 자산 등록</p>}
                  {isAdmin && <p><kbd className="rounded border border-gray-300 bg-gray-100 px-1">E</kbd> — 선택 항목 편집</p>}
                  <p><kbd className="rounded border border-gray-300 bg-gray-100 px-1">Esc</kbd> — 선택 해제</p>
                  <p><kbd className="rounded border border-gray-300 bg-gray-100 px-1">/</kbd> — 검색 포커스</p>
                  <p><kbd className="rounded border border-gray-300 bg-gray-100 px-1">?</kbd> — 이 도움말</p>
                </div>
              )}
            </div>
            <button onClick={loadAssets} disabled={isLoading} className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            {isAdmin && (
              <a href="/api/export/all?type=HARDWARE&format=xlsx" className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" title="Excel 내보내기">
                <FileDown className="h-4 w-4" />
                Excel
              </a>
            )}
            {isAdmin && (
              <Link href="/hardware/new" data-tour="hw-new-btn" className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />{t.hw.newHardware}
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-4" data-tour="hw-search">
            <input ref={searchInputRef} type="text" placeholder={`${t.asset.assetName} ${t.common.search}... (/ 단축키)`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2" data-tour="hw-status-filter">
            <button onClick={() => setSelectedStatus("")} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === "" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>{t.common.all} {t.common.status}</button>
            {(Object.keys(STATUS_KEYS) as AssetStatus[]).map((s) => (
              <button key={s} onClick={() => setSelectedStatus(s)} className={`rounded-full px-3 py-1 text-sm ${selectedStatus === s ? "bg-blue-600 text-white" : "bg-gray-100"}`}>{getStatusLabel(s)}</button>
            ))}
          </div>
        </div>

        {/* 일괄 작업 바 */}
        {isAdmin && selectedIds.size > 0 && (
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
            <span className="text-sm font-medium text-blue-700">{selectedIds.size}개 선택</span>
            <button
              onClick={openBulkTagModal}
              className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Tag className="h-3.5 w-3.5" />태그 일괄 편집
            </button>
            <button
              onClick={() => setShowBulkStatusModal(true)}
              className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              상태 일괄 변경
            </button>
            <button
              onClick={() => window.open(`/hardware/print-labels?ids=${[...selectedIds].join(",")}`, "_blank")}
              className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-3.5 w-3.5" />라벨 인쇄
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {bulkDeleting ? "삭제 중..." : "선택 삭제"}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700">선택 해제</button>
          </div>
        )}

        {/* 태그 일괄 편집 모달 */}
        {showBulkTagModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-600" />
                  <h2 className="text-base font-semibold text-gray-900">자산 태그 일괄 편집</h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{selectedIds.size}개</span>
                </div>
                <button onClick={() => setShowBulkTagModal(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">✕</button>
              </div>
              <div className="max-h-80 overflow-y-auto px-6 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs font-medium text-gray-500">자산명</th>
                      <th className="pb-2 text-left text-xs font-medium text-gray-500">자산 태그</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...selectedIds].map((id) => {
                      const asset = sortedAssets.find((a) => a.id === id);
                      return (
                        <tr key={id}>
                          <td className="py-2 pr-3 text-gray-700 max-w-[180px] truncate">{asset?.name ?? `#${id}`}</td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={bulkTagDraft[id] ?? ""}
                              onChange={(e) => setBulkTagDraft((prev) => ({ ...prev, [id]: e.target.value }))}
                              placeholder="태그 없음"
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
                <button onClick={() => setShowBulkTagModal(false)} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">취소</button>
                <button
                  onClick={handleBulkTagSave}
                  disabled={bulkTagSaving}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {bulkTagSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 감가상각 현황 요약 */}
        {!isLoading && assets.length > 0 && depreciationSummary.totalCost > 0 && (
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">감가상각 현황</p>
              <p className="text-xs text-gray-400">취득가 기준 5년 정액법</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium">총 취득원가</p>
                <p className="text-base font-bold text-gray-900">₩{depreciationSummary.totalCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium">현재 장부가</p>
                <p className="text-base font-bold text-blue-600">₩{depreciationSummary.totalBookValue.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">
                  {depreciationSummary.totalCost > 0 ? Math.round((depreciationSummary.totalBookValue / depreciationSummary.totalCost) * 100) : 0}% 잔존
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium">누적 감가상각</p>
                <p className="text-base font-bold text-amber-600">₩{(depreciationSummary.totalCost - depreciationSummary.totalBookValue).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium">상태별 건수</p>
                <div className="flex gap-2 text-xs mt-0.5">
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">{depreciationSummary.underHalf}건 양호</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">{depreciationSummary.overHalf}건 50%↑</span>
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">{depreciationSummary.fullyDepreciated}건 완료</span>
                </div>
              </div>
            </div>
            {/* Depreciation bar */}
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.round((depreciationSummary.totalBookValue / depreciationSummary.totalCost) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-gray-400 text-right">장부가 비율</p>
            </div>
          </div>
        )}

        {/* 상태 일괄 변경 모달 */}
        {showBulkStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-80 rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">상태 일괄 변경</h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{selectedIds.size}개</span>
                </div>
                <button onClick={() => setShowBulkStatusModal(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">✕</button>
              </div>
              <div className="px-6 py-4">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">변경할 상태</label>
                <select
                  value={bulkStatusTarget}
                  onChange={(e) => setBulkStatusTarget(e.target.value as AssetStatus)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(Object.keys(STATUS_KEYS) as AssetStatus[]).map((s) => (
                    <option key={s} value={s}>{getStatusLabel(s)}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">선택한 {selectedIds.size}개 자산의 상태가 변경됩니다.</p>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
                <button onClick={() => setShowBulkStatusModal(false)} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">취소</button>
                <button
                  onClick={handleBulkStatusSave}
                  disabled={bulkStatusSaving}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {bulkStatusSaving ? "변경 중..." : "변경"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 보증 만료 임박 배너 */}
        {showExpiryBanner && !isLoading && (() => {
          const now = new Date();
          const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const expiring = assets.filter((a) => a.expiryDate && a.status !== "DISPOSED" && new Date(a.expiryDate) >= now && new Date(a.expiryDate) <= in30);
          if (expiring.length === 0) return null;
          return (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-800">30일 이내 보증 만료 하드웨어 {expiring.length}건</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {expiring.map((a) => {
                    const daysLeft = Math.ceil((new Date(a.expiryDate!).getTime() - now.getTime()) / 86400000);
                    return (
                      <Link key={a.id} href={`/hardware/${a.id}`} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-200">
                        {a.name}
                        <span className="rounded bg-orange-600 px-1 py-0.5 text-[10px] text-white">D-{daysLeft}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => setShowExpiryBanner(false)} className="shrink-0 rounded p-1 text-orange-400 hover:bg-orange-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })()}

        <div className="overflow-x-auto rounded-lg bg-white shadow-sm" data-tour="hw-table">
          <table className="w-full min-w-[900px]">
            <thead className="border-b bg-gray-50">
              <tr>
                {isAdmin && <th className="w-10 px-3 py-3"><input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === sortedAssets.length} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300" /></th>}
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("assetTag")}>{t.hw.assetTag ?? "자산태그"}<SortIcon field="assetTag" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("name")}>{t.asset.assetName}<SortIcon field="name" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("deviceType")}>{t.hw.deviceType}<SortIcon field="deviceType" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("manufacturer")}>{t.hw.manufacturer} / {t.hw.model}<SortIcon field="manufacturer" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("status")}>{t.common.status}<SortIcon field="status" /></th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("cost")}>{t.asset.cost}<SortIcon field="cost" /></th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.hw.usefulLife}</th>
                <th className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold hover:text-blue-600 whitespace-nowrap" onClick={() => handleSort("assignee")}>{t.asset.assignee}<SortIcon field="assignee" /></th>
                <th className="px-6 py-3 text-left text-xs font-semibold whitespace-nowrap">{t.cia.title}</th>
                {isAdmin && <th className="px-6 py-3 text-right text-xs font-semibold whitespace-nowrap">{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={isAdmin ? 11 : 10} className="px-6 py-8 text-center text-gray-400">{t.common.loading}</td></tr>
              ) : sortedAssets.length === 0 ? (
                <tr><td colSpan={isAdmin ? 11 : 10} className="px-6 py-8 text-center text-gray-500">{t.common.noData}</td></tr>
              ) : (
                sortedAssets.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    {isAdmin && <td className="w-10 px-3 py-4"><input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} className="h-4 w-4 rounded border-gray-300" /></td>}
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">{a.hardwareDetail?.assetTag || "—"}</td>
                    <td className="px-6 py-4 font-medium"><Link href={`/hardware/${a.id}`} className="text-blue-600 hover:underline">{a.name}</Link></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.hardwareDetail?.deviceType || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{[a.hardwareDetail?.manufacturer, a.hardwareDetail?.model].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[a.status]}`}>{getStatusLabel(a.status)}</span>
                      {a.hardwareDetail?.condition && <span className={`ml-1 inline-block rounded px-1.5 py-0.5 text-xs font-bold ${a.hardwareDetail.condition === "A" ? "bg-green-100 text-green-700" : a.hardwareDetail.condition === "B" ? "bg-blue-100 text-blue-700" : a.hardwareDetail.condition === "C" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{a.hardwareDetail.condition}</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">{formatCost(a.cost, a.currency)}</td>
                    <td className="px-6 py-4 text-sm"><LifecycleGaugeInline startDate={a.purchaseDate} endDate={a.expiryDate} /></td>
                    <td className="px-6 py-4 text-sm">{a.assignee ? <Link href={`/employees/${a.assignee.id}`} className="text-blue-600 hover:underline">{a.assignee.name}</Link> : <span className="text-gray-400">{t.license.unassigned}</span>}</td>
                    <td className="px-6 py-4 text-sm"><CiaBadge ciaC={a.ciaC} ciaI={a.ciaI} ciaA={a.ciaA} /></td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!a.assignee && a.status === "IN_STOCK" && (
                            <HwAssignButton assetId={a.id} assetName={a.name} onDone={loadAssets} />
                          )}
                          {a.assignee && (
                            <HwUnassignButton assetId={a.id} assetName={a.name} assigneeName={a.assignee.name} onDone={loadAssets} />
                          )}
                          <button onClick={() => router.push(`/hardware/${a.id}`)} className="rounded p-1 hover:bg-gray-200" title={t.common.detail}><Eye className="h-4 w-4" /></button>
                          <button onClick={() => router.push(`/hardware/${a.id}/edit`)} className="rounded p-1 hover:bg-gray-200" title={t.common.edit}><Edit className="h-4 w-4" /></button>
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
        <div className="mt-4 text-sm text-gray-600">{t.common.total} {total}{t.dashboard.items}</div>
      </div>
    </div>
  );
}
