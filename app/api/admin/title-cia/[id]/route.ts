// PUT /api/admin/title-cia/[id] — 직책별 CIA 매핑 수정
// DELETE /api/admin/title-cia/[id] — 직책별 CIA 매핑 삭제

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const mappingId = Number(id);
    const body = await request.json();
    const { title, ciaC, ciaI, ciaA } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "직책명은 필수입니다." },
        { status: 400 }
      );
    }

    const validCia = (v: unknown) =>
      typeof v === "number" && [1, 2, 3].includes(v);
    if (!validCia(ciaC) || !validCia(ciaI) || !validCia(ciaA)) {
      return NextResponse.json(
        { error: "CIA 등급은 1(하), 2(중), 3(상) 중 하나여야 합니다." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.titleCiaMapping.findUnique({
        where: { id: mappingId },
      });

      if (!existing) {
        return { error: "매핑을 찾을 수 없습니다.", status: 404 };
      }

      const updated = await tx.titleCiaMapping.update({
        where: { id: mappingId },
        data: {
          title: title.trim(),
          ciaC,
          ciaI,
          ciaA,
        },
      });

      // 변경 내역 기록
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (existing.title !== updated.title)
        changes.title = { from: existing.title, to: updated.title };
      if (existing.ciaC !== updated.ciaC)
        changes.ciaC = { from: existing.ciaC, to: updated.ciaC };
      if (existing.ciaI !== updated.ciaI)
        changes.ciaI = { from: existing.ciaI, to: updated.ciaI };
      if (existing.ciaA !== updated.ciaA)
        changes.ciaA = { from: existing.ciaA, to: updated.ciaA };

      if (Object.keys(changes).length > 0) {
        await writeAuditLog(tx, {
          entityType: "SYSTEM_CONFIG",
          entityId: mappingId,
          action: "UPDATED",
          actor: user.username,
          actorType: "USER",
          actorId: user.id,
          details: {
            summary: `직책 CIA 매핑 수정: ${updated.title}`,
            changes,
          },
        });
      }

      // 이전 직책명과 새 직책명에 해당하는 모든 하드웨어 자산 CIA 갱신
      const titlesToUpdate = new Set([existing.title, updated.title]);
      let affectedCount = 0;

      for (const t of titlesToUpdate) {
        const affectedAssets = await tx.asset.findMany({
          where: {
            type: "HARDWARE",
            assignee: { title: t },
          },
          select: { id: true },
        });

        if (affectedAssets.length > 0) {
          // 새 직책명과 일치하는 자산만 새 CIA 적용, 이전 직책 → null
          if (t === updated.title) {
            await tx.asset.updateMany({
              where: { id: { in: affectedAssets.map((a) => a.id) } },
              data: { ciaC: updated.ciaC, ciaI: updated.ciaI, ciaA: updated.ciaA },
            });
          } else if (t !== updated.title) {
            // 이전 직책명에서 변경된 경우, 해당 자산은 더 이상 매핑이 없으므로 CIA 초기화
            // (단, 새 직책명으로 매핑이 있는 경우는 제외)
            const newMapping = await tx.titleCiaMapping.findUnique({
              where: { title: t },
            });
            if (!newMapping) {
              await tx.asset.updateMany({
                where: { id: { in: affectedAssets.map((a) => a.id) } },
                data: { ciaC: null, ciaI: null, ciaA: null },
              });
            }
          }
          affectedCount += affectedAssets.length;
        }
      }

      return { mapping: updated, affectedCount };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unique constraint") ||
        error.message.includes("UNIQUE constraint"))
    ) {
      return NextResponse.json(
        { error: "이미 등록된 직책명입니다." },
        { status: 409 }
      );
    }
    console.error("Failed to update title-cia mapping:", error);
    return NextResponse.json(
      { error: "직책 CIA 매핑 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const mappingId = Number(id);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.titleCiaMapping.findUnique({
        where: { id: mappingId },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      // 해당 직책의 할당된 하드웨어 자산 CIA 초기화
      const affectedAssets = await tx.asset.findMany({
        where: {
          type: "HARDWARE",
          assignee: { title: existing.title },
        },
        select: { id: true },
      });

      if (affectedAssets.length > 0) {
        await tx.asset.updateMany({
          where: { id: { in: affectedAssets.map((a) => a.id) } },
          data: { ciaC: null, ciaI: null, ciaA: null },
        });
      }

      await writeAuditLog(tx, {
        entityType: "SYSTEM_CONFIG",
        entityId: mappingId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          summary: `직책 CIA 매핑 삭제: ${existing.title}`,
          affectedAssets: affectedAssets.length,
        },
      });

      await tx.titleCiaMapping.delete({ where: { id: mappingId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "매핑을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    console.error("Failed to delete title-cia mapping:", error);
    return NextResponse.json(
      { error: "직책 CIA 매핑 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
