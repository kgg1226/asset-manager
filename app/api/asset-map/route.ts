// GET — 자산 맵 그래프 데이터 조회 (노드 + 엣지 + 외부 엔티티 + 그룹)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const VIEWS = ["all", "pii", "network", "data_flow"] as const;
type View = (typeof VIEWS)[number];

// ── GET /api/asset-map — 자산 맵 그래프 데이터 ──

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const url = request.nextUrl;
    const viewParam = url.searchParams.get("view") ?? "all";
    if (!VIEWS.includes(viewParam as View)) {
      return NextResponse.json(
        { error: `view 허용값: ${VIEWS.join(", ")}` },
        { status: 400 },
      );
    }
    const view = viewParam as View;

    // ── 엣지(AssetLink) 필터링 ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkWhere: any = {};

    switch (view) {
      case "network":
        linkWhere.linkType = "NETWORK";
        break;
      case "data_flow":
        linkWhere.linkType = "DATA_FLOW";
        break;
      case "pii":
        // DATA_FLOW 중 dataTypes에 PII가 포함된 것만
        linkWhere.linkType = "DATA_FLOW";
        linkWhere.dataTypes = { contains: "PII" };
        break;
      // "all" — 필터 없음
    }

    const links = await prisma.assetLink.findMany({
      where: linkWhere,
      include: {
        sourceAsset: { select: { id: true, name: true } },
        targetAsset: { select: { id: true, name: true } },
        sourceExternal: { select: { id: true, name: true } },
        targetExternal: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // ── 엣지에 관련된 노드 ID 수집 ──
    const assetNodeIds = new Set<number>();
    const externalNodeIds = new Set<number>();
    for (const link of links) {
      if (link.sourceAssetId) assetNodeIds.add(link.sourceAssetId);
      if (link.targetAssetId) assetNodeIds.add(link.targetAssetId);
      if (link.sourceExternalId) externalNodeIds.add(link.sourceExternalId);
      if (link.targetExternalId) externalNodeIds.add(link.targetExternalId);
    }

    // ── 자산 노드 조회 ──
    let assetNodes;
    if (view === "all") {
      // "all" 뷰일 때는 연결이 없는 자산도 모두 포함
      const assetSelect = {
          id: true,
          name: true,
          type: true,
          status: true,
          vendor: true,
          description: true,
          monthlyCost: true,
          currency: true,
          assignee: { select: { id: true, name: true } },
          subCategory: { select: { name: true, majorCategory: { select: { name: true } } } },
        } as const;

      assetNodes = await prisma.asset.findMany({
        select: assetSelect,
        orderBy: { name: "asc" },
      });
    } else {
      const assetSelect = {
          id: true,
          name: true,
          type: true,
          status: true,
          vendor: true,
          description: true,
          monthlyCost: true,
          currency: true,
          assignee: { select: { id: true, name: true } },
          subCategory: { select: { name: true, majorCategory: { select: { name: true } } } },
        } as const;

      // 필터링된 뷰에서는 엣지에 관련된 노드만 반환
      assetNodes = assetNodeIds.size > 0
        ? await prisma.asset.findMany({
            where: { id: { in: Array.from(assetNodeIds) } },
            select: assetSelect,
            orderBy: { name: "asc" },
          })
        : [];
    }

    // ── 외부 엔티티 노드 조회 ──
    let externalEntities;
    if (view === "all") {
      // "all" 뷰일 때는 모든 외부 엔티티 포함
      externalEntities = await prisma.externalEntity.findMany({
        orderBy: { name: "asc" },
      });
    } else {
      // 필터링된 뷰에서는 엣지에 관련된 외부 엔티티만
      externalEntities = externalNodeIds.size > 0
        ? await prisma.externalEntity.findMany({
            where: { id: { in: Array.from(externalNodeIds) } },
            orderBy: { name: "asc" },
          })
        : [];
    }

    // ── 자산 그룹 조회 ──
    const groups = await prisma.assetGroup.findMany({
      include: {
        members: {
          select: { assetId: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // ── 응답 구성 ──

    // 자산 노드 (기존 호환 + 추가 필드)
    const nodes = assetNodes.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      vendor: a.vendor,
      description: a.description,
      monthlyCost: a.monthlyCost ? Number(a.monthlyCost) : null,
      currency: a.currency,
      assigneeName: a.assignee?.name ?? null,
      serviceCategory: a.subCategory?.majorCategory?.name ?? a.subCategory?.name ?? null,
    }));

    // 외부 엔티티 노드 (type: "EXTERNAL" 포함)
    const externalNodes = externalEntities.map((entity) => ({
      id: entity.id,
      nodeId: `ext-${entity.id}`,
      name: entity.name,
      type: "EXTERNAL" as const,
      entityType: entity.type,
      description: entity.description,
      contactInfo: entity.contactInfo,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }));

    // 엣지 — source/target에 외부 엔티티 ID가 있으면 "ext-{id}" 형식 사용
    const edges = links.map((link) => {
      const source = link.sourceAssetId
        ? `${link.sourceAssetId}`
        : link.sourceExternalId
          ? `ext-${link.sourceExternalId}`
          : null;
      const target = link.targetAssetId
        ? `${link.targetAssetId}`
        : link.targetExternalId
          ? `ext-${link.targetExternalId}`
          : null;

      const sourceName = link.sourceAsset?.name ?? link.sourceExternal?.name ?? null;
      const targetName = link.targetAsset?.name ?? link.targetExternal?.name ?? null;

      return {
        id: link.id,
        source,
        target,
        sourceAssetId: link.sourceAssetId,
        targetAssetId: link.targetAssetId,
        sourceExternalId: link.sourceExternalId,
        targetExternalId: link.targetExternalId,
        linkType: link.linkType,
        direction: link.direction,
        label: link.label,
        dataTypes: link.dataTypes,
        piiItems: link.piiItems,
        protocol: link.protocol,
        legalBasis: link.legalBasis,
        retentionPeriod: link.retentionPeriod,
        destructionMethod: link.destructionMethod,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        sourceName,
        targetName,
      };
    });

    // 그룹 정보 (멤버 자산 ID 배열 포함)
    const groupsResponse = groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      assetIds: group.members.map((m) => m.assetId),
    }));

    return NextResponse.json({
      nodes,
      externalEntities: externalNodes,
      edges,
      groups: groupsResponse,
    });
  } catch (error) {
    console.error("Failed to fetch asset map:", error);
    return NextResponse.json(
      { error: "자산 맵 데이터 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
