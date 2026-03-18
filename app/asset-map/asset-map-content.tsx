"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
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

const LINK_COLORS: Record<string, string> = {
  DATA_FLOW: "#3B82F6",
  NETWORK: "#10B981",
  DEPENDENCY: "#F97316",
  AUTH: "#EF4444",
};

// ─── Custom Node ───────────────────────────────────────────────────────

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

const nodeTypes = { asset: AssetNodeComponent };

// ─── Layout ────────────────────────────────────────────────────────────

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });

  nodes.forEach((node) => g.setNode(node.id, { width: 200, height: 70 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - 100, y: pos.y - 35 } };
  });

  return { nodes: layoutedNodes, edges };
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

// ─── Main Component ────────────────────────────────────────────────────

export default function AssetMapContent() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewType>("all");
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [assets, setAssets] = useState<AssetNode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{ source: string; target: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/asset-map?view=${view}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      setAssets(data.nodes);

      const flowNodes: Node[] = data.nodes.map((n: AssetNode, i: number) => ({
        id: String(n.id),
        type: "asset",
        position: { x: (i % 5) * 240, y: Math.floor(i / 5) * 120 },
        data: {
          label: n.name,
          assetType: n.type,
          vendor: n.vendor,
          assigneeName: n.assigneeName,
        },
      }));

      const flowEdges: Edge[] = data.edges.map((e: AssetEdge) => ({
        id: `link-${e.id}`,
        source: String(e.sourceAssetId),
        target: String(e.targetAssetId),
        label: e.label || e.protocol || "",
        style: { stroke: LINK_COLORS[e.linkType] || "#6B7280", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: LINK_COLORS[e.linkType] || "#6B7280" },
        ...(e.direction === "BI" ? { markerStart: { type: MarkerType.ArrowClosed, color: LINK_COLORS[e.linkType] || "#6B7280" } } : {}),
        data: { linkId: e.id, linkType: e.linkType, dataTypes: e.dataTypes, piiItems: e.piiItems },
      }));

      const layouted = getLayoutedElements(flowNodes, flowEdges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [view, setNodes, setEdges]);

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
    const layouted = getLayoutedElements(nodes, edges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
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
    </div>
  );
}
