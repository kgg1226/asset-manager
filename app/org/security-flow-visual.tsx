"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { toPng } from "html-to-image";
import { Shield, User, Download } from "lucide-react";

type Employee = { id: number; name: string; department: string | null; title: string | null };
type SecurityNode = {
  id: number;
  title: string;
  employeeId: number | null;
  parentId: number | null;
  sortOrder: number;
  employee: Employee | null;
};

// ── Node component ─────────────────────────────────────────────────────

function SecurityRoleNode({ data }: { data: { title: string; employeeName: string | null; isRoot: boolean } }) {
  return (
    <div className={`rounded-xl border-2 px-4 py-3 shadow-md min-w-[160px] text-center ${
      data.isRoot
        ? "border-red-500 bg-red-50"
        : "border-indigo-400 bg-indigo-50"
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400" />
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Shield className={`h-3.5 w-3.5 ${data.isRoot ? "text-red-500" : "text-indigo-500"}`} />
        <span className={`font-bold text-sm ${data.isRoot ? "text-red-700" : "text-indigo-700"}`}>
          {data.title}
        </span>
      </div>
      {data.employeeName ? (
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
          <User className="h-3 w-3" />
          {data.employeeName}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic">미배정</div>
      )}
    </div>
  );
}

const NODE_TYPES = { securityRole: SecurityRoleNode };

// ── Dagre layout ───────────────────────────────────────────────────────

function applyDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 60, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => g.setNode(n.id, { width: 180, height: 75 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - 90, y: y - 37 } };
  });
}

// ── Canvas ─────────────────────────────────────────────────────────────

function SecurityFlowCanvas({ securityNodes }: { securityNodes: SecurityNode[] }) {
  const { fitView } = useReactFlow();
  const flowRef = useRef<HTMLDivElement>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = securityNodes.map((sn) => ({
      id: String(sn.id),
      type: "securityRole",
      position: { x: 0, y: 0 },
      data: {
        title: sn.title,
        employeeName: sn.employee?.name ?? null,
        isRoot: sn.parentId === null,
      },
    }));

    const edges: Edge[] = securityNodes
      .filter((sn) => sn.parentId !== null)
      .map((sn) => ({
        id: `e-${sn.parentId}-${sn.id}`,
        source: String(sn.parentId),
        target: String(sn.id),
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
        style: { stroke: "#818cf8" },
      }));

    const laid = applyDagre(nodes, edges);
    return { initialNodes: laid, initialEdges: edges };
  }, [securityNodes]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setTimeout(() => fitView({ padding: 0.15 }), 100);
  }, [fitView, initialNodes]);

  const handleExport = useCallback(async () => {
    if (!flowRef.current) return;
    try {
      const png = await toPng(flowRef.current, { backgroundColor: "#f8fafc", pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = png;
      a.download = "security-org-chart.png";
      a.click();
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="relative w-full" style={{ height: 520 }}>
      <div ref={flowRef} className="w-full h-full rounded-xl border border-gray-200 bg-slate-50 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
          <Controls />
          <MiniMap nodeStrokeWidth={2} pannable zoomable />
        </ReactFlow>
      </div>
      <button
        onClick={handleExport}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow border border-gray-200 hover:bg-gray-50"
      >
        <Download className="h-3.5 w-3.5" />
        PNG 내보내기
      </button>
    </div>
  );
}

export default function SecurityFlowVisual({ securityNodes }: { securityNodes: SecurityNode[] }) {
  return (
    <ReactFlowProvider>
      <SecurityFlowCanvas securityNodes={securityNodes} />
    </ReactFlowProvider>
  );
}
