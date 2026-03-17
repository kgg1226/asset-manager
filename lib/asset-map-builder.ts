import { prisma } from "@/lib/prisma";

export type MapNodeType = "LICENSE" | "CLOUD" | "HARDWARE" | "DOMAIN_SSL" | "EMPLOYEE" | "ORG_UNIT";
export type MapEdgeType = "ASSIGNMENT" | "ASSIGNED_TO" | "INSTALLED" | "BELONGS_TO" | "CHILD_OF";

export interface MapNode {
  id: string;
  type: MapNodeType;
  label: string;
  status?: string;
  monthlyCost?: number;
  meta?: Record<string, unknown>;
}

export interface MapEdge {
  source: string;
  target: string;
  type: MapEdgeType;
}

export interface AssetMapData {
  nodes: MapNode[];
  edges: MapEdge[];
}

interface BuildOptions {
  types?: string[];
  orgUnitId?: number;
  search?: string;
}

export async function buildAssetMapData(options: BuildOptions): Promise<AssetMapData> {
  const { types, orgUnitId, search } = options;
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (node: MapNode) => {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  };

  const searchFilter = search
    ? { contains: search, mode: "insensitive" as const }
    : undefined;

  // Determine which types to include
  const includeTypes = new Set(types ?? ["LICENSE", "CLOUD", "HARDWARE", "DOMAIN_SSL"]);
  const includeEmployees = !types || types.includes("EMPLOYEE");
  const includeOrgUnits = !types || types.includes("ORG_UNIT");

  // 1. Licenses
  if (includeTypes.has("LICENSE")) {
    const licenses = await prisma.license.findMany({
      where: {
        ...(searchFilter ? { name: searchFilter } : {}),
      },
      select: {
        id: true,
        name: true,
        licenseType: true,
        parentId: true,
        monthlyCost: true,
        assignments: {
          where: { returnedDate: null },
          select: { employeeId: true },
        },
        owners: {
          select: { orgUnitId: true },
        },
      },
      take: 200,
    });

    for (const lic of licenses) {
      addNode({
        id: `license-${lic.id}`,
        type: "LICENSE",
        label: lic.name,
        status: "ACTIVE",
        monthlyCost: lic.monthlyCost ? Number(lic.monthlyCost) : undefined,
        meta: { licenseType: lic.licenseType },
      });

      // License hierarchy edges
      if (lic.parentId) {
        edges.push({ source: `license-${lic.parentId}`, target: `license-${lic.id}`, type: "CHILD_OF" });
      }

      // Assignment edges (license → employee)
      for (const a of lic.assignments) {
        edges.push({ source: `license-${lic.id}`, target: `employee-${a.employeeId}`, type: "ASSIGNMENT" });
      }

      // Owner edges (license → orgUnit)
      for (const o of lic.owners) {
        if (o.orgUnitId) {
          edges.push({ source: `license-${lic.id}`, target: `orgunit-${o.orgUnitId}`, type: "BELONGS_TO" });
        }
      }
    }
  }

  // 2. Assets (Cloud, Hardware, Domain/SSL)
  const assetTypeMap: Record<string, string> = {
    CLOUD: "CLOUD",
    HARDWARE: "HARDWARE",
    DOMAIN_SSL: "DOMAIN_SSL",
  };

  const assetTypesToFetch = Object.keys(assetTypeMap).filter((t) => includeTypes.has(t));

  if (assetTypesToFetch.length > 0) {
    const assets = await prisma.asset.findMany({
      where: {
        type: { in: assetTypesToFetch as Array<"CLOUD" | "HARDWARE" | "DOMAIN_SSL"> },
        ...(orgUnitId ? { orgUnitId } : {}),
        ...(searchFilter ? { name: searchFilter } : {}),
      },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        monthlyCost: true,
        assigneeId: true,
        orgUnitId: true,
        licenseLinks: {
          select: { licenseId: true },
        },
      },
      take: 300,
    });

    for (const asset of assets) {
      const nodeType = asset.type as MapNodeType;
      addNode({
        id: `asset-${asset.id}`,
        type: nodeType,
        label: asset.name,
        status: asset.status,
        monthlyCost: asset.monthlyCost ? Number(asset.monthlyCost) : undefined,
      });

      // Asset → Employee (assigned)
      if (asset.assigneeId) {
        edges.push({ source: `asset-${asset.id}`, target: `employee-${asset.assigneeId}`, type: "ASSIGNED_TO" });
      }

      // Asset → OrgUnit (belongs to)
      if (asset.orgUnitId) {
        edges.push({ source: `asset-${asset.id}`, target: `orgunit-${asset.orgUnitId}`, type: "BELONGS_TO" });
      }

      // Asset → License (installed)
      for (const link of asset.licenseLinks) {
        edges.push({ source: `asset-${asset.id}`, target: `license-${link.licenseId}`, type: "INSTALLED" });
      }
    }
  }

  // 3. Employees — fetch those referenced by edges, or all if explicitly requested
  if (includeEmployees) {
    const employeeIds = new Set<number>();
    for (const edge of edges) {
      const match = edge.target.match(/^employee-(\d+)$/);
      if (match) employeeIds.add(Number(match[1]));
    }

    if (employeeIds.size > 0 || search) {
      const employees = await prisma.employee.findMany({
        where: {
          ...(employeeIds.size > 0 && !search ? { id: { in: Array.from(employeeIds) } } : {}),
          ...(searchFilter ? { name: searchFilter } : {}),
          status: { not: "DELETED" },
          ...(orgUnitId ? { orgUnitId } : {}),
        },
        select: {
          id: true,
          name: true,
          department: true,
          orgUnitId: true,
          status: true,
        },
        take: 200,
      });

      for (const emp of employees) {
        addNode({
          id: `employee-${emp.id}`,
          type: "EMPLOYEE",
          label: emp.name,
          status: emp.status,
          meta: { department: emp.department },
        });

        // Employee → OrgUnit
        if (emp.orgUnitId) {
          edges.push({ source: `employee-${emp.id}`, target: `orgunit-${emp.orgUnitId}`, type: "BELONGS_TO" });
        }
      }
    }
  }

  // 4. OrgUnits — fetch those referenced by edges
  if (includeOrgUnits) {
    const orgUnitIds = new Set<number>();
    for (const edge of edges) {
      const match = edge.target.match(/^orgunit-(\d+)$/);
      if (match) orgUnitIds.add(Number(match[1]));
    }

    if (orgUnitIds.size > 0 || orgUnitId) {
      const orgUnits = await prisma.orgUnit.findMany({
        where: {
          ...(orgUnitId ? { id: orgUnitId } : { id: { in: Array.from(orgUnitIds) } }),
        },
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
        },
        take: 100,
      });

      for (const ou of orgUnits) {
        addNode({
          id: `orgunit-${ou.id}`,
          type: "ORG_UNIT",
          label: ou.name,
          meta: { memberCount: ou._count.members },
        });
      }
    }
  }

  // Filter edges: only keep edges where both source and target nodes exist
  const validEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  return { nodes, edges: validEdges };
}
