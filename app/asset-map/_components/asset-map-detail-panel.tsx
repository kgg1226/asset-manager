"use client";

import Link from "next/link";
import {
  FileText,
  Cloud,
  HardDrive,
  Globe,
  User,
  Building2,
  X,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { MapNode, MapEdge } from "@/lib/asset-map-builder";

interface DetailPanelProps {
  node: MapNode | null;
  edges: MapEdge[];
  nodes: MapNode[];
  onClose: () => void;
}

const ICONS: Record<string, React.ReactNode> = {
  LICENSE: <FileText className="h-5 w-5 text-blue-500" />,
  CLOUD: <Cloud className="h-5 w-5 text-purple-500" />,
  HARDWARE: <HardDrive className="h-5 w-5 text-orange-500" />,
  DOMAIN_SSL: <Globe className="h-5 w-5 text-green-500" />,
  EMPLOYEE: <User className="h-5 w-5 text-gray-500" />,
  ORG_UNIT: <Building2 className="h-5 w-5 text-sky-500" />,
};

function getDetailLink(node: MapNode): string | null {
  const numId = node.id.replace(/^\w+-/, "");
  switch (node.type) {
    case "LICENSE":
      return `/licenses/${numId}`;
    case "CLOUD":
      return `/cloud/${numId}`;
    case "HARDWARE":
      return `/hardware/${numId}`;
    case "DOMAIN_SSL":
      return `/domains/${numId}`;
    case "EMPLOYEE":
      return `/employees/${numId}`;
    default:
      return null;
  }
}

export default function AssetMapDetailPanel({ node, edges, nodes, onClose }: DetailPanelProps) {
  const { locale } = useTranslation();
  const lang = locale === "ko" ? "ko" : "en";

  if (!node) return null;

  // Find connected nodes
  const connectedEdges = edges.filter((e) => e.source === node.id || e.target === node.id);
  const connectedNodeIds = new Set(
    connectedEdges.flatMap((e) => [e.source, e.target]).filter((id) => id !== node.id)
  );
  const connectedNodes = nodes.filter((n) => connectedNodeIds.has(n.id));

  const detailLink = getDetailLink(node);

  const TYPE_LABELS: Record<string, string> = {
    LICENSE: lang === "ko" ? "라이선스" : "License",
    CLOUD: lang === "ko" ? "클라우드" : "Cloud",
    HARDWARE: lang === "ko" ? "하드웨어" : "Hardware",
    DOMAIN_SSL: lang === "ko" ? "도메인/SSL" : "Domain/SSL",
    EMPLOYEE: lang === "ko" ? "조직원" : "Employee",
    ORG_UNIT: lang === "ko" ? "부서" : "Department",
  };

  const EDGE_LABELS: Record<string, string> = {
    ASSIGNMENT: lang === "ko" ? "할당" : "Assigned",
    ASSIGNED_TO: lang === "ko" ? "배정" : "Allocated",
    INSTALLED: lang === "ko" ? "설치" : "Installed",
    BELONGS_TO: lang === "ko" ? "소속" : "Belongs to",
    CHILD_OF: lang === "ko" ? "하위" : "Child",
  };

  return (
    <div className="absolute right-4 top-4 z-10 w-72 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        {ICONS[node.type]}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{node.label}</div>
          <div className="text-xs text-gray-500">{TYPE_LABELS[node.type]}</div>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
        {/* Status & Cost */}
        {(node.status || node.monthlyCost) && (
          <div className="flex items-center gap-3 text-xs">
            {node.status && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                {node.status}
              </span>
            )}
            {node.monthlyCost != null && node.monthlyCost > 0 && (
              <span className="text-gray-500">₩{node.monthlyCost.toLocaleString()}/월</span>
            )}
          </div>
        )}

        {/* Connected nodes */}
        {connectedNodes.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5">
              {lang === "ko" ? "연결된 항목" : "Connected"} ({connectedNodes.length})
            </div>
            <div className="space-y-1">
              {connectedNodes.slice(0, 10).map((cn) => {
                const edge = connectedEdges.find(
                  (e) => e.source === cn.id || e.target === cn.id
                );
                return (
                  <div
                    key={cn.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    {ICONS[cn.type] &&
                      <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">{ICONS[cn.type]}</span>
                    }
                    <span className="truncate text-gray-700">{cn.label}</span>
                    {edge && (
                      <span className="ml-auto text-[10px] text-gray-400">
                        {EDGE_LABELS[edge.type]}
                      </span>
                    )}
                  </div>
                );
              })}
              {connectedNodes.length > 10 && (
                <div className="text-[10px] text-gray-400 px-2">
                  +{connectedNodes.length - 10} {lang === "ko" ? "더" : "more"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Link to detail page */}
        {detailLink && (
          <Link
            href={detailLink}
            className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {lang === "ko" ? "상세 페이지로 이동" : "Go to detail page"}
          </Link>
        )}
      </div>
    </div>
  );
}
