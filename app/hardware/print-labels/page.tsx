"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

interface Asset {
  id: number;
  name: string;
  hardwareDetail?: {
    assetTag?: string | null;
    deviceType?: string | null;
    manufacturer?: string | null;
    model?: string | null;
  } | null;
  orgUnit?: { name: string } | null;
  assignee?: { name: string } | null;
  status: string;
}

export default function PrintLabelsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids")?.split(",").map(Number).filter(Boolean) ?? [];

  const STATUS_LABEL: Record<string, string> = {
    IN_STOCK: t.asset.statusInStock,
    IN_USE: t.asset.statusInUse,
    INACTIVE: t.asset.statusInactive,
    UNUSABLE: t.asset.statusUnusable,
    PENDING_DISPOSAL: t.asset.statusPendingDisposal,
    DISPOSED: t.asset.statusDisposed,
  };

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelSize, setLabelSize] = useState<"sm" | "md" | "lg">("md");

  const loadAssets = useCallback(async () => {
    if (ids.length === 0) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/assets?type=HARDWARE&limit=200`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const filtered = (data.assets ?? []).filter((a: Asset) => ids.includes(a.id));
      setAssets(filtered);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const labelClass = labelSize === "sm"
    ? "w-36 h-20 p-1.5 text-[9px]"
    : labelSize === "lg"
    ? "w-64 h-40 p-3 text-xs"
    : "w-48 h-28 p-2 text-[10px]";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
          .label-grid { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; }
          .label-card { border: 1px solid #333; page-break-inside: avoid; }
        }
      `}</style>

      {/* Controls */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Link href="/hardware" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />{t.common.back}
        </Link>
        <span className="text-sm text-gray-500">{t.hw.labelCount} {assets.length}</span>
        <div className="flex items-center gap-1 ml-2">
          {(["sm", "md", "lg"] as const).map((s) => (
            <button key={s} onClick={() => setLabelSize(s)}
              className={`rounded px-2 py-1 text-xs ${labelSize === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {s === "sm" ? t.hw.sizeSmall : s === "md" ? t.hw.sizeMedium : t.hw.sizeLarge}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />인쇄
        </button>
      </div>

      {/* Labels */}
      <div className="label-grid flex flex-wrap gap-2 p-4 bg-gray-100 min-h-screen">
        {loading ? (
          <p className="p-8 text-gray-500">불러오는 중...</p>
        ) : assets.length === 0 ? (
          <p className="p-8 text-gray-500">출력할 자산이 없습니다. URL에 ?ids=1,2,3 를 추가하세요.</p>
        ) : (
          assets.map((a) => (
            <div key={a.id} className={`label-card flex flex-col justify-between rounded border border-gray-400 bg-white font-mono ${labelClass}`}>
              {/* Asset tag — most prominent */}
              <div className="border-b border-gray-300 pb-1 mb-1">
                <div className="text-center font-bold tracking-widest"
                  style={{ fontSize: labelSize === "lg" ? "1.1rem" : labelSize === "md" ? "0.85rem" : "0.7rem" }}>
                  {a.hardwareDetail?.assetTag ?? "—"}
                </div>
              </div>

              {/* Name */}
              <div className="font-semibold leading-tight truncate">{a.name}</div>

              {/* Device info */}
              {a.hardwareDetail?.deviceType && (
                <div className="text-gray-500 truncate">{a.hardwareDetail.deviceType}</div>
              )}
              {(a.hardwareDetail?.manufacturer || a.hardwareDetail?.model) && (
                <div className="text-gray-500 truncate">
                  {[a.hardwareDetail?.manufacturer, a.hardwareDetail?.model].filter(Boolean).join(" ")}
                </div>
              )}

              {/* Footer */}
              <div className="mt-auto flex items-end justify-between border-t border-gray-200 pt-1">
                <span className="text-gray-400">#{a.id}</span>
                <span className="text-gray-500">{STATUS_LABEL[a.status] ?? a.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
