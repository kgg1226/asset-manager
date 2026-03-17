"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodeClick,
  MarkerType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

import { nodeTypes } from "./custom-nodes";
import AssetMapFilters from "./asset-map-filters";
import AssetMapLegend from "./asset-map-legend";
import AssetMapDetailPanel from "./asset-map-detail-panel";
import type { MapNode, MapEdge } from "@/lib/asset-map-builder";
import { useTranslation } from "@/lib/i18n";

const ALL_TYPES = ["LICENSE", "CLOUD", "HARDWARE", "DOMAIN_SSL", "EMPLOYEE", "ORG_UNIT"];

const EDGE_COLORS: Record<string, string> = {
  ASSIGNMENT: "#3b82f6",
  ASSIGNED_TO: "#f97316",
  INSTALLED: "#a855f7",
  BELONGS_TO: "#0ea5e9",
  CHILD_OF: "#9ca3af",
};

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    if (!nodeWithPosition) return node;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function mapToFlowNodes(mapNodes: MapNode[]): Node[] {
  return mapNodes.map((n) => ({
    id: n.id,
    type: "assetNode",
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      nodeType: n.type,
      status: n.status,
      monthlyCost: n.monthlyCost,
      meta: n.meta,
    },
  }));
}

function mapToFlowEdges(mapEdges: MapEdge[]): Edge[] {
  return mapEdges.map((e, i) => ({
    id: `edge-${i}`,
    source: e.source,
    target: e.target,
    type: "default",
    animated: e.type === "ASSIGNMENT" || e.type === "ASSIGNED_TO",
    style: { stroke: EDGE_COLORS[e.type] ?? "#9ca3af", strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: EDGE_COLORS[e.type] ?? "#9ca3af",
      width: 15,
      height: 12,
    },
  }));
}

export default function AssetMapCanvas() {
  const { locale } = useTranslation();
  const lang = locale === "ko" ? "ko" : "en";

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rawData, setRawData] = useState<{ nodes: MapNode[]; edges: MapEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [filters, setFilters] = useState({
    types: [...ALL_TYPES],
    orgUnitId: undefined as number | undefined,
    search: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.types.length < ALL_TYPES.length) {
        params.set("types", filters.types.join(","));
      }
      if (filters.orgUnitId) {
        params.set("orgUnitId", String(filters.orgUnitId));
      }
      if (filters.search) {
        params.set("search", filters.search);
      }

      const res = await fetch(`/api/asset-map?${params.toString()}`);
      const data = await res.json();
      setRawData(data);

      const flowNodes = mapToFlowNodes(data.nodes);
      const flowEdges = mapToFlowEdges(data.edges);
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        flowNodes,
        flowEdges
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filters, setNodes, setEdges]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onNodeClick: OnNodeClick = useCallback(
    (_event, node) => {
      const mapNode = rawData.nodes.find((n) => n.id === node.id) ?? null;
      setSelectedNode(mapNode);
    },
    [rawData.nodes]
  );

  const miniMapNodeColor = useCallback((node: Node) => {
    const nodeType = (node.data as Record<string, unknown>)?.nodeType as string;
    const colors: Record<string, string> = {
      LICENSE: "#3b82f6",
      CLOUD: "#a855f7",
      HARDWARE: "#f97316",
      DOMAIN_SSL: "#22c55e",
      EMPLOYEE: "#6b7280",
      ORG_UNIT: "#0ea5e9",
    };
    return colors[nodeType] ?? "#9ca3af";
  }, []);

  const nodeCount = rawData.nodes.length;
  const edgeCount = rawData.edges.length;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <AssetMapFilters filters={filters} onFilterChange={setFilters} />

      <div className="relative flex-1 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60">
            <div className="text-sm text-gray-500">
              {lang === "ko" ? "로딩 중..." : "Loading..."}
            </div>
          </div>
        )}

        {/* Legend (left side) */}
        <div className="absolute left-4 top-4 z-10">
          <AssetMapLegend />
        </div>

        {/* Stats badge */}
        <div className="absolute left-4 bottom-4 z-10 rounded-md bg-white/90 border border-gray-200 px-3 py-1.5 text-[11px] text-gray-500 shadow-sm">
          {lang === "ko"
            ? `노드 ${nodeCount}개 · 관계 ${edgeCount}개`
            : `${nodeCount} nodes · ${edgeCount} edges`}
        </div>

        {/* Detail panel */}
        <AssetMapDetailPanel
          node={selectedNode}
          edges={rawData.edges}
          nodes={rawData.nodes}
          onClose={() => setSelectedNode(null)}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
          <Controls
            showInteractive={false}
            className="!bottom-4 !right-4 !left-auto !top-auto"
          />
          <MiniMap
            nodeColor={miniMapNodeColor}
            maskColor="rgba(0,0,0,0.08)"
            className="!bottom-4 !right-16"
            style={{ width: 140, height: 90 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
