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
import { Building2, Users, Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Member = { id: number; name: string; title: string | null };
type OrgUnit = { id: number; name: string; parentId: number | null; members?: Member[]; _count?: { members: number } };
type Company = { id: number; name: string; orgs: OrgUnit[] };

// ── Node Types ─────────────────────────────────────────────────────────

function CompanyNode({ data }: { data: { label: string; unitCount: number; memberCount: number } }) {
  return (
    <div className="rounded-xl border-2 border-blue-600 bg-blue-50 px-5 py-3 shadow-md min-w-[160px] text-center">
      <Handle type="source" position={Position.Bottom} className="!bg-blue-600" />
      <div className="flex items-center justify-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-blue-600" />
        <span className="font-bold text-blue-800 text-sm">{data.label}</span>
      </div>
      <span className="text-xs text-blue-500">{data.unitCount}개 부서 · {data.memberCount}명</span>
    </div>
  );
}

function UnitNode({ data }: { data: { label: string; memberCount: number } }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 shadow-sm min-w-[130px] text-center hover:border-blue-400 transition-colors">
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      <div className="font-medium text-gray-800 text-sm mb-0.5">{data.label}</div>
      <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
        <Users className="h-3 w-3" />
        {data.memberCount}명
      </div>
    </div>
  );
}

const NODE_TYPES = { company: CompanyNode, unit: UnitNode };

// ── Dagre layout ────────────────────────────────────────────────────────

function applyDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 60, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => g.setNode(n.id, { width: 170, height: 70 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - 85, y: y - 35 } };
  });
}

// ── Main canvas ─────────────────────────────────────────────────────────

function OrgFlowCanvas({ companies }: { companies: Company[] }) {
  const { t } = useTranslation();
  const { fitView } = useReactFlow();
  const flowRef = useRef<HTMLDivElement>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    companies.forEach((company) => {
      const companyNodeId = `company-${company.id}`;
      const totalMembers = company.orgs.reduce((s, u) => s + (u._count?.members ?? u.members?.length ?? 0), 0);

      nodes.push({
        id: companyNodeId,
        type: "company",
        position: { x: 0, y: 0 },
        data: { label: company.name, unitCount: company.orgs.length, memberCount: totalMembers },
      });

      company.orgs.forEach((unit) => {
        const unitNodeId = `unit-${unit.id}`;
        nodes.push({
          id: unitNodeId,
          type: "unit",
          position: { x: 0, y: 0 },
          data: { label: unit.name, memberCount: unit._count?.members ?? unit.members?.length ?? 0 },
        });

        const sourceId = unit.parentId ? `unit-${unit.parentId}` : companyNodeId;
        edges.push({
          id: `e-${sourceId}-${unitNodeId}`,
          source: sourceId,
          target: unitNodeId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
          style: { stroke: "#94a3b8" },
        });
      });
    });

    const laid = applyDagre(nodes, edges);
    return { initialNodes: laid, initialEdges: edges };
  }, [companies]);

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
      a.download = "org-chart.png";
      a.click();
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="relative w-full" style={{ height: 600 }}>
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
        {"PNG 내보내기"}
      </button>
    </div>
  );
}

export default function OrgFlowVisual({ companies }: { companies: Company[] }) {
  return (
    <ReactFlowProvider>
      <OrgFlowCanvas companies={companies} />
    </ReactFlowProvider>
  );
}
