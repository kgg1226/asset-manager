"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
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
};

type AssetEdge = {
  id: number;
  sourceAssetId: number;
  targetAssetId: number;
  linkType: string;
  direction: string;
  label: string | null;
  dataTypes: string | null;
  piiItems: string | null;
  protocol: string | null;
  legalBasis: string | null;
  retentionPeriod: string | null;
  destructionMethod: string | null;
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

type SavedView = {
  id: number;
  name: string;
  nodePositions: Record<string, { x: number; y: number }>;
};

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

function AssetNodeComponent({ data }: { data: Record<string, unknown> }) {
  const type = (data.assetType as string) || "OTHER";
  const status = (data.status as string) || "IN_STOCK";
  const deviceType = (data.deviceType as string) || null;
  const colors = ASSET_COLORS[type] || ASSET_COLORS.OTHER;
  const cost = data.monthlyCost as number | null;
  const currency = data.currency as string | null;
  const assignee = data.assigneeName as string | null;
  const costStr = formatCost(cost, currency);

  return (
    <div
      className="rounded-xl border-2 px-4 py-3 min-w-[200px] relative"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        boxShadow: `0 2px 8px ${colors.border}20, 0 1px 3px rgba(0,0,0,0.06)`,
      }}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !border-2 !border-white !rounded-full"
        style={{ backgroundColor: colors.border }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !border-2 !border-white !rounded-full"
        style={{ backgroundColor: colors.border }}
      />

      {/* Icon centered above name */}
      <div className="flex flex-col items-center gap-1.5">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: colors.light }}
        >
          <AssetIcon type={type} color={colors.icon} size="w-6 h-6" deviceType={deviceType} />
        </div>

        {/* Name */}
        <div className="text-sm font-semibold text-gray-900 truncate max-w-[180px] text-center">
          {data.label as string}
        </div>

        {/* Status + Type row */}
        <div className="flex items-center gap-1.5">
          <StatusDot status={status} />
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            {type.replace("_", " ")}
          </span>
        </div>

        {/* Assignee */}
        {assignee && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[140px]">{assignee}</span>
          </div>
        )}

        {/* Cost */}
        {costStr && (
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

  return (
    <div
      className="rounded-xl border-2 border-dashed px-4 py-3 min-w-[200px] relative"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        boxShadow: `0 2px 8px ${colors.border}15, 0 1px 3px rgba(0,0,0,0.04)`,
      }}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !border-2 !border-white !rounded-full"
        style={{ backgroundColor: colors.border }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !border-2 !border-white !rounded-full"
        style={{ backgroundColor: colors.border }}
      />

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

function GroupNodeComponent({ data }: { data: Record<string, unknown> }) {
  const color = (data.groupColor as string) || "#E5E7EB";

  return (
    <div
      className="rounded-xl border-2 border-dashed p-2 min-w-[220px] min-h-[100px]"
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

function SectionNodeComponent({ data }: { data: Record<string, unknown> }) {
  const color = (data.sectionColor as string) || "#3B82F6";
  const description = (data.description as string) || "";

  return (
    <div
      className="rounded-2xl border-2 p-4 min-w-[300px] min-h-[200px]"
      style={{
        backgroundColor: `${color}08`,
        borderColor: `${color}40`,
        borderStyle: "solid",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color }}
        >
          {data.label as string}
        </span>
      </div>
      {description && (
        <p className="text-[10px] text-gray-400 leading-tight">{description}</p>
      )}
    </div>
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

// ─── Layout ────────────────────────────────────────────────────────────

const NODE_WIDTH = 220;
const NODE_HEIGHT = 130;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const nonGroupNodes = nodes.filter((n) => n.type !== "assetGroup" && n.type !== "piiStageLabel" && n.type !== "section");
  const otherNodes = nodes.filter((n) => n.type === "assetGroup" || n.type === "piiStageLabel" || n.type === "section");

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 160 });

  nonGroupNodes.forEach((node) => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  const layoutedNodes = nonGroupNodes.map((node) => {
    const pos = g.node(node.id);
    if (pos) {
      return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
    }
    return node;
  });

  return { nodes: [...otherNodes, ...layoutedNodes], edges };
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

  // Assign each node to a stage
  contentNodes.forEach((node) => {
    const data = node.data as Record<string, unknown>;
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
  onSave,
  onClose,
  initialSource,
  initialTarget,
  t,
}: {
  assets: AssetNode[];
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
    onSave({
      sourceAssetId: Number(sourceAssetId),
      targetAssetId: Number(targetAssetId),
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
                {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.assetMap.targetAsset}</label>
              <select value={targetAssetId} onChange={(e) => setTargetAssetId(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required>
                <option value="">--</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
              <select value={direction} onChange={(e) => setDirection(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="UNI">{t.assetMap.uniDirectional}</option>
                <option value="BI">{t.assetMap.biDirectional}</option>
              </select>
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
          {views.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">
              {t.assetMap.noSavedViews}
            </div>
          ) : (
            views.map((v) => (
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
  t,
}: {
  node: SelectedNodeData;
  edges: Edge[];
  nodes: Node[];
  onClose: () => void;
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
    <div className="fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-slide-in">
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
          <div className="flex items-center gap-1.5 mb-3">
            <Link2 className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Connections ({connections.length})
            </span>
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
                    className="rounded-lg border p-2.5 hover:bg-gray-50 transition-colors"
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

// ─── Main Component ────────────────────────────────────────────────────

export default function AssetMapContent() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewType>("all");
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [externalEntities, setExternalEntities] = useState<ExternalEntity[]>([]);
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionCounter, setSectionCounter] = useState(0);
  const [pendingConnection, setPendingConnection] = useState<{ source: string; target: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SelectedNodeData | null>(null);

  // Fetch saved views on mount
  useEffect(() => {
    async function loadSavedViews() {
      try {
        const res = await fetch("/api/asset-map/views");
        if (res.ok) {
          const data = await res.json();
          setSavedViews(Array.isArray(data) ? data : data.views ?? []);
        }
      } catch {
        // silently fail
      }
    }
    loadSavedViews();
  }, []);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/asset-map?view=${view}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const fetchedAssets: AssetNode[] = data.nodes || [];
      const fetchedEntities: ExternalEntity[] = data.externalEntities || [];
      const fetchedGroups: AssetGroup[] = data.groups || [];

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

      // Create external entity nodes
      const entityNodes: Node[] = fetchedEntities.map((ent, i) => ({
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

      const flowEdges: Edge[] = (data.edges || []).map((e: AssetEdge & { source?: string; target?: string; sourceName?: string; targetName?: string }) => {
        const sourceId = e.source ? String(e.source) : String(e.sourceAssetId);
        const targetId = e.target ? String(e.target) : String(e.targetAssetId);
        const linkType = e.linkType || "DATA_FLOW";
        const linkColor = LINK_COLORS[linkType] || "#6B7280";

        // Edge style based on link type
        let strokeDasharray: string | undefined;
        if (linkType === "DATA_FLOW") strokeDasharray = "6 3";
        else if (linkType === "DEPENDENCY") strokeDasharray = "3 3";

        const edgeObj: Edge = {
          id: `link-${e.id}`,
          source: sourceId,
          target: targetId,
          style: {
            stroke: linkColor,
            strokeWidth: 2,
            strokeDasharray,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: linkColor, width: 16, height: 16 },
          data: {
            linkId: e.id,
            linkType: linkType,
            dataTypes: e.dataTypes,
            piiItems: e.piiItems,
            protocol: e.protocol,
          },
          label: "",
          labelStyle: { fontSize: 0 },
        };

        if (e.direction === "BI") {
          edgeObj.markerStart = { type: MarkerType.ArrowClosed, color: linkColor, width: 16, height: 16 };
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

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target && params.source !== params.target) {
      setPendingConnection({ source: params.source, target: params.target });
      setShowModal(true);
    }
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === "assetGroup" || node.type === "piiStageLabel" || node.type === "section") return;
    setSelectedNode({
      id: node.id,
      type: node.type || "asset",
      data: node.data as Record<string, unknown>,
    });
  }, []);

  async function handleSaveLink(data: Record<string, unknown>) {
    try {
      const res = await fetch("/api/asset-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowModal(false);
        setPendingConnection(null);
        fetchGraph();
      }
    } catch {
      // silently fail
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
  function handleLoadView(savedView: SavedView) {
    const positions = savedView.nodePositions;
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const savedPos = positions[node.id];
        if (savedPos) {
          return { ...node, position: { x: savedPos.x, y: savedPos.y } };
        }
        return node;
      })
    );
  }

  const viewTabs: { key: ViewType; label: string }[] = [
    { key: "all", label: t.assetMap.viewAll },
    { key: "pii", label: t.assetMap.viewPii },
    { key: "network", label: t.assetMap.viewNetwork },
    { key: "data_flow", label: t.assetMap.viewDataFlow },
  ];

  return (
    <div className="h-[calc(100vh-64px)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{t.assetMap.title}</h1>
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

          {/* Saved Views Dropdown */}
          <SavedViewsDropdown views={savedViews} onLoad={handleLoadView} t={t} />

          {/* Save View Button */}
          <button
            onClick={() => setShowSaveViewModal(true)}
            className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Save className="h-3.5 w-3.5" />
            {t.assetMap.saveView}
          </button>

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
          <button onClick={() => setShowModal(true)} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
            <Plus className="inline h-3.5 w-3.5 mr-1" />
            {t.assetMap.addLink}
          </button>
        </div>
      </div>

      {/* ReactFlow */}
      <div className={`h-full transition-all ${selectedNode ? "pr-80" : ""}`}>
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
            onNodeClick={onNodeClick}
            onEdgeDoubleClick={(_e, edge) => handleDeleteEdge(edge.id)}
            nodeTypes={nodeTypes}
            snapToGrid={true}
            snapGrid={[20, 20]}
            fitView
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
              style={{ height: 100 }}
            />
            <Panel position="bottom-center">
              <div className="rounded-lg border bg-white/90 px-3 py-1.5 text-xs text-gray-500 backdrop-blur">
                {t.assetMap.addLink}: 노드 핸들 드래그 | {t.assetMap.deleteLink}: 엣지 더블클릭
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>

      {/* Side Panel */}
      {selectedNode && (
        <SidePanel
          node={selectedNode}
          edges={edges}
          nodes={nodes}
          onClose={() => setSelectedNode(null)}
          t={t}
        />
      )}

      {/* Link Modal */}
      {showModal && (
        <LinkModal
          assets={assets}
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
    </div>
  );
}
