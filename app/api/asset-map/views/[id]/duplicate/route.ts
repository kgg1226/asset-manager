// POST — 워크스페이스 복제

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const viewId = Number(id);
    if (isNaN(viewId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    const source = await prisma.assetMapView.findUnique({
      where: { id: viewId },
    });

    if (!source)
      return NextResponse.json({ error: "원본 워크스페이스를 찾을 수 없습니다." }, { status: 404 });

    const duplicated = await prisma.$transaction(async (tx) => {
      const created = await tx.assetMapView.create({
        data: {
          name: `${source.name} (복사)`,
          description: source.description,
          viewType: source.viewType,
          nodePositions: source.nodePositions,
          sectionData: source.sectionData,
          viewport: source.viewport,
          edgeVisibility: source.edgeVisibility,
          filterConfig: source.filterConfig,
          isDefault: false,
          createdBy: user.id,
          isShared: false,
          lastAccessedAt: new Date(),
        },
      });

      await writeAuditLog(tx, {
        entityType: "SYSTEM_CONFIG",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          entityName: "AssetMapView",
          name: created.name,
          duplicatedFrom: source.id,
        },
      });

      return created;
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    console.error("Failed to duplicate workspace:", error);
    return NextResponse.json(
      { error: "워크스페이스 복제에 실패했습니다." },
      { status: 500 },
    );
  }
}
