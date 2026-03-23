// PUT    — 자산 맵 뷰 수정 (노드 위치 저장 등)
// DELETE — 자산 맵 뷰 삭제

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

const VIEW_TYPES = ["ALL", "PII", "NETWORK", "DATA_FLOW", "CUSTOM"] as const;

type Params = { params: Promise<{ id: string }> };

// ── PUT /api/asset-map/views/[id] — 자산 맵 뷰 수정 ──

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const viewId = Number(id);
    if (isNaN(viewId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    const body = await request.json();

    // viewType 검증 (제공된 경우)
    if (body.viewType !== undefined && !VIEW_TYPES.includes(body.viewType)) {
      return NextResponse.json(
        { error: `viewType 허용값: ${VIEW_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const view = await prisma.$transaction(async (tx) => {
      const existing = await tx.assetMapView.findUnique({
        where: { id: viewId },
      });
      if (!existing) throw new Error("NOT_FOUND");

      const toJsonStr = (v: unknown) => {
        if (v === null) return null;
        return typeof v === "string" ? v : JSON.stringify(v);
      };

      const updated = await tx.assetMapView.update({
        where: { id: viewId },
        data: {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.viewType !== undefined && { viewType: body.viewType }),
          ...(body.nodePositions !== undefined && { nodePositions: toJsonStr(body.nodePositions) }),
          ...(body.sectionData !== undefined && { sectionData: toJsonStr(body.sectionData) }),
          ...(body.viewport !== undefined && { viewport: toJsonStr(body.viewport) }),
          ...(body.edgeVisibility !== undefined && { edgeVisibility: toJsonStr(body.edgeVisibility) }),
          ...(body.filterConfig !== undefined && { filterConfig: toJsonStr(body.filterConfig) }),
          ...(body.isShared !== undefined && { isShared: body.isShared }),
          ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
          ...(body.folderId !== undefined && { folderId: body.folderId === null ? null : Number(body.folderId) }),
          lastAccessedAt: new Date(),
        },
      });

      // auto-save 시에는 감사 로그 생략 (자동저장마다 로그가 쌓이는 것 방지)
      if (!body._autoSave) {
        await writeAuditLog(tx, {
          entityType: "SYSTEM_CONFIG",
          entityId: updated.id,
          action: "UPDATED",
          actor: user.username,
          actorType: "USER",
          actorId: user.id,
          details: {
            entityName: "AssetMapView",
            name: updated.name,
            changes: Object.keys(body).filter(k => k !== "_autoSave"),
          },
        });
      }

      return updated;
    });

    return NextResponse.json(view);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "자산 맵 뷰를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error("Failed to update asset map view:", error);
    return NextResponse.json(
      { error: "자산 맵 뷰 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── DELETE /api/asset-map/views/[id] — 자산 맵 뷰 삭제 ──

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const viewId = Number(id);
    if (isNaN(viewId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.assetMapView.findUnique({
        where: { id: viewId },
        select: { id: true, name: true },
      });
      if (!existing) throw new Error("NOT_FOUND");

      await tx.assetMapView.delete({ where: { id: viewId } });

      await writeAuditLog(tx, {
        entityType: "SYSTEM_CONFIG",
        entityId: existing.id,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          entityName: "AssetMapView",
          name: existing.name,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "자산 맵 뷰를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error("Failed to delete asset map view:", error);
    return NextResponse.json(
      { error: "자산 맵 뷰 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
