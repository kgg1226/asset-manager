"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FileText,
  Cloud,
  HardDrive,
  Globe,
  User,
  Building2,
} from "lucide-react";

export type AssetNodeData = {
  label: string;
  nodeType: string;
  status?: string;
  monthlyCost?: number;
  meta?: Record<string, unknown>;
};

const NODE_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
  LICENSE: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
    icon: <FileText className="h-4 w-4 text-blue-500" />,
  },
  CLOUD: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-700",
    icon: <Cloud className="h-4 w-4 text-purple-500" />,
  },
  HARDWARE: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-700",
    icon: <HardDrive className="h-4 w-4 text-orange-500" />,
  },
  DOMAIN_SSL: {
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-700",
    icon: <Globe className="h-4 w-4 text-green-500" />,
  },
  EMPLOYEE: {
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-700",
    icon: <User className="h-4 w-4 text-gray-500" />,
  },
  ORG_UNIT: {
    bg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-700",
    icon: <Building2 className="h-4 w-4 text-sky-500" />,
  },
};

const STATUS_COLORS: Record<string, string> = {
  IN_USE: "bg-green-400",
  IN_STOCK: "bg-blue-400",
  ACTIVE: "bg-green-400",
  INACTIVE: "bg-gray-400",
  UNUSABLE: "bg-red-400",
  DISPOSED: "bg-red-600",
  PENDING_DISPOSAL: "bg-yellow-400",
  OFFBOARDING: "bg-yellow-400",
};

function AssetMapNode({ data }: NodeProps) {
  const nodeData = data as unknown as AssetNodeData;
  const style = NODE_STYLES[nodeData.nodeType] ?? NODE_STYLES.EMPLOYEE;
  const statusColor = nodeData.status ? STATUS_COLORS[nodeData.status] : undefined;

  return (
    <div
      className={`rounded-lg border-2 ${style.bg} ${style.border} px-3 py-2 shadow-sm min-w-[120px] max-w-[180px] cursor-pointer hover:shadow-md transition-shadow`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-400" />
      <div className="flex items-center gap-2">
        {style.icon}
        <span className={`text-xs font-medium ${style.text} truncate`}>
          {nodeData.label}
        </span>
        {statusColor && (
          <span className={`ml-auto h-2 w-2 rounded-full ${statusColor} shrink-0`} />
        )}
      </div>
      {nodeData.monthlyCost != null && nodeData.monthlyCost > 0 && (
        <div className="mt-1 text-[10px] text-gray-500">
          ₩{nodeData.monthlyCost.toLocaleString()}/월
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400" />
    </div>
  );
}

export const CustomNode = memo(AssetMapNode);

export const nodeTypes = {
  assetNode: CustomNode,
};
