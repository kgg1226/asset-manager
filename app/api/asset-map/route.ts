// GET — 자산 맵 그래프 데이터 조회 (노드 + 엣지)

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
      },
      orderBy: { createdAt: "desc" },
    });

    // ── 엣지에 관련된 노드 ID 수집 ──
    const nodeIds = new Set<number>();
    for (const link of links) {
      nodeIds.add(link.sourceAssetId);
      nodeIds.add(link.targetAssetId);
    }

    // "all" 뷰일 때는 연결이 없는 자산도 모두 포함
    let nodes;
    if (view === "all") {
      nodes = await prisma.asset.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          vendor: true,
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      });
    } else {
      // 필터링된 뷰에서는 엣지에 관련된 노드만 반환
      nodes = nodeIds.size > 0
        ? await prisma.asset.findMany({
            where: { id: { in: Array.from(nodeIds) } },
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              vendor: true,
              assignee: { select: { id: true, name: true } },
            },
            orderBy: { name: "asc" },
          })
        : [];
    }

    // ── 응답 구성 ──
    const edges = links.map((link) => ({
      id: link.id,
      sourceAssetId: link.sourceAssetId,
      targetAssetId: link.targetAssetId,
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
      sourceAssetName: link.sourceAsset.name,
      targetAssetName: link.targetAsset.name,
    }));

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error("Failed to fetch asset map:", error);
    return NextResponse.json(
      { error: "자산 맵 데이터 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
