// PUT    — 외부 엔티티 수정
// DELETE — 외부 엔티티 삭제 (연결된 링크도 cascade 삭제)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

const ENTITY_TYPES = ["TRUSTEE", "PARTNER", "GOVERNMENT", "OTHER"] as const;

type Params = { params: Promise<{ id: string }> };

// ── PUT /api/external-entities/[id] — 외부 엔티티 수정 ──

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const entityId = Number(id);
    if (isNaN(entityId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    const body = await request.json();

    // type 검증 (제공된 경우)
    if (body.type !== undefined && !ENTITY_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `type 허용값: ${ENTITY_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const entity = await prisma.$transaction(async (tx) => {
      const existing = await tx.externalEntity.findUnique({
        where: { id: entityId },
      });
      if (!existing) throw new Error("NOT_FOUND");

      const updated = await tx.externalEntity.update({
        where: { id: entityId },
        data: {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.type !== undefined && { type: body.type }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.contactInfo !== undefined && { contactInfo: body.contactInfo }),
        },
        include: {
          _count: {
            select: {
              outgoingLinks: true,
              incomingLinks: true,
            },
          },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ASSET_LINK",
        entityId: updated.id,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          entityName: "ExternalEntity",
          name: updated.name,
          changes: body,
        },
      });

      return updated;
    });

    return NextResponse.json(entity);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "외부 엔티티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error("Failed to update external entity:", error);
    return NextResponse.json(
      { error: "외부 엔티티 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── DELETE /api/external-entities/[id] — 외부 엔티티 삭제 ──

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const entityId = Number(id);
    if (isNaN(entityId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.externalEntity.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, type: true },
      });
      if (!existing) throw new Error("NOT_FOUND");

      // cascade delete는 schema에서 처리 (AssetLink onDelete: Cascade)
      await tx.externalEntity.delete({ where: { id: entityId } });

      await writeAuditLog(tx, {
        entityType: "ASSET_LINK",
        entityId: existing.id,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          entityName: "ExternalEntity",
          name: existing.name,
          type: existing.type,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "외부 엔티티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error("Failed to delete external entity:", error);
    return NextResponse.json(
      { error: "외부 엔티티 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
