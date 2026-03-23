"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Connection,
  MarkerType,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  NodeResizer,
  reconnectEdge,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import dagre from "dagre";
import {
  HardDrive,
  Cloud,
  Globe,
  FileText,
  FileSignature,
  Package,
  LayoutGrid,
  Plus,
  X,
  Building2,
  Save,
  FileDown,
  ChevronDown,
  ArrowRight,
  ArrowLeftRight,
  User,
  Eye,
  Link2,
  Laptop,
  Monitor,
  Server,
  Router,
  Smartphone,
  Printer,
  Search,
  GripVertical,
  Check,
  ArrowLeft,
  GitBranch,
  Copy,
  Share2,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Folder,
  FolderPlus,
  ChevronRight,
  FolderOpen,
  MoveRight,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// ─── Types ─────────────────────────────────────────────────────────────

type AssetNode = {
  id: number;
  name: string;
  type: string;
  status: string;
  vendor: string | null;
  assigneeName: string | null;
  serviceCategory?: string | null;
  description?: string | null;
  monthlyCost?: number | null;
  currency?: string | null;
  deviceType?: string | null;
  piiStage?: string | null;
};

type AssetEdge = {
  id: number;
  sourceAssetId: number | null;
  targetAssetId: number | null;
  sourceExternalId?: number | null;
  targetExternalId?: number | null;
  linkType: string;
  direction: string;
  label: string | null;
  dataTypes: string | null;
  piiItems: string | null;
  protocol: string | null;
  legalBasis: string | null;
  retentionPeriod: string | null;
  destructionMethod: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
  sourceAssetName: string;
  targetAssetName: string;
};

type ExternalEntity = {
  id: number;
  name: string;
  type: "TRUSTEE" | "PARTNER" | "GOVERNMENT" | "OTHER";
  description: string | null;
  contactInfo: string | null;
};

type AssetGroup = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  members?: { assetId: number; asset: { name: string; type: string } }[];
  assetIds?: number[];
};

type SectionDataItem = {
  id: string;
  name: string;
  color: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: string[];
};

type ViewportState = { x: number; y: number; zoom: number };

type SavedView = {
  id: number;
  name: string;
  nodePositions: Record<string, { x: number; y: number }>;
  sectionData?: SectionDataItem[] | null;
  viewport?: ViewportState | null;
  edgeVisibility?: Record<string, unknown> | null;
  filterConfig?: Record<string, unknown> | null;
  viewType?: string;
  isDefault?: boolean;
  isShared?: boolean;
  lastAccessedAt?: string;
  createdBy?: number;
  folderId?: number | null;
};

type MapFolder = {
  id: number;
  name: string;
  color: string;
  pages: SavedView[];
};

type SaveStatus = "saved" | "saving" | "dirty";

type ViewType = "all" | "pii" | "network" | "data_flow";

type SelectedNodeData = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

const LINK_TYPES = ["DATA_FLOW", "NETWORK", "DEPENDENCY", "AUTH"] as const;
const DATA_TYPES = ["PII", "LOG", "CREDENTIAL"] as const;

// ─── Colors ────────────────────────────────────────────────────────────

const ASSET_COLORS: Record<string, { bg: string; border: string; icon: string; light: string }> = {
  HARDWARE: { bg: "#EFF6FF", border: "#3B82F6", icon: "#2563EB", light: "#DBEAFE" },
  CLOUD: { bg: "#F5F3FF", border: "#8B5CF6", icon: "#7C3AED", light: "#EDE9FE" },
  DOMAIN_SSL: { bg: "#ECFDF5", border: "#10B981", icon: "#059669", light: "#D1FAE5" },
  SOFTWARE: { bg: "#FFF7ED", border: "#F97316", icon: "#EA580C", light: "#FFEDD5" },
  CONTRACT: { bg: "#F9FAFB", border: "#6B7280", icon: "#4B5563", light: "#F3F4F6" },
  OTHER: { bg: "#FEF2F2", border: "#EF4444", icon: "#DC2626", light: "#FEE2E2" },
};

const EXTERNAL_ENTITY_COLORS: Record<string, { bg: string; border: string }> = {
  TRUSTEE: { bg: "#F3F4F6", border: "#6B7280" },
  PARTNER: { bg: "#F3F4F6", border: "#9CA3AF" },
  GOVERNMENT: { bg: "#FEF2F2", border: "#EF4444" },
  OTHER: { bg: "#F3F4F6", border: "#D1D5DB" },
};

const LINK_COLORS: Record<string, string> = {
  DATA_FLOW: "#3B82F6",
  NETWORK: "#10B981",
  DEPENDENCY: "#F97316",
  AUTH: "#EF4444",
};

const LINK_BG_COLORS: Record<string, string> = {
  DATA_FLOW: "#EFF6FF",
  NETWORK: "#ECFDF5",
  DEPENDENCY: "#FFF7ED",
  AUTH: "#FEF2F2",
};

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  IN_USE: { dot: "#22C55E", bg: "#F0FDF4", text: "#15803D" },
  IN_STOCK: { dot: "#9CA3AF", bg: "#F9FAFB", text: "#6B7280" },
  INACTIVE: { dot: "#EF4444", bg: "#FEF2F2", text: "#DC2626" },
  UNUSABLE: { dot: "#EF4444", bg: "#FEF2F2", text: "#DC2626" },
  PENDING_DISPOSAL: { dot: "#F59E0B", bg: "#FFFBEB", text: "#B45309" },
  DISPOSED: { dot: "#6B7280", bg: "#F3F4F6", text: "#4B5563" },
};

// ─── Helpers ──────────────────────────────────────────────────────────

function formatCost(cost: number | null | undefined, currency?: string | null): string {
  if (!cost) return "";
  if (currency === "USD") return `$${cost.toLocaleString()}/mo`;
  if (currency === "EUR") return `\u20AC${cost.toLocaleString()}/mo`;
  if (currency === "JPY") return `\u00A5${cost.toLocaleString()}/mo`;
  return `\u20A9${cost.toLocaleString()}/mo`;
}

function getAssetDetailPath(assetType: string, assetId: string): string {
  switch (assetType) {
    case "HARDWARE": return `/hardware/${assetId}`;
    case "CLOUD": return `/cloud/${assetId}`;
    case "DOMAIN_SSL": return `/domains/${assetId}`;
    case "SOFTWARE": return `/licenses/${assetId}`;
    case "CONTRACT": return `/contracts/${assetId}`;
    default: return `/hardware/${assetId}`;
  }
}

// ─── Custom Nodes ─────────────────────────────────────────────────────

function AssetIcon({ type, color, size = "w-5 h-5", deviceType }: { type: string; color: string; size?: string; deviceType?: string | null }) {
  const props = { className: size, style: { color } };

  // 하드웨어 세부 유형별 아이콘
  if (type === "HARDWARE" && deviceType) {
    const dt = deviceType.toLowerCase();
    if (dt.includes("laptop") || dt.includes("notebook")) return <Laptop {...props} />;
    if (dt.includes("desktop") || dt.includes("pc") || dt.includes("workstation")) return <Monitor {...props} />;
    if (dt.includes("server")) return <Server {...props} />;
    if (dt.includes("network") || dt.includes("switch") || dt.includes("router") || dt.includes("firewall")) return <Router {...props} />;
    if (dt.includes("mobile") || dt.includes("phone") || dt.includes("tablet")) return <Smartphone {...props} />;
    if (dt.includes("printer") || dt.includes("peripheral")) return <Printer {...props} />;
    return <HardDrive {...props} />;
  }

  switch (type) {
    case "HARDWARE": return <HardDrive {...props} />;
    case "CLOUD": return <Cloud {...props} />;
    case "DOMAIN_SSL": return <Globe {...props} />;
    case "SOFTWARE": return <FileText {...props} />;
    case "CONTRACT": return <FileSignature {...props} />;
    default: return <Package {...props} />;
  }
}

function StatusDot({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.IN_STOCK;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: colors.dot }}
    />
  );
}

function AssetNodeComponent({ data, selected }: { data: Record<string, unknown>; selected?: boolean }) {
  const type = (data.assetType as string) || "OTHER";
  const status = (data.status as string) || "IN_STOCK";
  const deviceType = (data.deviceType as string) || null;
  const colors = ASSET_COLORS[type] || ASSET_COLORS.OTHER;
  const cost = data.monthlyCost as number | null;
  const currency = data.currency as string | null;
  const assignee = data.assigneeName as string | null;
  const costStr = formatCost(cost, currency);

  const containerRef = useRef<HTMLDivElement>(null);
  const [nodeSize, setNodeSize] = useState({ w: 200, h: 150 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setNodeSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Size thresholds for progressive content hiding
  const isCompact = nodeSize.w < 150 || nodeSize.h < 100;
  const isTiny = nodeSize.w < 110 || nodeSize.h < 80;
  const iconSize = isCompact ? "w-5 h-5" : "w-6 h-6";
  const iconBoxSize = isCompact ? "w-7 h-7" : "w-10 h-10";

  const handleClass = "!w-3 !h-3 !border-2 !border-white !rounded-full !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200";
  const dynHandleClass = "!w-1.5 !h-1.5 !border !border-white !rounded-full !opacity-0 group-hover:!opacity-60 !transition-opacity !duration-200";

  return (
    <div
      ref={containerRef}
      className="group rounded-xl border-2 px-2 py-2 relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        boxShadow: `0 2px 8px ${colors.border}20, 0 1px 3px rgba(0,0,0,0.06)`,
        minWidth: 80,
        minHeight: 60,
      }}
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={80}
        minHeight={60}
        lineStyle={{ borderColor: colors.border, borderWidth: 1.5 }}
        handleStyle={{ backgroundColor: colors.border, width: 8, height: 8, borderRadius: 4 }}
      />
      {/* Connection handles — 4 cardinal + dynamic percent-based handles */}
      <Handle type="source" position={Position.Top} id="top" className={handleClass} style={{ backgroundColor: colors.border }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} style={{ backgroundColor: colors.border }} />
      <Handle type="source" position={Position.Left} id="left" className={handleClass} style={{ backgroundColor: colors.border }} />
      <Handle type="source" position={Position.Right} id="right" className={handleClass} style={{ backgroundColor: colors.border }} />
      {/* Dynamic handles: "side-pN" format — rendered from data._handles */}
      {((data._handles as string[]) || []).filter((h: string) => h.includes("-p")).map((hId: string) => {
        const side = hId.split("-p")[0];
        const pct = parseInt(hId.split("-p")[1], 10);
        const pos = side === "top" ? Position.Top : side === "bottom" ? Position.Bottom : side === "left" ? Position.Left : Position.Right;
        const isHorizontal = side === "top" || side === "bottom";
        return (
          <Handle key={hId} type="source" position={pos} id={hId}
            className={dynHandleClass}
            style={{ backgroundColor: colors.border, ...(isHorizontal ? { left: `${pct}%` } : { top: `${pct}%` }) }}
          />
        );
      })}

      {/* Icon centered above name */}
      <div className={`flex flex-col items-center ${isCompact ? "gap-0.5" : "gap-1.5"}`}>
        <div
          className={`${iconBoxSize} rounded-lg flex items-center justify-center`}
          style={{ backgroundColor: colors.light }}
        >
          <AssetIcon type={type} color={colors.icon} size={iconSize} deviceType={deviceType} />
        </div>

        {/* Name — always shown, font scales */}
        <div
          className={`font-semibold text-gray-900 truncate text-center w-full ${
            isCompact ? "text-[10px]" : "text-sm"
          }`}
        >
          {data.label as string}
        </div>

        {/* Status + Type row — hidden when tiny */}
        {!isTiny && (
          <div className="flex items-center gap-1.5">
            <StatusDot status={status} />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              {type.replace("_", " ")}
            </span>
          </div>
        )}

        {/* Assignee — hidden when compact */}
        {!isCompact && assignee && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[140px]">{assignee}</span>
          </div>
        )}

        {/* Cost — hidden when compact */}
        {!isCompact && costStr && (
          <div
            className="text-xs font-semibold rounded-md px-2 py-0.5"
            style={{ color: colors.icon, backgroundColor: colors.light }}
          >
            {costStr}
          </div>
        )}
      </div>
    </div>
  );
}

