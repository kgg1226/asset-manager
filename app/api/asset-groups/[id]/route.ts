// PUT    — 자산 그룹 수정 (멤버 교체 포함)
// DELETE — 자산 그룹 삭제

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

// ── PUT /api/asset-groups/[id] — 자산 그룹 수정 ──

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const groupId = Number(id);
    if (isNaN(groupId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    const body = await request.json();

    const group = await prisma.$transaction(async (tx) => {
      const existing = await tx.assetGroup.findUnique({
        where: { id: groupId },
      });
      if (!existing) throw new Error("NOT_FOUND");

      // assetIds가 제공된 경우 멤버 교체 (기존 삭제 후 재생성)
      if (Array.isArray(body.assetIds)) {
        await tx.assetGroupMember.deleteMany({
          where: { assetGroupId: groupId },
        });

        if (body.assetIds.length > 0) {
          await tx.assetGroupMember.createMany({
            data: body.assetIds.map((assetId: number) => ({
              assetGroupId: groupId,
              assetId,
            })),
          });
        }
      }

      const updated = await tx.assetGroup.update({
        where: { id: groupId },
        data: {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.color !== undefined && { color: body.color }),
        },
        include: {
          members: {
            include: {
              asset: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: updated.id,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          entityName: "AssetGroup",
          name: updated.name,
          changes: body,
        },
      });

      return updated;
    });

    return NextResponse.json(group);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "자산 그룹을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error("Failed to update asset group:", error);
    return NextResponse.json(
      { error: "자산 그룹 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── DELETE /api/asset-groups/[id] — 자산 그룹 삭제 ──

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const groupId = Number(id);
    if (isNaN(groupId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.assetGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true },
      });
      if (!existing) throw new Error("NOT_FOUND");

      // cascade delete handles AssetGroupMember via schema
      await tx.assetGroup.delete({ where: { id: groupId } });

      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: existing.id,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          entityName: "AssetGroup",
          name: existing.name,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "자산 그룹을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error("Failed to delete asset group:", error);
    return NextResponse.json(
      { error: "자산 그룹 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
