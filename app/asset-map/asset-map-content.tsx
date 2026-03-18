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
  addEdge,
  Connection,
  MarkerType,
  BackgroundVariant,
  Panel,
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
  Trash2,
  Building2,
  Save,
  ChevronDown,
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
  members: { assetId: number; asset: { name: string; type: string } }[];
};

type SavedView = {
  id: number;
  name: string;
  nodePositions: Record<string, { x: number; y: number }>;
};

type ViewType = "all" | "pii" | "network" | "data_flow";

const LINK_TYPES = ["DATA_FLOW", "NETWORK", "DEPENDENCY", "AUTH"] as const;
const DATA_TYPES = ["PII", "LOG", "CREDENTIAL"] as const;

// ─── Colors ────────────────────────────────────────────────────────────

const ASSET_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  HARDWARE: { bg: "#EFF6FF", border: "#3B82F6", icon: "#2563EB" },
  CLOUD: { bg: "#F5F3FF", border: "#8B5CF6", icon: "#7C3AED" },
  DOMAIN_SSL: { bg: "#ECFDF5", border: "#10B981", icon: "#059669" },
  SOFTWARE: { bg: "#FFF7ED", border: "#F97316", icon: "#EA580C" },
  CONTRACT: { bg: "#F9FAFB", border: "#6B7280", icon: "#4B5563" },
  OTHER: { bg: "#FEF2F2", border: "#EF4444", icon: "#DC2626" },
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

// ─── Custom Nodes ─────────────────────────────────────────────────────

function AssetIcon({ type, color }: { type: string; color: string }) {
  const props = { className: "w-5 h-5", style: { color } };
  switch (type) {
    case "HARDWARE": return <HardDrive {...props} />;
    case "CLOUD": return <Cloud {...props} />;
    case "DOMAIN_SSL": return <Globe {...props} />;
    case "SOFTWARE": return <FileText {...props} />;
    case "CONTRACT": return <FileSignature {...props} />;
    default: return <Package {...props} />;
  }
}

function AssetNodeComponent({ data }: { data: Record<string, unknown> }) {
  const type = (data.assetType as string) || "OTHER";
  const colors = ASSET_COLORS[type] || ASSET_COLORS.OTHER;

  return (
    <div
      className="rounded-lg border-2 px-4 py-3 shadow-sm min-w-[160px]"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <div className="flex items-center gap-2">
        <AssetIcon type={type} color={colors.icon} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
            {data.label as string}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-[140px]">
            {(data.vendor as string) || (data.assigneeName as string) || type}
          </div>
        </div>
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
      className="rounded-lg border-2 border-dashed px-4 py-3 shadow-sm min-w-[160px]"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5" style={{ color: colors.border }} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
            {data.label as string}
          </div>
          <div className="flex items-center gap-1">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: entityType === "GOVERNMENT" ? "#FEE2E2" : "#E5E7EB",
                color: entityType === "GOVERNMENT" ? "#DC2626" : "#4B5563",
              }}
            >
              {entityTypeLabels[entityType]}
            </span>
          </div>
        </div>
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
};

// ─── Layout ────────────────────────────────────────────────────────────

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const nonGroupNodes = nodes.filter((n) => n.type !== "assetGroup" && n.type !== "piiStageLabel");
  const otherNodes = nodes.filter((n) => n.type === "assetGroup" || n.type === "piiStageLabel");

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });

  nonGroupNodes.forEach((node) => g.setNode(node.id, { width: 200, height: 70 }));
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  const layoutedNodes = nonGroupNodes.map((node) => {
    const pos = g.node(node.id);
    if (pos) {
      return { ...node, position: { x: pos.x - 100, y: pos.y - 35 } };
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
    (n) => n.type !== "assetGroup" && n.type !== "piiStageLabel"
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

  const ROW_HEIGHT = 160;
  const COL_WIDTH = 240;
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
  const [pendingConnection, setPendingConnection] = useState<{ source: string; target: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch saved views on mount
  useEffect(() => {
    async function loadSavedViews() {
      try {
        const res = await fetch("/api/asset-map/views");
        if (res.ok) {
          const data = await res.json();
          setSavedViews(data);
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

      // Build group membership lookup: assetId -> group
      const assetGroupMap = new Map<number, AssetGroup>();
      fetchedGroups.forEach((group) => {
        group.members.forEach((m) => {
          assetGroupMap.set(m.assetId, group);
        });
      });

      // Create group parent nodes
      const groupNodes: Node[] = fetchedGroups.map((group, gi) => ({
        id: `group-${group.id}`,
        type: "assetGroup",
        position: { x: gi * 500, y: 0 },
        data: {
          label: group.name,
          groupColor: group.color,
        },
        style: {
          width: Math.max(260, group.members.length * 220 + 40),
          height: 140,
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
          position: { x: (i % 5) * 240, y: Math.floor(i / 5) * 120 },
          data: {
            label: n.name,
            assetType: n.type,
            vendor: n.vendor,
            assigneeName: n.assigneeName,
            serviceCategory: n.serviceCategory || null,
          },
        };

        if (parentGroup) {
          const memberIdx = parentGroup.members.findIndex((m) => m.assetId === n.id);
          baseNode.parentId = `group-${parentGroup.id}`;
          baseNode.extent = "parent";
          baseNode.position = { x: 20 + memberIdx * 210, y: 40 };
        }

        return baseNode;
      });

      // Create external entity nodes
      const entityNodes: Node[] = fetchedEntities.map((ent, i) => ({
        id: `ext-${ent.id}`,
        type: "externalEntity",
        position: { x: (fetchedAssets.length % 5 + i) * 240, y: Math.floor((fetchedAssets.length + i) / 5) * 120 },
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

      const flowEdges: Edge[] = (data.edges || []).map((e: AssetEdge) => {
        const edgeObj: Edge = {
          id: `link-${e.id}`,
          source: String(e.sourceAssetId),
          target: String(e.targetAssetId),
          label: e.label || e.protocol || "",
          style: { stroke: LINK_COLORS[e.linkType] || "#6B7280", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: LINK_COLORS[e.linkType] || "#6B7280" },
          data: { linkId: e.id, linkType: e.linkType, dataTypes: e.dataTypes, piiItems: e.piiItems },
        };
        if (e.direction === "BI") {
          edgeObj.markerStart = { type: MarkerType.ArrowClosed, color: LINK_COLORS[e.linkType] || "#6B7280" };
        }
        // Add PII items summary on edges when in PII view
        if (view === "pii" && e.piiItems) {
          edgeObj.label = e.piiItems;
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

  const views: { key: ViewType; label: string }[] = [
    { key: "all", label: t.assetMap.viewAll },
    { key: "pii", label: t.assetMap.viewPii },
    { key: "network", label: t.assetMap.viewNetwork },
    { key: "data_flow", label: t.assetMap.viewDataFlow },
  ];

  return (
    <div className="h-[calc(100vh-64px)]">
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
            {views.map((v) => (
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
      <div className="h-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-400">Loading...</div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeDoubleClick={(_e, edge) => handleDeleteEdge(edge.id)}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={20} />
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
    </div>
  );
}