function ExternalEntityNodeComponent({ data }: { data: Record<string, unknown> }) {
  const entityType = (data.entityType as string) || "OTHER";
  const colors = EXTERNAL_ENTITY_COLORS[entityType] || EXTERNAL_ENTITY_COLORS.OTHER;
  const entityTypeLabels: Record<string, string> = {
    TRUSTEE: (data.trusteeLabel as string) || "Trustee",
    PARTNER: (data.partnerLabel as string) || "Partner",
    GOVERNMENT: (data.governmentLabel as string) || "Government",
    OTHER: (data.otherLabel as string) || "Other",
  };

  const handleClass = "!w-3 !h-3 !border-2 !border-white !rounded-full !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200";
  const dynHandleClass = "!w-1.5 !h-1.5 !border !border-white !rounded-full !opacity-0 group-hover:!opacity-60 !transition-opacity !duration-200";

  return (
    <div
      className="group rounded-xl border-2 border-dashed px-4 py-3 min-w-[200px] relative"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        boxShadow: `0 2px 8px ${colors.border}15, 0 1px 3px rgba(0,0,0,0.04)`,
      }}
    >
      {/* Connection handles — 4 cardinal + dynamic */}
      <Handle type="source" position={Position.Top} id="top" className={handleClass} style={{ backgroundColor: colors.border }} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} style={{ backgroundColor: colors.border }} />
      <Handle type="source" position={Position.Left} id="left" className={handleClass} style={{ backgroundColor: colors.border }} />
      <Handle type="source" position={Position.Right} id="right" className={handleClass} style={{ backgroundColor: colors.border }} />
      {((data._handles as string[]) || []).filter((h: string) => h.includes("-p")).map((hId: string) => {
        const side = hId.split("-p")[0];
        const pct = parseInt(hId.split("-p")[1], 10);
        const pos = side === "top" ? Position.Top : side === "bottom" ? Position.Bottom : side === "left" ? Position.Left : Position.Right;
        const isHorizontal = side === "top" || side === "bottom";
        return (
          <Handle key={hId} type="source" position={pos} id={hId}
            className={dynHandleClass}
            style={{ backgroundColor: colors.border, ...(isHorizontal ? { left: `${pct}%` } : { top: `${pct}%` }) }}
          />
        );
      })}

      <div className="flex flex-col items-center gap-1.5">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${colors.border}20` }}
        >
          <Building2 className="w-6 h-6" style={{ color: colors.border }} />
        </div>

        <div className="text-sm font-semibold text-gray-900 truncate max-w-[180px] text-center">
          {data.label as string}
        </div>

        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: entityType === "GOVERNMENT" ? "#FEE2E2" : "#E5E7EB",
            color: entityType === "GOVERNMENT" ? "#DC2626" : "#4B5563",
          }}
        >
          {entityTypeLabels[entityType]}
        </span>
      </div>
    </div>
  );
}

function GroupNodeComponent({ data, selected }: { data: Record<string, unknown>; selected?: boolean }) {
  const color = (data.groupColor as string) || "#E5E7EB";

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={100}
        minHeight={60}
        lineStyle={{ borderColor: color, borderWidth: 2 }}
        handleStyle={{ backgroundColor: color, width: 8, height: 8, borderRadius: 4 }}
      />
      <div
        className="rounded-xl border-2 border-dashed p-2 w-full h-full"
        style={{
          backgroundColor: `${color}20`,
          borderColor: color,
        }}
      >
        <div
          className="text-xs font-bold px-2 py-1 rounded mb-1 inline-block"
          style={{ backgroundColor: color, color: "#fff" }}
        >
          {data.label as string}
        </div>
      </div>
    </>
  );
}

const SECTION_COLORS = [
  { label: "Blue", value: "#3B82F6" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Green", value: "#10B981" },
  { label: "Orange", value: "#F97316" },
  { label: "Red", value: "#EF4444" },
  { label: "Gray", value: "#6B7280" },
  { label: "Teal", value: "#14B8A6" },
  { label: "Pink", value: "#EC4899" },
];

function SectionNodeComponent({ data, selected }: { data: Record<string, unknown>; selected?: boolean }) {
  const color = (data.sectionColor as string) || "#3B82F6";
  const description = (data.description as string) || "";

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={200}
        minHeight={120}
        lineStyle={{ borderColor: color, borderWidth: 2 }}
        handleStyle={{ backgroundColor: color, width: 8, height: 8, borderRadius: 4 }}
      />
      <div
        className="rounded-2xl border-2 w-full h-full flex flex-col"
        style={{
          backgroundColor: `${color}08`,
          borderColor: `${color}40`,
          borderStyle: "solid",
        }}
      >
        {/* Section header — left aligned */}
        <div className="flex items-center gap-2 py-2 px-4 border-b" style={{ borderColor: `${color}20` }}>
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color }}
          >
            {data.label as string}
          </span>
          {description && (
            <span className="text-[9px] text-gray-400 ml-1">— {description}</span>
          )}
        </div>
        {/* Content area for child nodes */}
        <div className="flex-1" />
      </div>
    </>
  );
}

function PiiStageLabelComponent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="rounded-lg bg-indigo-600 px-4 py-2 text-white text-sm font-bold shadow-lg">
        {data.label as string}
      </div>
    </div>
  );
}

const nodeTypes = {
  asset: AssetNodeComponent,
  externalEntity: ExternalEntityNodeComponent,
  assetGroup: GroupNodeComponent,
  piiStageLabel: PiiStageLabelComponent,
  section: SectionNodeComponent,
};

// ─── Custom Edge Label ────────────────────────────────────────────────

function EdgeLabelBadge({
  linkType,
  protocol,
  label,
}: {
  linkType: string;
  protocol?: string | null;
  label?: string | null;
}) {
  const color = LINK_COLORS[linkType] || "#6B7280";
  const bgColor = LINK_BG_COLORS[linkType] || "#F9FAFB";
  const typeLabels: Record<string, string> = {
    DATA_FLOW: "Data",
    NETWORK: "Net",
    DEPENDENCY: "Dep",
    AUTH: "Auth",
  };

  const text = label || typeLabels[linkType] || linkType;
  const suffix = protocol ? ` (${protocol})` : "";

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border whitespace-nowrap"
      style={{
        color: color,
        backgroundColor: bgColor,
        borderColor: `${color}40`,
      }}
    >
      {text}{suffix}
    </div>
  );
}

// ─── Edge Handle Distribution ──────────────────────────────────────────
// 같은 노드+방향에 여러 엣지가 몰리면 동적 핸들 ID로 분배 (최대 10개 이상 지원)

// 핸들 ID → 방향(side) 매핑
function getHandleSide(handleId: string): string {
  if (handleId.startsWith("top")) return "top";
  if (handleId.startsWith("bottom")) return "bottom";
  if (handleId.startsWith("left")) return "left";
  if (handleId.startsWith("right")) return "right";
  return "right";
}

/**
 * N개 엣지를 한 방향에 균등 분배할 핸들 ID 생성
 * 예: side="left", count=3 → ["left-p17", "left-p50", "left-p83"]
 *     side="right", count=1 → ["right"]
 */
function generateSlots(side: string, count: number): string[] {
  if (count <= 1) return [side];
  return Array.from({ length: count }, (_, i) => {
    const pct = Math.round(((i + 1) / (count + 1)) * 100);
    return `${side}-p${pct}`;
  });
}

/**
 * 엣지 배열을 받아서 같은 노드+방향에 여러 엣지가 도착/출발하면
 * 핸들을 균등 분산시킨다.
 */
function distributeEdgeHandles(edges: import("@xyflow/react").Edge[]): import("@xyflow/react").Edge[] {
  // 1. 노드+방향별 엣지 그룹화
  const targetGroups: Record<string, import("@xyflow/react").Edge[]> = {};
  const sourceGroups: Record<string, import("@xyflow/react").Edge[]> = {};

  for (const edge of edges) {
    const tSide = getHandleSide(edge.targetHandle || "left");
    const tKey = `${edge.target}:${tSide}`;
    (targetGroups[tKey] ??= []).push(edge);

    const sSide = getHandleSide(edge.sourceHandle || "right");
    const sKey = `${edge.source}:${sSide}`;
    (sourceGroups[sKey] ??= []).push(edge);
  }

  // 2. target 핸들 분배 (1개여도 기본 방향으로 정규화)
  for (const [, group] of Object.entries(targetGroups)) {
    const side = getHandleSide(group[0].targetHandle || "left");
    if (group.length <= 1) {
      // 레거시 핸들 ID(top-left 등)를 기본 방향(top)으로 정규화
      group[0].targetHandle = side;
      continue;
    }
    const slots = generateSlots(side, group.length);
    group.forEach((edge, i) => { edge.targetHandle = slots[i]; });
  }

  // 3. source 핸들 분배 (1개여도 기본 방향으로 정규화)
  for (const [, group] of Object.entries(sourceGroups)) {
    const side = getHandleSide(group[0].sourceHandle || "right");
    if (group.length <= 1) {
      group[0].sourceHandle = side;
      continue;
    }
    const slots = generateSlots(side, group.length);
    group.forEach((edge, i) => { edge.sourceHandle = slots[i]; });
  }

  return edges;
}

/** distributeEdgeHandles가 사용하는 동적 핸들 ID에서 필요한 핸들 세트를 수집 */
function collectDynamicHandles(edges: import("@xyflow/react").Edge[], nodeId: string): string[] {
  const handles = new Set<string>();
  for (const e of edges) {
    if (e.source === nodeId && e.sourceHandle) handles.add(e.sourceHandle);
    if (e.target === nodeId && e.targetHandle) handles.add(e.targetHandle);
  }
  return Array.from(handles);
}

// ─── Layout ────────────────────────────────────────────────────────────

const NODE_WIDTH = 220;
const NODE_HEIGHT = 130;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const sectionNodes = nodes.filter((n) => n.type === "section");
  const otherNodes = nodes.filter((n) => n.type === "assetGroup" || n.type === "piiStageLabel");

  // Separate free nodes vs section children
  const freeNodes = nodes.filter((n) =>
    n.type !== "assetGroup" && n.type !== "piiStageLabel" && n.type !== "section" && !n.parentId
  );
  const childNodes = nodes.filter((n) => !!n.parentId);

  // Layout free nodes with dagre
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 160 });

  freeNodes.forEach((node) => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  const layoutedFreeNodes = freeNodes.map((node) => {
    const pos = g.node(node.id);
    if (pos) {
      return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
    }
    return node;
  });

  // Layout children within each section — centered, evenly spaced
  const layoutedChildNodes = childNodes.map((node) => {
    const parentSection = sectionNodes.find((s) => s.id === node.parentId);
    if (!parentSection) return node;

    const siblings = childNodes.filter((n) => n.parentId === node.parentId);
    const siblingIdx = siblings.indexOf(node);
    const siblingCount = siblings.length;

    const sw = (parentSection.style?.width as number) || 400;
    const sh = (parentSection.style?.height as number) || 300;
    const headerHeight = 32; // section header bar height
    const contentH = sh - headerHeight;
    const padding = 20;

    // Grid layout: calculate columns and rows
    const cols = Math.min(siblingCount, Math.max(1, Math.floor((sw - padding * 2) / (NODE_WIDTH + 20))));
    const rows = Math.ceil(siblingCount / cols);
    const col = siblingIdx % cols;
    const row = Math.floor(siblingIdx / cols);

    // Center the grid within section
    const totalGridW = cols * (NODE_WIDTH + 20) - 20;
    const totalGridH = rows * (NODE_HEIGHT + 20) - 20;
    const offsetX = (sw - totalGridW) / 2;
    const offsetY = headerHeight + (contentH - totalGridH) / 2;

    return {
      ...node,
      position: {
        x: offsetX + col * (NODE_WIDTH + 20),
        y: offsetY + row * (NODE_HEIGHT + 20),
      },
    };
  });

  return { nodes: [...sectionNodes, ...otherNodes, ...layoutedFreeNodes, ...layoutedChildNodes], edges };
}

// ─── PII Lifecycle Layout ─────────────────────────────────────────────

function getPiiLifecycleLayout(
  nodes: Node[],
  edges: Edge[],
  t: ReturnType<typeof useTranslation>["t"]
) {
  const stages: { label: string; matchFn: (data: Record<string, unknown>) => boolean }[] = [
    {
      label: t.assetMap.piiCollection,
      matchFn: (data) => {
        const cat = ((data.serviceCategory as string) || "").toLowerCase();
        const type = ((data.assetType as string) || "").toLowerCase();
        return (
          cat.includes("web") || cat.includes("app") || cat.includes("frontend") ||
          type.includes("web") || type.includes("app") || type.includes("frontend")
        );
      },
    },
    {
      label: t.assetMap.piiStorage,
      matchFn: (data) => {
        const type = ((data.assetType as string) || "").toLowerCase();
        const name = ((data.label as string) || "").toLowerCase();
        return (
          type.includes("db") || type.includes("rds") || type.includes("s3") || type.includes("storage") ||
          name.includes("db") || name.includes("rds") || name.includes("s3") || name.includes("storage") ||
          name.includes("database")
        );
      },
    },
    {
      label: t.assetMap.piiUsageProvision,
      matchFn: (data) => {
        const type = ((data.assetType as string) || "").toLowerCase();
        const name = ((data.label as string) || "").toLowerCase();
        const isExternal = data.isExternalEntity === true;
        return (
          isExternal ||
          type.includes("api") || name.includes("api") ||
          type.includes("external") || name.includes("external")
        );
      },
    },
    {
      label: t.assetMap.piiDestruction,
      matchFn: (data) => {
        const name = ((data.label as string) || "").toLowerCase();
        const cat = ((data.serviceCategory as string) || "").toLowerCase();
        return (
          name.includes("batch") || name.includes("cron") ||
          cat.includes("batch") || cat.includes("cron") ||
          name.includes("scheduler") || name.includes("cleanup")
        );
      },
    },
  ];

  const stageAssignments: Map<string, number> = new Map();
  const contentNodes = nodes.filter(
    (n) => n.type !== "assetGroup" && n.type !== "piiStageLabel" && n.type !== "section"
  );
  const otherNodes = nodes.filter(
    (n) => n.type === "assetGroup"
  );

  // piiStage → stage index mapping
  const PII_STAGE_MAP: Record<string, number> = {
    COLLECTION: 0,
    STORAGE: 1,
    USAGE_PROVISION: 2,
    DESTRUCTION: 3,
  };

  // Assign each node to a stage (piiStage field takes priority over pattern matching)
  contentNodes.forEach((node) => {
    const data = node.data as Record<string, unknown>;
    const piiStage = data.piiStage as string | null;

    // Priority 1: explicit piiStage field
    if (piiStage && PII_STAGE_MAP[piiStage] !== undefined) {
      stageAssignments.set(node.id, PII_STAGE_MAP[piiStage]);
      return;
    }

    // Priority 2: pattern matching fallback
    let assigned = false;
    for (let si = 0; si < stages.length; si++) {
      if (stages[si].matchFn(data)) {
        stageAssignments.set(node.id, si);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      // Default: Usage/Provision row for unmatched nodes
      stageAssignments.set(node.id, 2);
    }
  });

  const ROW_HEIGHT = 180;
  const COL_WIDTH = 260;
  const LABEL_WIDTH = 120;
  const START_X = LABEL_WIDTH + 40;
  const START_Y = 40;

  // Create stage label nodes
  const stageLabelNodes: Node[] = stages.map((stage, idx) => ({
    id: `pii-stage-${idx}`,
    type: "piiStageLabel",
    position: { x: 0, y: START_Y + idx * ROW_HEIGHT + 15 },
    data: { label: stage.label },
    draggable: false,
    selectable: false,
  }));

  // Position content nodes by stage row
  const stageCounters = [0, 0, 0, 0];
  const layoutedContentNodes = contentNodes.map((node) => {
    const stageIdx = stageAssignments.get(node.id) ?? 2;
    const colIdx = stageCounters[stageIdx]++;
    return {
      ...node,
      position: {
        x: START_X + colIdx * COL_WIDTH,
        y: START_Y + stageIdx * ROW_HEIGHT,
      },
    };
  });

  return {
    nodes: [...stageLabelNodes, ...otherNodes, ...layoutedContentNodes],
    edges,
  };
}

// ─── Link Modal ────────────────────────────────────────────────────────

function LinkModal({
  assets,
  externalEntities,
  onSave,
  onClose,
  initialSource,
  initialTarget,
  t,
}: {
  assets: AssetNode[];
  externalEntities: ExternalEntity[];
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  initialSource?: string;
  initialTarget?: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const [sourceAssetId, setSourceAssetId] = useState(initialSource || "");
  const [targetAssetId, setTargetAssetId] = useState(initialTarget || "");
  const [linkType, setLinkType] = useState<string>("DATA_FLOW");
  const [direction, setDirection] = useState<string>("UNI");
  const [label, setLabel] = useState("");
  const [protocol, setProtocol] = useState("");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [piiItemsText, setPiiItemsText] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [retentionPeriod, setRetentionPeriod] = useState("");
  const [destructionMethod, setDestructionMethod] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceAssetId || !targetAssetId) return;
    const isSourceExternal = sourceAssetId.startsWith("ext-");
    const isTargetExternal = targetAssetId.startsWith("ext-");
    onSave({
      ...(isSourceExternal
        ? { sourceExternalId: Number(sourceAssetId.replace("ext-", "")) }
        : { sourceAssetId: Number(sourceAssetId) }),
      ...(isTargetExternal
        ? { targetExternalId: Number(targetAssetId.replace("ext-", "")) }
        : { targetAssetId: Number(targetAssetId) }),
      linkType,
      direction,
      label: label || null,
      protocol: protocol || null,
      dataTypes: selectedDataTypes.length > 0 ? selectedDataTypes : null,
      piiItems: piiItemsText ? piiItemsText.split(",").map((s) => s.trim()).filter(Boolean) : null,
      legalBasis: legalBasis || null,
      retentionPeriod: retentionPeriod || null,
      destructionMethod: destructionMethod || null,
    });
  }

  const linkTypeLabels: Record<string, string> = {
    DATA_FLOW: t.assetMap.dataFlow,
    NETWORK: t.assetMap.network,
    DEPENDENCY: t.assetMap.dependency,
    AUTH: t.assetMap.auth,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{t.assetMap.addLink}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.assetMap.sourceAsset}</label>
              <select value={sourceAssetId} onChange={(e) => setSourceAssetId(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required>
                <option value="">--</option>
                <optgroup label="자산">
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
                {externalEntities.length > 0 && (
                  <optgroup label="외부 조직">
                    {externalEntities.map((e) => <option key={`ext-${e.id}`} value={`ext-${e.id}`}>{e.name} ({e.type})</option>)}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.assetMap.targetAsset}</label>
              <select value={targetAssetId} onChange={(e) => setTargetAssetId(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required>
                <option value="">--</option>
                <optgroup label="자산">
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
                {externalEntities.length > 0 && (
                  <optgroup label="외부 조직">
                    {externalEntities.map((e) => <option key={`ext-${e.id}`} value={`ext-${e.id}`}>{e.name} ({e.type})</option>)}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.assetMap.linkType}</label>
              <select value={linkType} onChange={(e) => setLinkType(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {LINK_TYPES.map((lt) => <option key={lt} value={lt}>{linkTypeLabels[lt]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.assetMap.direction}</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { value: "UNI", label: "→", desc: t.assetMap.uniDirectional },
                  { value: "BI", label: "↔", desc: t.assetMap.biDirectional },
                  { value: "REVERSE", label: "←", desc: "역방향" },
                  { value: "CONDITIONAL", label: "⇢", desc: "조건부" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDirection(opt.value)}
                    className={`rounded-md border px-2 py-1.5 text-center transition ${
                      direction === opt.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-lg block">{opt.label}</span>
                    <span className="text-[9px] block">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.assetMap.label}</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="API 호출, DB 연결..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.assetMap.protocol}</label>
              <input value={protocol} onChange={(e) => setProtocol(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="HTTPS, TCP..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.assetMap.dataTypes}</label>
            <div className="flex gap-3">
              {DATA_TYPES.map((dt) => (
                <label key={dt} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes(dt)}
                    onChange={(e) => setSelectedDataTypes(e.target.checked ? [...selectedDataTypes, dt] : selectedDataTypes.filter((d) => d !== dt))}
                    className="rounded"
                  />
                  {dt}
                </label>
              ))}
            </div>
          </div>

          {selectedDataTypes.includes("PII") && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.assetMap.piiItems}</label>
                <input value={piiItemsText} onChange={(e) => setPiiItemsText(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="이름, 이메일, 전화번호" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.assetMap.legalBasis}</label>
                  <input value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.assetMap.retentionPeriod}</label>
                  <input value={retentionPeriod} onChange={(e) => setRetentionPeriod(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.assetMap.destructionMethod}</label>
                  <input value={destructionMethod} onChange={(e) => setDestructionMethod(e.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs" />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t.assetMap.addLink}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Save View Modal ──────────────────────────────────────────────────

function SaveViewModal({
  onSave,
  onClose,
  t,
}: {
  onSave: (name: string) => void;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{t.assetMap.saveView}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.assetMap.viewName}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder={t.assetMap.viewName}
              autoFocus
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t.assetMap.saveView}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Section Modal ───────────────────────────────────────────────────

function SectionModal({
  onSave,
  onClose,
}: {
  onSave: (name: string, color: string, description: string, width: number, height: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [description, setDescription] = useState("");
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(300);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color, description.trim(), width, height);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">섹션 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">섹션 이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="예: Production, DMZ, Internal..."
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명 (선택)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="이 섹션에 대한 설명"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
            <div className="flex flex-wrap gap-2">
              {SECTION_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    color === c.value ? "border-gray-900 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">너비 (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                min={200}
                max={2000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">높이 (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                min={150}
                max={2000}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            섹션 추가
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Edge Detail Modal ───────────────────────────────────────────────

function EdgeDetailModal({
  edge,
  nodes,
  assets,
  onDelete,
  onEdit,
  onClose,
  t,
}: {
  edge: Edge;
  nodes: Node[];
  assets: AssetNode[];
  onDelete: () => void;
  onEdit: (sourceId: string, targetId: string) => void;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const edgeData = (edge.data || {}) as Record<string, unknown>;
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const linkType = (edgeData.linkType as string) || "DATA_FLOW";
  const linkColor = LINK_COLORS[linkType] || "#6B7280";
  const linkBg = LINK_BG_COLORS[linkType] || "#F9FAFB";
  const direction = (edgeData.direction as string) || "UNI";
  const dataTypes = (edgeData.dataTypes as string) || "";
  const piiItems = (edgeData.piiItems as string) || "";
  const protocol = (edgeData.protocol as string) || "";
  const edgeLabel = (edgeData.label as string) || "";
  const legalBasis = (edgeData.legalBasis as string) || "";
  const retentionPeriod = (edgeData.retentionPeriod as string) || "";
  const destructionMethod = (edgeData.destructionMethod as string) || "";

  const linkTypeLabels: Record<string, string> = {
    DATA_FLOW: t.assetMap?.dataFlow ?? "Data Flow",
    NETWORK: t.assetMap?.network ?? "Network",
    DEPENDENCY: t.assetMap?.dependency ?? "Dependency",
    AUTH: t.assetMap?.auth ?? "Auth",
  };

  const directionLabels: Record<string, string> = {
    UNI: "단방향 →",
    BI: "양방향 ↔",
    REVERSE: "역방향 ←",
    CONDITIONAL: "조건부 ⇢",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">연결 상세</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Source → Target */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
            <span className="text-sm font-medium text-gray-800 truncate">
              {(sourceNode?.data?.label as string) || edge.source}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800 truncate">
              {(targetNode?.data?.label as string) || edge.target}
            </span>
          </div>

          {/* Link Type + Direction */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">유형</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: linkBg, color: linkColor }}
            >
              {linkTypeLabels[linkType] || linkType}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">방향</span>
            <span className="text-sm text-gray-800">{directionLabels[direction] || direction}</span>
          </div>

          {/* Label */}
          {edgeLabel && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">라벨</span>
              <span className="text-sm text-gray-800">{edgeLabel}</span>
            </div>
          )}

          {/* Protocol */}
          {protocol && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">프로토콜</span>
              <span className="text-sm text-gray-800">{protocol}</span>
            </div>
          )}

          {/* Data Types */}
          {dataTypes && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">데이터 유형</span>
              <div className="flex gap-1 flex-wrap">
                {dataTypes.split(",").map((dt) => (
                  <span key={dt} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                    {dt.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* PII Items */}
          {piiItems && (
            <div>
              <span className="text-xs text-gray-500 block mb-1">개인정보 항목</span>
              <p className="text-sm text-gray-800 bg-red-50 rounded-lg p-2">{piiItems}</p>
            </div>
          )}

          {/* Legal Basis */}
          {legalBasis && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">법적 근거</span>
              <span className="text-sm text-gray-800">{legalBasis}</span>
            </div>
          )}

          {/* Retention Period */}
          {retentionPeriod && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">보유기간</span>
              <span className="text-sm text-gray-800">{retentionPeriod}</span>
            </div>
          )}

          {/* Destruction Method */}
          {destructionMethod && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">파기방법</span>
              <span className="text-sm text-gray-800">{destructionMethod}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-4 border-t space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                onEdit(edge.source, edge.target);
                onClose();
              }}
              className="flex-1 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              수정
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              삭제
            </button>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-xs text-red-700 font-medium">
                삭제하려면 &quot;삭제하겠습니다&quot;를 입력하세요
              </p>
              <input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                className="w-full rounded-md border border-red-300 px-3 py-1.5 text-sm focus:outline-none focus:border-red-500"
                placeholder="삭제하겠습니다"
                autoFocus
              />
              <button
                onClick={() => {
                  if (deleteText === "삭제하겠습니다") {
                    onDelete();
                  }
                }}
                disabled={deleteText !== "삭제하겠습니다"}
                className="w-full rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                삭제 확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Saved Views Dropdown ─────────────────────────────────────────────

function SavedViewsDropdown({
  views,
  onLoad,
  t,
}: {
  views: SavedView[];
  onLoad: (view: SavedView) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const safeViews = Array.isArray(views) ? views : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as HTMLElement)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {t.assetMap.savedViews}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border bg-white shadow-lg">
          {safeViews.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">
              {t.assetMap.noSavedViews}
            </div>
          ) : (
            safeViews.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  onLoad(v);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {v.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Side Panel ───────────────────────────────────────────────────────

function SidePanel({
  node,
  edges,
  nodes,
  onClose,
  onAddLink,
  onDeleteLink,
  t,
}: {
  node: SelectedNodeData;
  edges: Edge[];
  nodes: Node[];
  onClose: () => void;
  onAddLink: (sourceId: string) => void;
  onDeleteLink: (edgeId: string) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const data = node.data;
  const isExternal = node.type === "externalEntity";
  const assetType = (data.assetType as string) || "OTHER";
  const status = (data.status as string) || "";
  const vendor = (data.vendor as string) || "";
  const assigneeName = (data.assigneeName as string) || "";
  const description = (data.description as string) || "";
  const serviceCategory = (data.serviceCategory as string) || "";
  const contactInfo = (data.contactInfo as string) || "";
  const colors = isExternal
    ? { bg: "#F3F4F6", border: "#6B7280", icon: "#4B5563", light: "#F3F4F6" }
    : (ASSET_COLORS[assetType] || ASSET_COLORS.OTHER);
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.IN_STOCK;

  const linkTypeLabels: Record<string, string> = {
    DATA_FLOW: t.assetMap.dataFlow,
    NETWORK: t.assetMap.network,
    DEPENDENCY: t.assetMap.dependency,
    AUTH: t.assetMap.auth,
  };

  // Find connected edges
  const connectedEdges = useMemo(() => {
    return edges.filter(
      (e) => e.source === node.id || e.target === node.id
    );
  }, [edges, node.id]);

  // Build connected node info
  const connections = useMemo(() => {
    return connectedEdges.map((edge) => {
      const isOutgoing = edge.source === node.id;
      const otherNodeId = isOutgoing ? edge.target : edge.source;
      const otherNode = nodes.find((n) => n.id === otherNodeId);
      const edgeData = edge.data as Record<string, unknown> | undefined;
      return {
        edgeId: edge.id,
        direction: isOutgoing ? "outgoing" : "incoming",
        otherNodeName: (otherNode?.data?.label as string) || otherNodeId,
        otherNodeType: (otherNode?.data?.assetType as string) || "",
        linkType: (edgeData?.linkType as string) || "",
        protocol: (edgeData?.protocol as string) || "",
        isBi: !!edge.markerStart,
      };
    });
  }, [connectedEdges, nodes, node.id]);

  const detailPath = !isExternal ? getAssetDetailPath(assetType, node.id) : null;
  const cost = data.monthlyCost as number | null;
  const currency = data.currency as string | null;

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-slide-in">
      {/* Panel Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: colors.bg, borderColor: colors.border + "30" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colors.light || `${colors.border}20` }}
          >
            {isExternal ? (
              <Building2 className="w-6 h-6" style={{ color: colors.border }} />
            ) : (
              <AssetIcon type={assetType} color={colors.icon} size="w-6 h-6" deviceType={(data.deviceType as string) || null} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {data.label as string}
            </h3>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {isExternal ? (data.entityType as string) : assetType.replace("_", " ")}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Status & Info */}
        {!isExternal && (
          <div className="space-y-3">
            {/* Status */}
            {status && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: statusColors.dot }}
                  />
                  {status.replace("_", " ")}
                </span>
              </div>
            )}

            {/* Vendor */}
            {vendor && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</span>
                <span className="text-sm text-gray-900">{vendor}</span>
              </div>
            )}

            {/* Assignee */}
            {assigneeName && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assignee</span>
                <span className="inline-flex items-center gap-1 text-sm text-gray-900">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {assigneeName}
                </span>
              </div>
            )}

            {/* Cost */}
            {cost != null && cost > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Cost</span>
                <span className="text-sm font-semibold" style={{ color: colors.icon }}>
                  {formatCost(cost, currency)}
                </span>
              </div>
            )}

            {/* Service Category */}
            {serviceCategory && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
                <span className="text-sm text-gray-900">{serviceCategory}</span>
              </div>
            )}
          </div>
        )}

        {/* External entity info */}
        {isExternal && (
          <div className="space-y-3">
            {description && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Description</span>
                <p className="text-sm text-gray-700">{description}</p>
              </div>
            )}
            {contactInfo && (
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Contact</span>
                <p className="text-sm text-gray-700">{contactInfo}</p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {!isExternal && description && (
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Description</span>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </div>
        )}

        {/* Connections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Connections ({connections.length})
              </span>
            </div>
            <button
              onClick={() => onAddLink(node.id)}
              className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {t.assetMap.addLink}
            </button>
          </div>

          {connections.length === 0 ? (
            <p className="text-xs text-gray-400 italic">{t.assetMap.noLinks}</p>
          ) : (
            <div className="space-y-2">
              {connections.map((conn) => {
                const linkColor = LINK_COLORS[conn.linkType] || "#6B7280";
                const linkBg = LINK_BG_COLORS[conn.linkType] || "#F9FAFB";
                return (
                  <div
                    key={conn.edgeId}
                    className="group rounded-lg border p-2.5 hover:bg-gray-50 transition-colors"
                    style={{ borderColor: `${linkColor}30` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {/* Direction arrow */}
                      {conn.isBi ? (
                        <ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: linkColor }} />
                      ) : conn.direction === "outgoing" ? (
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: linkColor }} />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 rotate-180" style={{ color: linkColor }} />
                      )}
                      {/* Link type badge */}
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: linkBg, color: linkColor }}
                      >
                        {linkTypeLabels[conn.linkType] || conn.linkType}
                      </span>
                      {conn.protocol && (
                        <span className="text-[10px] text-gray-400">({conn.protocol})</span>
                      )}
                      {/* Delete button (visible on hover) */}
                      <button
                        onClick={() => onDeleteLink(conn.edgeId)}
                        className="ml-auto opacity-0 group-hover:opacity-100 rounded p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title={t.common.delete}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 pl-5">
                      {conn.otherNodeType && (
                        <AssetIcon type={conn.otherNodeType} color="#9CA3AF" size="w-3.5 h-3.5" />
                      )}
                      <span className="text-xs text-gray-700 truncate">{conn.otherNodeName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Panel Footer */}
      {detailPath && (
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <a
            href={detailPath}
            className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: colors.border }}
          >
            <Eye className="w-4 h-4" />
            View Detail
          </a>
        </div>
      )}

      {/* Slide-in animation */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// ─── Asset Palette (Left Sidebar) ─────────────────────────────────────

function AssetPalette({
  allAssets,
  placedAssetIds,
  onAddToCanvas,
  onRemoveFromCanvas,
  t,
}: {
  allAssets: AssetNode[];
  placedAssetIds: Set<number>;
  onAddToCanvas: (asset: AssetNode) => void;
  onRemoveFromCanvas: (assetId: number) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [collapsed, setCollapsed] = useState(false);

  const filteredAssets = useMemo(() => {
    return allAssets.filter((a) => {
      if (filterType !== "all" && a.type !== filterType) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allAssets, search, filterType]);

  const unplacedAssets = filteredAssets.filter((a) => !placedAssetIds.has(a.id));
  const placedCount = filteredAssets.filter((a) => placedAssetIds.has(a.id)).length;

  const typeOptions = [
    { value: "all", label: t.common?.all ?? "전체" },
    { value: "HARDWARE", label: t.hw?.title ?? "하드웨어" },
    { value: "CLOUD", label: t.cloud?.title ?? "클라우드" },
    { value: "DOMAIN_SSL", label: t.domain?.title ?? "도메인" },
  ];

  if (collapsed) {
    return (
      <div className="w-10 border-r bg-gray-50 flex flex-col items-center py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:bg-gray-200"
          title="자산 팔레트 열기"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-white flex flex-col flex-shrink-0 overflow-hidden">
      {/* Palette Header */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          자산 팔레트
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={t.common?.search ?? "검색..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Type Filter */}
      <div className="px-3 py-1.5 border-b flex gap-1 flex-wrap">
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterType(opt.value)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
              filterType === opt.value
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats + Bulk Actions */}
      <div className="px-3 py-1.5 border-b flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          캔버스: {placedCount} | 미배치: {unplacedAssets.length}
        </span>
        <div className="flex gap-1">
          {unplacedAssets.length > 0 && (
            <button
              onClick={() => unplacedAssets.forEach((a) => onAddToCanvas(a))}
              className="text-[10px] font-medium text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-50"
            >
              전체 추가
            </button>
          )}
          {placedCount > 0 && (
            <button
              onClick={() => filteredAssets.filter((a) => placedAssetIds.has(a.id)).forEach((a) => onRemoveFromCanvas(a.id))}
              className="text-[10px] font-medium text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50"
            >
              전체 제거
            </button>
          )}
        </div>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto">
        {unplacedAssets.length === 0 && placedCount === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-gray-400">
            등록된 자산이 없습니다
          </div>
        ) : (
          <>
            {/* Unplaced assets */}
            {unplacedAssets.map((asset) => {
              const colors = ASSET_COLORS[asset.type] || ASSET_COLORS.OTHER;
              return (
                <button
                  key={`unplaced-${asset.id}`}
                  onClick={() => onAddToCanvas(asset)}
                  className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-50"
                >
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: colors.light || `${colors.border}15` }}
                  >
                    <AssetIcon type={asset.type} color={colors.icon} size="w-4 h-4" deviceType={asset.deviceType} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-800 truncate">{asset.name}</div>
                    <div className="text-[10px] text-gray-400 uppercase">{asset.type.replace("_", " ")}</div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                </button>
              );
            })}

            {/* Placed assets (removable) */}
            {filteredAssets.filter((a) => placedAssetIds.has(a.id)).map((asset) => {
              const colors = ASSET_COLORS[asset.type] || ASSET_COLORS.OTHER;
              return (
                <button
                  key={`placed-${asset.id}`}
                  onClick={() => onRemoveFromCanvas(asset.id)}
                  className="w-full px-3 py-2 flex items-center gap-2.5 bg-green-50/50 hover:bg-red-50 border-b border-gray-50 transition-colors text-left group"
                >
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: colors.light || `${colors.border}15` }}
                  >
                    <AssetIcon type={asset.type} color={colors.icon} size="w-4 h-4" deviceType={asset.deviceType} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-800 truncate">{asset.name}</div>
                    <div className="text-[10px] text-gray-400 uppercase">{asset.type.replace("_", " ")}</div>
                  </div>
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 group-hover:hidden" />
                  <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 hidden group-hover:block" />
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

function AssetMapContentInner() {
  const { t } = useTranslation();
  const reactFlowInstance = useReactFlow();
  const [view, setView] = useState<ViewType>("all");
  const [nodes, setNodes, defaultOnNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [allAssets, setAllAssets] = useState<AssetNode[]>([]);
  const placedAssetIdsRef = useRef<Set<number>>(new Set());
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [externalEntities, setExternalEntities] = useState<ExternalEntity[]>([]);
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionCounter, setSectionCounter] = useState(0);
  const [pendingConnection, setPendingConnection] = useState<{ source: string; target: string; sourceHandle?: string; targetHandle?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SelectedNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [editingSection, setEditingSection] = useState<Node | null>(null);

  // ── Workspace state ──
  const [activeWorkspace, setActiveWorkspace] = useState<SavedView | null>(null);
  const [workspaces, setWorkspaces] = useState<SavedView[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [editingWsName, setEditingWsName] = useState<number | null>(null);
  const [wsContextMenu, setWsContextMenu] = useState<{ id: number; x: number; y: number } | null>(null);

  // ── Folder state ──
  const [folders, setFolders] = useState<MapFolder[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [folderContextMenu, setFolderContextMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<number | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // ── Gallery / Canvas view state ──
  const [currentView, setCurrentView] = useState<"gallery" | "canvas">("gallery");
  const [showNewWsModal, setShowNewWsModal] = useState(false);
  const [showAssetPalette, setShowAssetPalette] = useState(false);
  const [showEntityPalette, setShowEntityPalette] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const activeWorkspaceRef = useRef<SavedView | null>(null);
  activeWorkspaceRef.current = activeWorkspace;

  // ── Auto-save function ──
  const flushSave = useCallback(async () => {
    const ws = activeWorkspaceRef.current;
    if (!ws || !dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveStatus("saving");
    try {
      const currentNodes = reactFlowInstance.getNodes();
      const viewport = reactFlowInstance.getViewport();
      const nodePositions: Record<string, { x: number; y: number }> = {};
      const sectionData: SectionDataItem[] = [];

      for (const n of currentNodes) {
        if (n.type === "piiStageLabel") continue;
        if (n.type === "section") {
          sectionData.push({
            id: n.id,
            name: (n.data?.sectionName as string) || "",
            color: (n.data?.sectionColor as string) || "#3B82F6",
            description: (n.data?.sectionDescription as string) || "",
            x: n.position.x,
            y: n.position.y,
            width: (n.style?.width as number) || 400,
            height: (n.style?.height as number) || 300,
            children: currentNodes.filter(c => c.parentId === n.id).map(c => c.id),
          });
        } else {
          nodePositions[n.id] = { x: n.position.x, y: n.position.y };
        }
      }

      await fetch(`/api/asset-map/views/${ws.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodePositions,
          sectionData,
          viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
          _autoSave: true,
        }),
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("dirty");
      dirtyRef.current = true;
    }
  }, [reactFlowInstance]);

  const markDirty = useCallback((debounceMs = 2000) => {
    dirtyRef.current = true;
    setSaveStatus("dirty");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => flushSave(), debounceMs);
  }, [flushSave]);

  // ── Ctrl+S manual save ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        flushSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flushSave]);

  // ── beforeunload save ──
  useEffect(() => {
    const handler = () => {
      if (dirtyRef.current && activeWorkspaceRef.current) {
        const currentNodes = reactFlowInstance.getNodes();
        const viewport = reactFlowInstance.getViewport();
        const nodePositions: Record<string, { x: number; y: number }> = {};
        const sectionData: SectionDataItem[] = [];
        for (const n of currentNodes) {
          if (n.type === "piiStageLabel") continue;
          if (n.type === "section") {
            sectionData.push({
              id: n.id, name: (n.data?.sectionName as string) || "",
              color: (n.data?.sectionColor as string) || "#3B82F6",
              description: (n.data?.sectionDescription as string) || "",
              x: n.position.x, y: n.position.y,
              width: (n.style?.width as number) || 400,
              height: (n.style?.height as number) || 300,
              children: currentNodes.filter(c => c.parentId === n.id).map(c => c.id),
            });
          } else {
            nodePositions[n.id] = { x: n.position.x, y: n.position.y };
          }
        }
        navigator.sendBeacon(
          `/api/asset-map/views/${activeWorkspaceRef.current.id}`,
          new Blob([JSON.stringify({
            nodePositions, sectionData,
            viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
            _autoSave: true,
          })], { type: "application/json" }),
        );
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [reactFlowInstance]);

  // ── Viewport change auto-save (3s debounce) ──
  const onMoveEnd = useCallback(() => {
    if (!activeWorkspaceRef.current) return;
    dirtyRef.current = true;
    setSaveStatus("dirty");
    if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
    viewportSaveTimerRef.current = setTimeout(() => flushSave(), 3000);
  }, [flushSave]);

  // ── Workspace operations ──
  const loadWorkspace = useCallback(async (ws: SavedView) => {
    // Flush current before switching
    if (dirtyRef.current) await flushSave();

    setActiveWorkspace(ws);
    setCurrentView("canvas");
    // Touch lastAccessedAt
    fetch(`/api/asset-map/views/${ws.id}/touch`, { method: "PATCH" }).catch(() => {});
  }, [flushSave]);

  const createWorkspace = useCallback(async (name: string) => {
    try {
      const res = await fetch("/api/asset-map/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, viewType: "ALL" }),
      });
      if (res.ok) {
        const created = await res.json();
        setWorkspaces(prev => [created, ...prev]);
        loadWorkspace(created);
      }
    } catch { /* silent */ }
  }, [loadWorkspace]);

  const duplicateWorkspace = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/asset-map/views/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const dup = await res.json();
        setWorkspaces(prev => [dup, ...prev]);
      }
    } catch { /* silent */ }
  }, []);

  const deleteWorkspace = useCallback(async (id: number) => {
    const ws = workspaces.find(w => w.id === id);
    if (ws?.isDefault) return;
    try {
      const res = await fetch(`/api/asset-map/views/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWorkspaces(prev => prev.filter(w => w.id !== id));
        if (activeWorkspace?.id === id) {
          const defaultWs = workspaces.find(w => w.isDefault && w.id !== id);
          if (defaultWs) loadWorkspace(defaultWs);
        }
      }
    } catch { /* silent */ }
  }, [workspaces, activeWorkspace, loadWorkspace]);

  const renameWorkspace = useCallback(async (id: number, name: string) => {
    try {
      await fetch(`/api/asset-map/views/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name } : w));
      if (activeWorkspace?.id === id) setActiveWorkspace(prev => prev ? { ...prev, name } : prev);
    } catch { /* silent */ }
  }, [activeWorkspace]);

  const toggleShareWorkspace = useCallback(async (id: number) => {
    const ws = workspaces.find(w => w.id === id);
    if (!ws) return;
    try {
      await fetch(`/api/asset-map/views/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShared: !ws.isShared }),
      });
      setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, isShared: !w.isShared } : w));
    } catch { /* silent */ }
  }, [workspaces]);

  // ── Folder operations ──
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/asset-map/folders");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
      }
    } catch { /* silent */ }
  }, []);

  const createFolder = useCallback(async (name: string) => {
    try {
      const res = await fetch("/api/asset-map/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const folder = await res.json();
        setFolders(prev => [...prev, { ...folder, pages: [] }]);
      }
    } catch { /* silent */ }
  }, []);

  const renameFolder = useCallback(async (id: number, name: string) => {
    try {
      await fetch(`/api/asset-map/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    } catch { /* silent */ }
  }, []);

  const deleteFolder = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/asset-map/folders/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFolders(prev => prev.filter(f => f.id !== id));
        // Refresh workspaces to get updated folderId
        const viewsRes = await fetch("/api/asset-map/views");
        if (viewsRes.ok) {
          const data = await viewsRes.json();
          const views = Array.isArray(data) ? data : data.views ?? [];
          setWorkspaces(views);
        }
      }
    } catch { /* silent */ }
  }, []);

  const movePageToFolder = useCallback(async (pageId: number, folderId: number | null) => {
    try {
      await fetch(`/api/asset-map/views/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      setWorkspaces(prev => prev.map(w => w.id === pageId ? { ...w, folderId } : w));
      fetchFolders();
    } catch { /* silent */ }
  }, [fetchFolders]);

  const toggleFolder = useCallback((folderId: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  // ── Initial load: ensure-default (gallery stays, no auto-canvas) ──
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/asset-map/views/ensure-default", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          const views: SavedView[] = data.views ?? [];
          setWorkspaces(views);
          setSavedViews(views);
          // Do NOT auto-load into canvas — stay in gallery
        }
      } catch {
        // Fallback: load views the old way
        try {
          const res = await fetch("/api/asset-map/views");
          if (res.ok) {
            const data = await res.json();
            const views = Array.isArray(data) ? data : data.views ?? [];
            setSavedViews(views);
            setWorkspaces(views);
          }
        } catch { /* silent */ }
      }
    }
    init();
    fetchFolders();
  }, [fetchFolders]);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/asset-map?view=${view}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const fetchedAllAssets: AssetNode[] = data.nodes || [];
      const fetchedEntities: ExternalEntity[] = data.externalEntities || [];
      const fetchedGroups: AssetGroup[] = data.groups || [];
      const fetchedEdges: AssetEdge[] = data.edges || [];

      // Save all assets for palette
      setAllAssets(fetchedAllAssets);

      // 워크스페이스에 저장된 nodePositions 기준으로 캔버스에 올릴 자산 결정
      // - nodePositions가 있으면: 해당 ID의 자산만 배치 (저장된 페이지 복원)
      // - nodePositions가 비어있으면: 빈 캔버스 (새 페이지)
      // - isDefault이고 nodePositions가 null이면: 기존처럼 전체 배치 (최초 마이그레이션)
      const ws = activeWorkspaceRef.current;
      const savedPositions = ws?.nodePositions;
      const hasSavedPositions = savedPositions && Object.keys(savedPositions).length > 0;
      const isNewEmptyPage = ws && !hasSavedPositions && !ws.isDefault;

      let fetchedAssets: AssetNode[];
      if (isNewEmptyPage) {
        // 새 페이지: 빈 캔버스 — 팔레트에서 수동 추가만 가능
        fetchedAssets = [];
      } else if (hasSavedPositions && view === "all") {
        // 저장된 위치가 있는 페이지: 저장된 ID만 캔버스에 배치
        const savedIds = new Set(Object.keys(savedPositions).filter(k => !k.startsWith("ext-")).map(Number));
        fetchedAssets = fetchedAllAssets.filter((a) => savedIds.has(a.id));
      } else if (view === "all") {
        // 기본 페이지 (최초 또는 마이그레이션): 전체 배치
        const seen = new Set<number>();
        fetchedAssets = fetchedAllAssets.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
      } else {
        const connectedAssetIds = new Set<number>();
        fetchedEdges.forEach((e: AssetEdge) => {
          if (e.sourceAssetId) connectedAssetIds.add(e.sourceAssetId);
          if (e.targetAssetId) connectedAssetIds.add(e.targetAssetId);
        });
        fetchedGroups.forEach((g) => {
          (g.assetIds || []).forEach((id) => connectedAssetIds.add(id));
          (g.members || []).forEach((m) => connectedAssetIds.add(m.assetId));
        });

        // Preserve manually placed assets — use ref to avoid stale closure
        const currentPlacedIds = new Set(placedAssetIdsRef.current);
        const placedIds = new Set([...connectedAssetIds, ...currentPlacedIds]);

        fetchedAssets = fetchedAllAssets.filter((a) => placedIds.has(a.id));
      }
      setAssets(fetchedAssets);
      setExternalEntities(fetchedEntities);
      setGroups(fetchedGroups);

      // Helper: get asset IDs from group (handles both API shapes)
      function getGroupAssetIds(group: AssetGroup): number[] {
        if (group.assetIds && group.assetIds.length > 0) return group.assetIds;
        if (group.members && group.members.length > 0) return group.members.map((m) => m.assetId);
        return [];
      }

      // Build group membership lookup: assetId -> group
      const assetGroupMap = new Map<number, AssetGroup>();
      fetchedGroups.forEach((group) => {
        getGroupAssetIds(group).forEach((assetId) => {
          assetGroupMap.set(assetId, group);
        });
      });

      // Create group parent nodes
      const groupNodes: Node[] = fetchedGroups.map((group, gi) => ({
        id: `group-${group.id}`,
        type: "assetGroup",
        position: { x: gi * 560, y: 0 },
        data: {
          label: group.name,
          groupColor: group.color,
        },
        style: {
          width: Math.max(280, getGroupAssetIds(group).length * 240 + 40),
          height: 180,
        },
        draggable: true,
        selectable: false,
      }));

      // Create asset nodes
      const flowNodes: Node[] = fetchedAssets.map((n: AssetNode, i: number) => {
        const parentGroup = assetGroupMap.get(n.id);
        const baseNode: Node = {
          id: String(n.id),
          type: "asset",
          position: { x: (i % 5) * 260, y: Math.floor(i / 5) * 160 },
          data: {
            label: n.name,
            assetType: n.type,
            status: n.status,
            vendor: n.vendor,
            assigneeName: n.assigneeName,
            serviceCategory: n.serviceCategory || null,
            description: n.description || null,
            monthlyCost: n.monthlyCost || null,
            currency: n.currency || null,
            deviceType: n.deviceType || null,
            piiStage: n.piiStage || null,
          },
        };

        if (parentGroup) {
          const memberIds = getGroupAssetIds(parentGroup);
          const memberIdx = memberIds.indexOf(n.id);
          baseNode.parentId = `group-${parentGroup.id}`;
          baseNode.extent = "parent";
          baseNode.position = { x: 20 + (memberIdx >= 0 ? memberIdx : 0) * 230, y: 40 };
        }

        return baseNode;
      });

      // Create external entity nodes — only for entities with saved positions or on default page
      const placedExtIds = hasSavedPositions
        ? new Set(Object.keys(savedPositions!).filter(k => k.startsWith("ext-")).map(k => Number(k.replace("ext-", ""))))
        : null;
      const filteredEntities = isNewEmptyPage
        ? [] // 새 페이지: 빈 캔버스
        : placedExtIds
          ? fetchedEntities.filter(e => placedExtIds.has(e.id)) // 저장된 것만
          : fetchedEntities; // 기본 페이지: 전체

      const entityNodes: Node[] = filteredEntities.map((ent, i) => ({
        id: `ext-${ent.id}`,
        type: "externalEntity",
        position: { x: (fetchedAssets.length % 5 + i) * 260, y: Math.floor((fetchedAssets.length + i) / 5) * 160 },
        data: {
          label: ent.name,
          entityType: ent.type,
          description: ent.description,
          contactInfo: ent.contactInfo,
          isExternalEntity: true,
          trusteeLabel: t.assetMap.trustee,
          partnerLabel: t.assetMap.partner,
          governmentLabel: t.assetMap.government,
          otherLabel: t.assetMap.otherEntity,
        },
      }));

      const rawEdges = data.edges || [];

      const flowEdges: Edge[] = rawEdges.map((e: AssetEdge & { source?: string; target?: string; sourceName?: string; targetName?: string }) => {
        const sourceId = e.source ? String(e.source) : (e.sourceAssetId ? String(e.sourceAssetId) : `ext-${e.sourceExternalId}`);
        const targetId = e.target ? String(e.target) : (e.targetAssetId ? String(e.targetAssetId) : `ext-${e.targetExternalId}`);
        const linkType = e.linkType || "DATA_FLOW";
        const linkColor = LINK_COLORS[linkType] || "#6B7280";

        // Edge style based on link type
        let strokeDasharray: string | undefined;
        if (linkType === "DATA_FLOW") strokeDasharray = "6 3";
        else if (linkType === "DEPENDENCY") strokeDasharray = "3 3";

        const edgeObj: Edge = {
          id: `link-${e.id}`,
          type: "smoothstep",
          source: sourceId,
          target: targetId,
          sourceHandle: e.sourceHandle || "right",
          targetHandle: e.targetHandle || "left",
          style: {
            stroke: linkColor,
            strokeWidth: 2,
            strokeDasharray,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: linkColor, width: 16, height: 16 },
          data: {
            linkId: e.id,
            linkType: linkType,
            direction: e.direction || "UNI",
            dataTypes: e.dataTypes,
            piiItems: e.piiItems,
            protocol: e.protocol,
            legalBasis: e.legalBasis,
            retentionPeriod: e.retentionPeriod,
            destructionMethod: e.destructionMethod,
            label: e.label,
          },
          label: "",
          labelStyle: { fontSize: 0 },
        };

        if (e.direction === "BI") {
          edgeObj.markerStart = { type: MarkerType.ArrowClosed, color: linkColor, width: 16, height: 16 };
        } else if (e.direction === "REVERSE") {
          // Swap: arrow on source side
          edgeObj.markerEnd = undefined;
          edgeObj.markerStart = { type: MarkerType.ArrowClosed, color: linkColor, width: 16, height: 16 };
        } else if (e.direction === "CONDITIONAL") {
          // Dashed + lighter color
          edgeObj.style = {
            ...edgeObj.style,
            strokeDasharray: "4 4",
            strokeWidth: 1.5,
            opacity: 0.7,
          };
        }

        // Build edge label as badge HTML
        const labelParts: string[] = [];
        const displayLabel = e.label || e.linkType;
        if (displayLabel) labelParts.push(displayLabel);
        if (e.protocol) labelParts.push(`(${e.protocol})`);

        // Add PII items summary on edges when in PII view
        if (view === "pii" && e.piiItems) {
          edgeObj.label = e.piiItems;
          edgeObj.labelStyle = { fontSize: 10, fill: linkColor, fontWeight: 600 };
          edgeObj.labelBgStyle = { fill: LINK_BG_COLORS[linkType] || "#F9FAFB", fillOpacity: 0.95 };
          edgeObj.labelBgPadding = [6, 4] as [number, number];
          edgeObj.labelBgBorderRadius = 6;
        } else {
          edgeObj.label = labelParts.join(" ");
          edgeObj.labelStyle = { fontSize: 10, fill: linkColor, fontWeight: 600 };
          edgeObj.labelBgStyle = { fill: LINK_BG_COLORS[linkType] || "#F9FAFB", fillOpacity: 0.95 };
          edgeObj.labelBgPadding = [6, 4] as [number, number];
          edgeObj.labelBgBorderRadius = 6;
        }

        return edgeObj;
      });

      // 같은 노드+방향에 여러 엣지가 몰리면 핸들 자동 분배
      distributeEdgeHandles(flowEdges);

      // 각 노드에 필요한 동적 핸들 ID 주입
      for (const node of [...flowNodes, ...entityNodes]) {
        const handles = collectDynamicHandles(flowEdges, node.id);
        if (handles.length > 0) {
          node.data = { ...node.data, _handles: handles };
        }
      }

      const allNodes = [...groupNodes, ...flowNodes, ...entityNodes];

      // Apply layout based on view type
      if (view === "pii") {
        const piiLayout = getPiiLifecycleLayout(allNodes, flowEdges, t);
        setNodes(piiLayout.nodes);
        setEdges(piiLayout.edges);
      } else {
        const layouted = getLayoutedElements(allNodes, flowEdges);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [view, setNodes, setEdges, t]);

  // Only fetch graph when in canvas view with an active workspace
  useEffect(() => {
    if (currentView === "canvas" && activeWorkspace) {
      fetchGraph();
    }
  }, [currentView, activeWorkspace, fetchGraph]);

  // ── Restore workspace state after graph loads ──
  useEffect(() => {
    if (loading || !activeWorkspace) return;

    const ws = activeWorkspace;
    const positions = ws.nodePositions;
    const sections = ws.sectionData;
    const vp = ws.viewport;

    // Apply saved node positions
    if (positions && Object.keys(positions).length > 0) {
      setNodes((prev) => {
        const updated = prev.map((n) => {
          const saved = positions[n.id];
          if (saved) return { ...n, position: { x: saved.x, y: saved.y } };
          return n;
        });

        // Restore sections
        if (sections && sections.length > 0) {
          for (const sec of sections) {
            const exists = updated.find((n) => n.id === sec.id);
            if (!exists) {
              updated.push({
                id: sec.id,
                type: "section",
                position: { x: sec.x, y: sec.y },
                style: { width: sec.width, height: sec.height },
                data: {
                  sectionName: sec.name,
                  sectionColor: sec.color,
                  sectionDescription: sec.description,
                },
                draggable: true,
              });
            }
            // Re-parent children
            for (const childId of sec.children) {
              const childIdx = updated.findIndex((n) => n.id === childId);
              if (childIdx >= 0) {
                updated[childIdx] = { ...updated[childIdx], parentId: sec.id };
              }
            }
          }
        }

        return updated;
      });
    }

    // Restore viewport
    if (vp) {
      setTimeout(() => {
        reactFlowInstance.setViewport({ x: vp.x, y: vp.y, zoom: vp.zoom });
      }, 200);
    }
  }, [loading, activeWorkspace, setNodes, reactFlowInstance]);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target && params.source !== params.target) {
      setPendingConnection({
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle || undefined,
        targetHandle: params.targetHandle || undefined,
      });
      setShowModal(true);
    }
  }, []);

  const onReconnect = useCallback(
    async (oldEdge: Edge, newConnection: Connection) => {
      // Update the edge visually
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));

      // Update in DB
      const edgeData = oldEdge.data as Record<string, unknown> | undefined;
      const linkId = edgeData?.linkId;
      if (linkId && newConnection.target) {
        try {
          await fetch(`/api/asset-links/${linkId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetAssetId: Number(newConnection.target),
            }),
          });
        } catch {
          // Revert on failure
          fetchGraph();
        }
      }
    },
    [setEdges, fetchGraph]
  );

  // ── 커스텀 onNodesChange: 섹션 자식의 드래그 시 부모 해제 처리 ──
  const onNodesChange = useCallback((changes: import("@xyflow/react").NodeChange[]) => {
    // 먼저 기본 변경 적용
    defaultOnNodesChange(changes);

    // position 변경 중 섹션 자식이 부모 경계를 벗어나면 부모 해제
    const positionChanges = changes.filter(
      (c) => c.type === "position" && c.dragging
    );
    if (positionChanges.length === 0) return;

    setNodes((currentNodes) => {
      let changed = false;
      const result = currentNodes.map((node) => {
        // 섹션 자식이 아니거나 그룹 자식이면 무시
        if (!node.parentId) return node;
        if (String(node.parentId).startsWith("group-")) return node;

        // 이 노드가 드래그 중인지 확인
        const posChange = positionChanges.find((c) => "id" in c && c.id === node.id);
        if (!posChange) return node;

        const parentSection = currentNodes.find((n) => n.id === node.parentId && n.type === "section");
        if (!parentSection) return node;

        const sw = (parentSection.style?.width as number) || 400;
        const sh = (parentSection.style?.height as number) || 300;
        const margin = 20;

        // 부모 경계 밖으로 나갔는지 확인
        if (
          node.position.x < -margin ||
          node.position.y < -margin ||
          node.position.x > sw + margin ||
          node.position.y > sh + margin
        ) {
          changed = true;
          return {
            ...node,
            parentId: undefined,
            extent: undefined,
            position: {
              x: node.position.x + parentSection.position.x,
              y: node.position.y + parentSection.position.y,
            },
          };
        }
        return node;
      });
      return changed ? result : currentNodes;
    });
  }, [defaultOnNodesChange, setNodes]);

  // 드래그 종료: 자유 노드가 섹션 위에 드랍되면 자식으로 편입
  const onNodeDragStop = useCallback((_event: React.MouseEvent, draggedNode: Node) => {
    markDirty(2000); // auto-save after drag
    if (draggedNode.type === "section" || draggedNode.type === "assetGroup") return;
    // assetGroup 자식은 무시
    if (draggedNode.parentId && String(draggedNode.parentId).startsWith("group-")) return;
    // 이미 다른 부모가 있으면 무시
    if (draggedNode.parentId) return;

    const sectionNodes = nodes.filter((n) => n.type === "section");

    // 자유 노드가 섹션 영역 안에 드랍되었는지 확인
    const candidates: { section: Node; area: number }[] = [];
    for (const section of sectionNodes) {
      const sw = (section.style?.width as number) || 400;
      const sh = (section.style?.height as number) || 300;
      const sx = section.position.x;
      const sy = section.position.y;

      if (
        draggedNode.position.x > sx &&
        draggedNode.position.x < sx + sw &&
        draggedNode.position.y > sy &&
        draggedNode.position.y < sy + sh
      ) {
        candidates.push({ section, area: sw * sh });
      }
    }

    if (candidates.length === 0) return;

    // 가장 작은 섹션 선택
    candidates.sort((a, b) => a.area - b.area || sectionNodes.indexOf(b.section) - sectionNodes.indexOf(a.section));
    const winner = candidates[0].section;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === draggedNode.id) {
          return {
            ...n,
            parentId: winner.id,
            extent: undefined,
            position: { x: draggedNode.position.x - winner.position.x, y: draggedNode.position.y - winner.position.y },
          };
        }
        return n;
      })
    );
  }, [nodes, setNodes]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === "assetGroup" || node.type === "piiStageLabel" || node.type === "section") return;
    setSelectedNode({
      id: node.id,
      type: node.type || "asset",
      data: node.data as Record<string, unknown>,
    });
  }, []);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === "section") {
      setEditingSection(node);
    }
  }, []);

  async function handleSaveLink(data: Record<string, unknown>) {
    try {
      // Include handle info from pending connection
      const payload = {
        ...data,
        sourceHandle: pendingConnection?.sourceHandle || "right",
        targetHandle: pendingConnection?.targetHandle || "left",
      };
      const res = await fetch("/api/asset-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "연결 생성에 실패했습니다.");
        return;
      }
        const newLink = await res.json();
        setShowModal(false);

        // Add edge locally without re-fetching (preserves node positions)
        const linkType = (newLink.linkType as string) || "DATA_FLOW";
        const linkColor = LINK_COLORS[linkType] || "#6B7280";
        let strokeDasharray: string | undefined;
        if (linkType === "DATA_FLOW") strokeDasharray = "6 3";
        else if (linkType === "DEPENDENCY") strokeDasharray = "3 3";

        const newEdge: Edge = {
          id: `link-${newLink.id}`,
          type: "smoothstep",
          source: newLink.sourceAssetId ? String(newLink.sourceAssetId) : `ext-${newLink.sourceExternalId}`,
          target: newLink.targetAssetId ? String(newLink.targetAssetId) : `ext-${newLink.targetExternalId}`,
          sourceHandle: newLink.sourceHandle || pendingConnection?.sourceHandle || "right",
          targetHandle: newLink.targetHandle || pendingConnection?.targetHandle || "left",
          style: { stroke: linkColor, strokeWidth: 2, strokeDasharray },
          markerEnd: { type: MarkerType.ArrowClosed, color: linkColor, width: 16, height: 16 },
          data: {
            linkId: newLink.id,
            linkType,
            direction: newLink.direction || "UNI",
            dataTypes: newLink.dataTypes,
            piiItems: newLink.piiItems,
            protocol: newLink.protocol,
            legalBasis: newLink.legalBasis,
            retentionPeriod: newLink.retentionPeriod,
            destructionMethod: newLink.destructionMethod,
            label: newLink.label,
          },
          label: newLink.label || linkType,
          labelStyle: { fontSize: 10, fill: linkColor, fontWeight: 600 },
          labelBgStyle: { fill: LINK_BG_COLORS[linkType] || "#F9FAFB", fillOpacity: 0.95 },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
        };
        setEdges((prev) => {
          const allEdges = [...prev, newEdge];
          distributeEdgeHandles(allEdges);
          setNodes((nds) => nds.map((n) => {
            const handles = collectDynamicHandles(allEdges, n.id);
            if (handles.length > 0) {
              return { ...n, data: { ...n.data, _handles: handles } };
            }
            return n;
          }));
          return allEdges;
        });
        setPendingConnection(null);
    } catch {
      alert("연결 생성 중 오류가 발생했습니다.");
    }
  }

  async function handleDeleteEdge(edgeId: string) {
    const linkId = edgeId.replace("link-", "");
    if (!confirm(t.assetMap.confirmDelete)) return;
    try {
      await fetch(`/api/asset-links/${linkId}`, { method: "DELETE" });
      fetchGraph();
    } catch {
      // silently fail
    }
  }

  function handleAutoLayout() {
    if (view === "pii") {
      const piiLayout = getPiiLifecycleLayout(nodes, edges, t);
      setNodes(piiLayout.nodes);
      setEdges(piiLayout.edges);
    } else {
      const layouted = getLayoutedElements(nodes, edges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    }
  }

  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    const viewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewport) return;
    setExporting(true);
    try {
      // ── 1. 전체 노드 바운드 계산 (섹션 포함) ──
      const contentNodes = nodes.filter((n) => n.type !== "section");
      if (contentNodes.length === 0) { setExporting(false); return; }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      // 모든 노드(섹션 포함)로 바운드 계산 → 섹션 영역이 잘리지 않음
      for (const n of nodes) {
        const w = (n.style?.width as number) || (n.measured?.width ?? 200);
        const h = (n.style?.height as number) || (n.measured?.height ?? 100);
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
      }
      const padding = 80;
      const imgW = (maxX - minX) + padding * 2;
      const imgH = (maxY - minY) + padding * 2;
      const vpX = (-minX + padding) * 1;
      const vpY = (-minY + padding) * 1;

      // ── 2. 전체 캔버스를 PNG로 캡처 ──
      const dataUrl = await toPng(viewport, {
        width: imgW,
        height: imgH,
        style: {
          width: `${imgW}px`,
          height: `${imgH}px`,
          transform: `translate(${vpX}px, ${vpY}px) scale(1)`,
        },
        backgroundColor: "#ffffff",
      });

      // ── 3. 이미지를 canvas에 로드 ──
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new window.Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });

      // A3 가로 비율 기준 타일 크기 (PDF 페이지에 맞게)
      const A3_RATIO = 297 / 420; // height/width
      const TILE_W = 1400; // 타일 너비 (px) — 충분한 해상도
      const TILE_H = Math.round(TILE_W * A3_RATIO);

      // 1페이지에 맞는지 확인
      const fitsOnOnePage = imgW <= TILE_W * 1.2 && imgH <= TILE_H * 1.2;

      if (fitsOnOnePage) {
        // ── 단일 페이지: 이미지 그대로 전송 ──
        const res = await fetch("/api/asset-map/export-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overview: dataUrl,
            tiles: [{ image: dataUrl, col: 0, row: 0, x: 0, y: 0, w: imgW, h: imgH }],
            title: t.assetMap.title,
            totalCols: 1,
            totalRows: 1,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || "PDF 생성에 실패했습니다.");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `AssetMap_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // ── 4. 다중 페이지: 노드 인식 타일 분할 ──
      // OVERLAP: 경계에서 노드가 잘리지 않도록 각 타일에 여백 추가
      const OVERLAP = 250; // px — 가장 큰 노드(~200px) 커버
      const cols = Math.ceil(imgW / TILE_W);
      const rows = Math.ceil(imgH / TILE_H);

      // overview 이미지 생성 (축소)
      const overviewCanvas = document.createElement("canvas");
      const overviewMaxW = 2400;
      const overviewScale = Math.min(overviewMaxW / imgW, 1);
      overviewCanvas.width = Math.round(imgW * overviewScale);
      overviewCanvas.height = Math.round(imgH * overviewScale);
      const overviewCtx = overviewCanvas.getContext("2d")!;
      overviewCtx.fillStyle = "#ffffff";
      overviewCtx.fillRect(0, 0, overviewCanvas.width, overviewCanvas.height);
      overviewCtx.drawImage(img, 0, 0, overviewCanvas.width, overviewCanvas.height);
      const overviewDataUrl = overviewCanvas.toDataURL("image/png");

      // 타일별로 크롭 + 빈 타일 감지
      interface TilePayload {
        image: string;
        col: number;
        row: number;
        x: number;
        y: number;
        w: number;
        h: number;
      }
      const tiles: TilePayload[] = [];
      const tileCanvas = document.createElement("canvas");
      const tileCtx = tileCanvas.getContext("2d")!;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // overlap을 포함한 확장 영역 계산
          const sx = Math.max(0, col * TILE_W - OVERLAP);
          const sy = Math.max(0, row * TILE_H - OVERLAP);
          const ex = Math.min(imgW, (col + 1) * TILE_W + OVERLAP);
          const ey = Math.min(imgH, (row + 1) * TILE_H + OVERLAP);
          const sw = ex - sx;
          const sh = ey - sy;
          if (sw <= 0 || sh <= 0) continue;

          tileCanvas.width = sw;
          tileCanvas.height = sh;
          tileCtx.fillStyle = "#ffffff";
          tileCtx.fillRect(0, 0, sw, sh);
          tileCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

          // 빈 타일 감지: 픽셀 샘플링 (전수 검사 대신 격자 샘플)
          const imageData = tileCtx.getImageData(0, 0, sw, sh);
          const pixels = imageData.data;
          let hasContent = false;
          const step = Math.max(4, Math.floor(pixels.length / (4 * 500))); // ~500개 샘플
          for (let i = 0; i < pixels.length; i += step * 4) {
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            // 순수 흰색(255,255,255)이 아닌 픽셀이 있으면 콘텐츠 있음
            if (r < 250 || g < 250 || b < 250) {
              hasContent = true;
              break;
            }
          }
          if (!hasContent) continue; // 빈 타일 건너뛰기

          tiles.push({
            image: tileCanvas.toDataURL("image/png"),
            col, row, x: sx, y: sy, w: sw, h: sh,
          });
        }
      }

      if (tiles.length === 0) {
        // 모든 타일이 빈 경우 (있을 수 없지만 안전장치)
        tiles.push({
          image: overviewDataUrl,
          col: 0, row: 0, x: 0, y: 0, w: imgW, h: imgH,
        });
      }

      // ── 5. 서버에 전송 ──
      const res = await fetch("/api/asset-map/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overview: overviewDataUrl,
          tiles,
          title: t.assetMap.title,
          totalCols: cols,
          totalRows: rows,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "PDF 생성에 실패했습니다.");
        return;
      }

      // ── 6. 다운로드 ──
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AssetMap_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF export error:", e);
      alert("PDF 내보내기 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  }

  function handleAddSection(name: string, color: string, description: string, width: number, height: number) {
    const id = `section-${Date.now()}-${sectionCounter}`;
    setSectionCounter((c) => c + 1);
    const newSection: Node = {
      id,
      type: "section",
      position: { x: 100 + sectionCounter * 50, y: 100 + sectionCounter * 50 },
      data: { label: name, sectionColor: color, description },
      style: { width, height, zIndex: -1 },
      draggable: true,
      selectable: true,
    };
    setNodes((prev) => [newSection, ...prev]); // sections behind other nodes
    setShowSectionModal(false);
  }

  // placedAssetIds — which assets are currently on canvas
  const placedAssetIds = useMemo(() => {
    const ids = new Set(nodes.filter((n) => n.type === "asset").map((n) => Number(n.id)));
    placedAssetIdsRef.current = ids;
    return ids;
  }, [nodes]);

  // Add asset from palette to canvas
  function handleAddAssetToCanvas(asset: AssetNode) {
    const existingIds = new Set(nodes.map((n) => n.id));
    if (existingIds.has(String(asset.id))) return; // already on canvas

    const colors = ASSET_COLORS[asset.type] || ASSET_COLORS.OTHER;
    const newNode: Node = {
      id: String(asset.id),
      type: "asset",
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: {
        label: asset.name,
        assetType: asset.type,
        status: asset.status,
        vendor: asset.vendor,
        assigneeName: asset.assigneeName,
        serviceCategory: asset.serviceCategory || null,
        description: asset.description || null,
        monthlyCost: asset.monthlyCost || null,
        currency: asset.currency || null,
        deviceType: asset.deviceType || null,
        piiStage: asset.piiStage || null,
      },
    };
    setNodes((prev) => [...prev, newNode]);
    setAssets((prev) => [...prev, asset]);
    markDirty(2000);
  }

  function handleAddEntityToCanvas(entity: ExternalEntity) {
    const nodeId = `ext-${entity.id}`;
    if (nodes.some((n) => n.id === nodeId)) return;

    const newNode: Node = {
      id: nodeId,
      type: "externalEntity",
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: {
        label: entity.name,
        entityType: entity.type,
        description: entity.description,
        contactInfo: entity.contactInfo,
        isExternalEntity: true,
        trusteeLabel: t.assetMap.trustee,
        partnerLabel: t.assetMap.partner,
        governmentLabel: t.assetMap.government,
        otherLabel: t.assetMap.otherEntity,
      },
    };
    setNodes((prev) => [...prev, newNode]);
    markDirty(2000);
  }

  function handleRemoveEntityFromCanvas(entityId: number) {
    const nodeId = `ext-${entityId}`;
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    markDirty(2000);
  }

  // Save current view positions
  async function handleSaveView(name: string) {
    const nodePositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node) => {
      if (node.type !== "piiStageLabel") {
        nodePositions[node.id] = { x: node.position.x, y: node.position.y };
      }
    });

    try {
      const res = await fetch("/api/asset-map/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nodePositions }),
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedViews((prev) => [...prev, saved]);
        setShowSaveViewModal(false);
      }
    } catch {
      // silently fail
    }
  }

  // Load a saved view by applying nodePositions
  // 캔버스가 비어있으면 fetchGraph로 노드를 다시 로드한 후 위치 적용
  async function handleLoadView(savedView: SavedView) {
    const positions: Record<string, { x: number; y: number }> =
      typeof savedView.nodePositions === "string"
        ? JSON.parse(savedView.nodePositions)
        : savedView.nodePositions ?? {};

    const positionKeys = Object.keys(positions);
    if (positionKeys.length === 0) return;

    // 캔버스에 노드가 없으면 먼저 데이터를 다시 로드
    const assetNodes = nodes.filter((n) => n.type === "asset" || n.type === "externalEntity");
    if (assetNodes.length === 0) {
      await fetchGraph();
    }

    // 위치 적용 (fetchGraph 후 state 업데이트가 반영된 후 실행)
    setTimeout(() => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const savedPos = positions[node.id];
          if (savedPos) {
            return { ...node, position: { x: savedPos.x, y: savedPos.y } };
          }
          return node;
        })
      );
    }, 100);
  }

  // ── Relative time helper ──
  function formatRelativeTime(dateStr?: string) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금 전";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    const months = Math.floor(days / 30);
    return `${months}개월 전`;
  }

  // ── Back to gallery handler ──
  const handleBackToGallery = useCallback(async () => {
    if (dirtyRef.current) await flushSave();
    setCurrentView("gallery");
    setActiveWorkspace(null);
  }, [flushSave]);

  const viewTabs: { key: ViewType; label: string }[] = [
    { key: "all", label: t.assetMap.viewAll },
    { key: "pii", label: t.assetMap.viewPii },
    { key: "network", label: t.assetMap.viewNetwork },
    { key: "data_flow", label: t.assetMap.viewDataFlow },
  ];

  // ── Onboarding: create example page ──
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const showOnboarding = !onboardingDismissed && workspaces.length <= 1 && folders.length === 0;

  const createExamplePage = useCallback(async () => {
    try {
      // 예시 페이지 생성
      const res = await fetch("/api/asset-map/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "📋 예시: 인프라 구성도",
          viewType: "ALL",
          description: "자산지도 사용법을 이해하기 위한 예시 페이지입니다. 자유롭게 수정하거나 삭제하세요.",
        }),
      });
      if (res.ok) {
        const page = await res.json();
        setWorkspaces(prev => [page, ...prev]);
        setOnboardingDismissed(true);
        loadWorkspace(page);
      }
    } catch { /* silent */ }
  }, [loadWorkspace]);

  // ═══════════════════════════════════════════════════════════════════════
  // ── Gallery View ──
  // ═══════════════════════════════════════════════════════════════════════
  if (currentView === "gallery") {
    // Collect folder IDs from server-side folders
    const folderPageIds = new Set(folders.flatMap(f => f.pages.map(p => p.id)));
    // Root pages: not shared from others, and not inside any folder
    const myRootWorkspaces = workspaces.filter(w =>
      (!w.isShared || w.createdBy === undefined) && !w.folderId && !folderPageIds.has(w.id)
    );
    const sharedWorkspaces = workspaces.filter(w => w.isShared && w.createdBy !== undefined);

    // Helper: render a page card (reused for root and folder children)
    const renderPageCard = (ws: SavedView, compact?: boolean) => (
      <div
        key={ws.id}
        className={`group relative bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all overflow-hidden${compact ? " scale-[0.97] origin-top" : ""}`}
        onClick={() => loadWorkspace(ws)}
        onContextMenu={(e) => { e.preventDefault(); setWsContextMenu({ id: ws.id, x: e.clientX, y: e.clientY }); }}
      >
        {/* 도면 미리보기 영역 */}
        <div className={`${compact ? "h-16" : "h-24"} bg-gradient-to-br from-gray-50 to-gray-100 relative border-b border-gray-100`}>
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id={`grid-${ws.id}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#94a3b8" strokeWidth="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill={`url(#grid-${ws.id})`} />
          </svg>
          <div className="absolute top-4 left-5 w-8 h-5 rounded border border-blue-200 bg-blue-50/80" />
          <div className="absolute top-3 right-8 w-10 h-5 rounded border border-emerald-200 bg-emerald-50/80" />
          {!compact && <div className="absolute bottom-3 left-12 w-7 h-5 rounded border border-purple-200 bg-purple-50/80" />}
          {!compact && <div className="absolute top-6 left-16 w-12 h-[1px] bg-gray-300" />}
          {ws.isDefault && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-100 rounded-full px-1.5 py-0.5">
              <Star className="h-3 w-3 text-amber-500" />
              <span className="text-[9px] font-semibold text-amber-700">기본</span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setWsContextMenu({ id: ws.id, x: e.clientX, y: e.clientY }); }}
            className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center bg-white/70 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-700 hover:bg-white transition"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-3 py-2.5">
          {editingWsName === ws.id ? (
            <input
              autoFocus
              defaultValue={ws.name}
              className="w-full text-sm font-medium bg-white border border-blue-300 rounded px-2 py-1 mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onBlur={(e) => { renameWorkspace(ws.id, e.target.value); setEditingWsName(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { renameWorkspace(ws.id, (e.target as HTMLInputElement).value); setEditingWsName(null); }
                if (e.key === "Escape") setEditingWsName(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className="text-sm font-medium text-gray-900 truncate">{ws.name}</h3>
          )}
          <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
            {ws.isShared && <Share2 className="h-3 w-3 text-blue-400" />}
            <span>{formatRelativeTime(ws.lastAccessedAt)}</span>
          </div>
        </div>
      </div>
    );

    return (
      <div className="h-[calc(100vh-64px)] relative flex flex-col bg-gray-50">
        {/* Gallery Header */}
        <div className="flex items-center justify-between border-b bg-white px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{t.assetMap.title}</h1>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
              {t.assetMap.alpha}
            </span>
          </div>
        </div>

        {/* Gallery Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Onboarding Banner */}
          {showOnboarding && (
            <div className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">자산 지도를 시작해 보세요</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    자산 지도는 조직의 IT 자산 간 연결 관계를 시각화하는 도면입니다.<br/>
                    예시 페이지를 열어 사용법을 확인하거나, 빈 페이지에서 직접 구성할 수 있습니다.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={createExamplePage}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition"
                    >
                      예시 페이지로 시작하기
                    </button>
                    <button
                      onClick={() => setOnboardingDismissed(true)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                      건너뛰기
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setOnboardingDismissed(true)}
                  className="text-gray-400 hover:text-gray-600 ml-4"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* My Workspaces Section Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">{t.assetMap.myWorkspaces}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                {"새 폴더"}
              </button>
              <button
                onClick={() => setShowNewWsModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.assetMap.newWorkspace}
              </button>
            </div>
          </div>

          {/* Grid: Root pages + Folders + New cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-4">
            {/* Root page cards */}
            {myRootWorkspaces.map((ws) => renderPageCard(ws))}

            {/* Folder cards */}
            {folders.map((folder) => {
              const isExpanded = expandedFolders.has(folder.id);
              return (
                <div
                  key={`folder-${folder.id}`}
                  className="group relative bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-amber-300 transition-all overflow-hidden cursor-pointer"
                  onClick={() => toggleFolder(folder.id)}
                  onContextMenu={(e) => { e.preventDefault(); setFolderContextMenu({ id: folder.id, x: e.clientX, y: e.clientY }); }}
                >
                  {/* Folder preview area */}
                  <div className="h-24 relative border-b border-gray-100" style={{ background: `linear-gradient(135deg, ${folder.color}15, ${folder.color}08)` }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isExpanded ? (
                        <FolderOpen className="h-12 w-12 opacity-20" style={{ color: folder.color }} />
                      ) : (
                        <Folder className="h-12 w-12 opacity-20" style={{ color: folder.color }} />
                      )}
                    </div>
                    {/* Page count badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full px-1.5 py-0.5" style={{ backgroundColor: `${folder.color}20` }}>
                      <FileText className="h-3 w-3" style={{ color: folder.color }} />
                      <span className="text-[9px] font-semibold" style={{ color: folder.color }}>{folder.pages.length}</span>
                    </div>
                    {/* Expand indicator */}
                    <div className="absolute bottom-2 right-2">
                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                    {/* Context menu button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setFolderContextMenu({ id: folder.id, x: e.clientX, y: e.clientY }); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center bg-white/70 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-700 hover:bg-white transition"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Folder name */}
                  <div className="px-3 py-2.5">
                    {editingFolderName === folder.id ? (
                      <input
                        autoFocus
                        defaultValue={folder.name}
                        className="w-full text-sm font-medium bg-white border border-blue-300 rounded px-2 py-1 mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onBlur={(e) => { renameFolder(folder.id, e.target.value); setEditingFolderName(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { renameFolder(folder.id, (e.target as HTMLInputElement).value); setEditingFolderName(null); }
                          if (e.key === "Escape") setEditingFolderName(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                        <Folder className="h-3.5 w-3.5 flex-shrink-0" style={{ color: folder.color }} />
                        {folder.name}
                      </h3>
                    )}
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {folder.pages.length > 0 ? `${folder.pages.length}개 페이지` : "비어있음"}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* "+ New Page" card */}
            <div
              className="bg-white rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center overflow-hidden"
              onClick={() => setShowNewWsModal(true)}
              style={{ minHeight: "152px" }}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <Plus className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-xs font-medium text-gray-500">{t.assetMap.newWorkspace}</span>
            </div>

            {/* "+ New Folder" card */}
            <div
              className="bg-white rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all flex flex-col items-center justify-center overflow-hidden"
              onClick={() => setShowNewFolderModal(true)}
              style={{ minHeight: "152px" }}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <FolderPlus className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-xs font-medium text-gray-500">{"새 폴더"}</span>
            </div>
          </div>

          {/* Expanded folder children — shown below the grid */}
          {folders.map((folder) => {
            if (!expandedFolders.has(folder.id) || folder.pages.length === 0) return null;
            return (
              <div key={`folder-children-${folder.id}`} className="mb-6">
                <div className="flex items-center gap-2 mb-3 pl-2">
                  <Folder className="h-4 w-4" style={{ color: folder.color }} />
                  <span className="text-xs font-semibold text-gray-600">{folder.name}</span>
                  <span className="text-[10px] text-gray-400">({folder.pages.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pl-4 border-l-2 ml-2" style={{ borderColor: `${folder.color}40` }}>
                  {folder.pages.map((page) => {
                    // Use the workspace data if available (has full info), otherwise use folder page data
                    const fullWs = workspaces.find(w => w.id === page.id) || page;
                    return renderPageCard(fullWs, true);
                  })}
                </div>
              </div>
            );
          })}

          {/* Shared Workspaces Section */}
          {sharedWorkspaces.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">{t.assetMap.sharedWorkspaces}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {sharedWorkspaces.map((ws) => (
                  <div
                    key={`shared-${ws.id}`}
                    className="group relative bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all overflow-hidden"
                    onClick={() => loadWorkspace(ws)}
                  >
                    <div className="h-24 bg-gradient-to-br from-blue-50 to-gray-100 relative border-b border-gray-100">
                      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                        <defs><pattern id={`grid-s-${ws.id}`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#94a3b8" strokeWidth="0.5"/></pattern></defs>
                        <rect width="100%" height="100%" fill={`url(#grid-s-${ws.id})`} />
                      </svg>
                      <div className="absolute top-4 left-5 w-8 h-5 rounded border border-blue-200 bg-blue-50/80" />
                      <div className="absolute top-3 right-8 w-10 h-5 rounded border border-emerald-200 bg-emerald-50/80" />
                      <div className="absolute bottom-3 left-12 w-7 h-5 rounded border border-purple-200 bg-purple-50/80" />
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-100 rounded-full px-1.5 py-0.5">
                        <Share2 className="h-3 w-3 text-blue-500" />
                        <span className="text-[9px] font-semibold text-blue-700">{t.assetMap.shareWorkspace}</span>
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{ws.name}</h3>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        <span>{formatRelativeTime(ws.lastAccessedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Workspace Context Menu (with "Move to folder" submenu) */}
        {wsContextMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setWsContextMenu(null)} />
            <div
              className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
              style={{ left: wsContextMenu.x, top: wsContextMenu.y }}
            >
              <button onClick={() => { setEditingWsName(wsContextMenu.id); setWsContextMenu(null); }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                <Pencil className="h-3 w-3" />{t.assetMap.renameWorkspace}
              </button>
              <button onClick={() => { duplicateWorkspace(wsContextMenu.id); setWsContextMenu(null); }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                <Copy className="h-3 w-3" />{t.assetMap.duplicateWorkspace}
              </button>
              <button onClick={() => { toggleShareWorkspace(wsContextMenu.id); setWsContextMenu(null); }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                <Share2 className="h-3 w-3" />{t.assetMap.shareWorkspace}
              </button>
              {/* Move to folder submenu */}
              {folders.length > 0 && (
                <>
                  <hr className="my-1 border-gray-100" />
                  <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase">{"폴더로 이동"}</div>
                  {(() => {
                    const currentWs = workspaces.find(w => w.id === wsContextMenu.id);
                    const currentFolderId = currentWs?.folderId ?? null;
                    return (
                      <>
                        {currentFolderId !== null && (
                          <button onClick={() => { movePageToFolder(wsContextMenu.id, null); setWsContextMenu(null); }}
                            className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                            <MoveRight className="h-3 w-3" />{"루트 (폴더 없음)"}
                          </button>
                        )}
                        {folders.filter(f => f.id !== currentFolderId).map(f => (
                          <button key={f.id} onClick={() => { movePageToFolder(wsContextMenu.id, f.id); setWsContextMenu(null); }}
                            className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                            <Folder className="h-3 w-3" style={{ color: f.color }} />{f.name}
                          </button>
                        ))}
                      </>
                    );
                  })()}
                </>
              )}
              <hr className="my-1 border-gray-100" />
              {workspaces.find(w => w.id === wsContextMenu.id)?.isDefault ? (
                <div className="px-3 py-1.5 text-xs text-gray-400 flex items-center gap-2">
                  <Trash2 className="h-3 w-3" />{t.assetMap.cannotDeleteDefault}
                </div>
              ) : (
                <button onClick={() => { if (confirm(t.assetMap.deleteWorkspaceConfirm)) { deleteWorkspace(wsContextMenu.id); } setWsContextMenu(null); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 className="h-3 w-3" />{t.assetMap.deleteWorkspace}
                </button>
              )}
            </div>
          </>
        )}

        {/* Folder Context Menu */}
        {folderContextMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setFolderContextMenu(null)} />
            <div
              className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
              style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
            >
              <button onClick={() => { setEditingFolderName(folderContextMenu.id); setFolderContextMenu(null); }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                <Pencil className="h-3 w-3" />{"이름 변경"}
              </button>
              <hr className="my-1 border-gray-100" />
              <button onClick={() => { if (confirm("폴더를 삭제하시겠습니까? 하위 페이지는 루트로 이동됩니다.")) { deleteFolder(folderContextMenu.id); } setFolderContextMenu(null); }}
                className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                <Trash2 className="h-3 w-3" />{"폴더 삭제"}
              </button>
            </div>
          </>
        )}

        {/* New Workspace Modal */}
        {showNewWsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewWsModal(false)}>
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">{t.assetMap.newWorkspace}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem("wsName") as HTMLInputElement;
                  const name = input.value.trim();
                  if (name) {
                    createWorkspace(name);
                    setShowNewWsModal(false);
                  }
                }}
              >
                <input
                  name="wsName"
                  autoFocus
                  placeholder={t.assetMap.workspaceName}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowNewWsModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {t.common.create}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Folder Modal */}
        {showNewFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewFolderModal(false)}>
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-amber-500" />
                {"새 폴더"}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem("folderName") as HTMLInputElement;
                  const name = input.value.trim();
                  if (name) {
                    createFolder(name);
                    setShowNewFolderModal(false);
                  }
                }}
              >
                <input
                  name="folderName"
                  autoFocus
                  placeholder={"폴더 이름을 입력하세요"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    {t.common.create}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ── Canvas View (below) ──
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="h-[calc(100vh-64px)] relative flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Back to gallery button */}
          <button
            onClick={handleBackToGallery}
            className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
            title={t.assetMap.workspace}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <h1 className="text-lg font-bold truncate max-w-[200px]">{activeWorkspace?.name || t.assetMap.title}</h1>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
            {t.assetMap.alpha}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* View tabs */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {viewTabs.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  view === v.key ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Asset Palette toggle */}
          <button
            onClick={() => setShowAssetPalette(!showAssetPalette)}
            className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              showAssetPalette ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            자산 팔레트
          </button>

          {/* External Entity Palette toggle */}
          <button
            onClick={() => setShowEntityPalette(!showEntityPalette)}
            className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              showEntityPalette ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            {t.assetMap.externalEntity}
          </button>

          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-xs px-2">
            {saveStatus === "saved" && (
              <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600">{t.assetMap.autoSaved}</span></>
            )}
            {saveStatus === "saving" && (
              <><Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" /><span className="text-blue-600">{t.assetMap.saving}</span></>
            )}
            {saveStatus === "dirty" && (
              <><AlertCircle className="h-3.5 w-3.5 text-amber-500" /><span className="text-amber-600">{t.assetMap.unsavedChanges}</span></>
            )}
          </div>

          <button
            onClick={() => setShowSectionModal(true)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="inline h-3.5 w-3.5 mr-1" />
            섹션
          </button>
          <button onClick={handleAutoLayout} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            <LayoutGrid className="inline h-3.5 w-3.5 mr-1" />
            {t.assetMap.autoLayout}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="inline h-3.5 w-3.5 mr-1" />
            {exporting ? t.assetMap.exporting : t.assetMap.exportPdf}
          </button>
          <button onClick={() => setShowModal(true)} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
            <Plus className="inline h-3.5 w-3.5 mr-1" />
            {t.assetMap.addLink}
          </button>
        </div>
      </div>

      {/* Body: Palette + ReactFlow */}
      <div className="flex flex-1 overflow-hidden">
        {/* Asset Palette (toggled from header) */}
        {showAssetPalette && (
          <AssetPalette
            allAssets={allAssets}
            placedAssetIds={placedAssetIds}
            onAddToCanvas={handleAddAssetToCanvas}
            onRemoveFromCanvas={(assetId: number) => {
              setNodes((prev) => prev.filter((n) => n.id !== String(assetId)));
              setEdges((prev) => prev.filter((e) => e.source !== String(assetId) && e.target !== String(assetId)));
              markDirty(2000);
            }}
            t={t}
          />
        )}

        {/* External Entity Palette (toggled from header) */}
        {showEntityPalette && (
          <div className="w-56 border-r border-gray-200 bg-white flex flex-col flex-shrink-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-700">{t.assetMap.externalEntity}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {externalEntities.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-gray-400">외부 조직이 없습니다</div>
              ) : (
                externalEntities.map((ent) => {
                  const isPlaced = nodes.some((n) => n.id === `ext-${ent.id}`);
                  const typeLabel = { TRUSTEE: t.assetMap.trustee, PARTNER: t.assetMap.partner, GOVERNMENT: t.assetMap.government, OTHER: t.assetMap.otherEntity }[ent.type] || ent.type;
                  return (
                    <button
                      key={ent.id}
                      onClick={() => isPlaced ? handleRemoveEntityFromCanvas(ent.id) : handleAddEntityToCanvas(ent)}
                      className={`w-full px-3 py-2 flex items-center gap-2.5 border-b border-gray-50 transition-colors text-left group ${
                        isPlaced ? "bg-green-50/50 hover:bg-red-50" : "hover:bg-blue-50"
                      }`}
                    >
                      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 bg-gray-100">
                        <Building2 className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-800 truncate">{ent.name}</div>
                        <div className="text-[10px] text-gray-400">{typeLabel}</div>
                      </div>
                      {isPlaced ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 group-hover:hidden" />
                          <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 hidden group-hover:block" />
                        </>
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

      {/* ReactFlow */}
      <div className={`flex-1 relative transition-all ${selectedNode ? "pr-80" : ""}`}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            edgesReconnectable={true}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeDragStop={onNodeDragStop}
            onEdgeDoubleClick={(_e, edge) => setSelectedEdge(edge)}
            onMoveEnd={onMoveEnd}
            nodeTypes={nodeTypes}
            snapToGrid={true}
            snapGrid={[20, 20]}
            connectionRadius={40}
            connectionMode={"loose" as never}
            selectionOnDrag={true}
            selectionMode={SelectionMode.Partial}
            panOnDrag={[2]}
            panOnScroll={true}
            minZoom={0.05}
            maxZoom={20}
            fitView={!activeWorkspace?.viewport}
            attributionPosition="bottom-left"
          >
            <Controls />
            <Background variant={BackgroundVariant.Lines} gap={20} color="#f0f0f0" />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "externalEntity") {
                  const entityType = (node.data?.entityType as string) || "OTHER";
                  return EXTERNAL_ENTITY_COLORS[entityType]?.border || "#6B7280";
                }
                if (node.type === "assetGroup") {
                  return (node.data?.groupColor as string) || "#E5E7EB";
                }
                if (node.type === "piiStageLabel") {
                  return "#6366F1";
                }
                if (node.type === "section") {
                  return (node.data?.sectionColor as string) || "#3B82F6";
                }
                const type = (node.data?.assetType as string) || "OTHER";
                return ASSET_COLORS[type]?.border || "#6B7280";
              }}
              style={{ height: 160 }}
              pannable
              zoomable
              position="bottom-right"
            />
            <Panel position="bottom-center">
              <div className="rounded-lg border bg-white/90 px-3 py-1.5 text-xs text-gray-500 backdrop-blur">
                드래그: 범위 선택 | 우클릭 드래그: 이동 | 핸들 드래그: 연결 추가 | 엣지 더블클릭: 상세
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>

      </div> {/* End Body flex */}

      {/* Side Panel */}
      {selectedNode && (
        <SidePanel
          node={selectedNode}
          edges={edges}
          nodes={nodes}
          onClose={() => setSelectedNode(null)}
          onAddLink={(sourceId: string) => {
            setPendingConnection({ source: sourceId, target: "" });
            setShowModal(true);
          }}
          onDeleteLink={handleDeleteEdge}
          t={t}
        />
      )}

      {/* Link Modal */}
      {showModal && (
        <LinkModal
          assets={assets}
          externalEntities={externalEntities}
          onSave={handleSaveLink}
          onClose={() => { setShowModal(false); setPendingConnection(null); }}
          initialSource={pendingConnection?.source}
          initialTarget={pendingConnection?.target}
          t={t}
        />
      )}

      {/* Save View Modal */}
      {showSaveViewModal && (
        <SaveViewModal
          onSave={handleSaveView}
          onClose={() => setShowSaveViewModal(false)}
          t={t}
        />
      )}

      {/* Section Modal */}
      {showSectionModal && (
        <SectionModal
          onSave={handleAddSection}
          onClose={() => setShowSectionModal(false)}
        />
      )}

      {/* Section Edit Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingSection(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">섹션 편집</h3>
              <button onClick={() => setEditingSection(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  defaultValue={(editingSection.data?.label as string) || ""}
                  onBlur={(e) => {
                    const newName = e.target.value.trim();
                    if (newName) {
                      setNodes((nds) => nds.map((n) =>
                        n.id === editingSection.id ? { ...n, data: { ...n.data, label: newName } } : n
                      ));
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input
                  defaultValue={(editingSection.data?.description as string) || ""}
                  onBlur={(e) => {
                    setNodes((nds) => nds.map((n) =>
                      n.id === editingSection.id ? { ...n, data: { ...n.data, description: e.target.value.trim() } } : n
                    ));
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
                <div className="flex flex-wrap gap-2">
                  {SECTION_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setNodes((nds) => nds.map((n) =>
                          n.id === editingSection.id ? { ...n, data: { ...n.data, sectionColor: c.value } } : n
                        ));
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition ${
                        (editingSection.data?.sectionColor as string) === c.value ? "border-gray-900 scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t flex gap-2">
              <button
                onClick={() => setEditingSection(null)}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  // Release children first
                  const childIds = nodes.filter((n) => n.parentId === editingSection.id).map((n) => n.id);
                  setNodes((nds) => nds.map((n) => {
                    if (childIds.includes(n.id)) {
                      return {
                        ...n,
                        parentId: undefined,
                        extent: undefined,
                        position: {
                          x: n.position.x + editingSection.position.x,
                          y: n.position.y + editingSection.position.y,
                        },
                      };
                    }
                    return n;
                  }).filter((n) => n.id !== editingSection.id));
                  setEditingSection(null);
                }}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edge Detail Modal */}
      {selectedEdge && (
        <EdgeDetailModal
          edge={selectedEdge}
          nodes={nodes}
          assets={assets}
          onDelete={() => {
            handleDeleteEdge(selectedEdge.id);
            setSelectedEdge(null);
          }}
          onEdit={(sourceId: string, targetId: string) => {
            setPendingConnection({ source: sourceId, target: targetId });
            setShowModal(true);
          }}
          onClose={() => setSelectedEdge(null)}
          t={t}
        />
      )}
    </div>
  );
}

// ── Wrapper with ReactFlowProvider ──
export default function AssetMapContent() {
  return (
    <ReactFlowProvider>
      <AssetMapContentInner />
    </ReactFlowProvider>
  );
}
