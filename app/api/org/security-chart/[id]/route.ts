import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/org/security-chart/:id — 노드 수정 (직책명, 담당자)
export async function PUT(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  const nodeId = Number(id);
  if (isNaN(nodeId)) return NextResponse.json({ error: "잘못된 ID입니다." }, { status: 400 });

  try {
    const body = await request.json();
    const title = (body.title as string)?.trim();
    if (!title) return NextResponse.json({ error: "직책명은 필수입니다." }, { status: 400 });

    const employeeId = body.employeeId !== undefined
      ? (body.employeeId ? Number(body.employeeId) : null)
      : undefined;

    const existing = await prisma.securityOrgChart.findUnique({ where: { id: nodeId } });
    if (!existing) return NextResponse.json({ error: "노드를 찾을 수 없습니다." }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const node = await tx.securityOrgChart.update({
        where: { id: nodeId },
        data: {
          title,
          ...(employeeId !== undefined ? { employeeId } : {}),
        },
        include: {
          employee: { select: { id: true, name: true, department: true, title: true } },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ORG",
        entityId: nodeId,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { type: "SecurityOrgChart", title, employeeId: employeeId ?? null },
      });

      return node;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update security org node:", error);
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

// DELETE /api/org/security-chart/:id — 노드 삭제 (하위 포함 cascade)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  const nodeId = Number(id);
  if (isNaN(nodeId)) return NextResponse.json({ error: "잘못된 ID입니다." }, { status: 400 });

  try {
    const existing = await prisma.securityOrgChart.findUnique({ where: { id: nodeId } });
    if (!existing) return NextResponse.json({ error: "노드를 찾을 수 없습니다." }, { status: 404 });

    // BFS로 모든 하위 노드 ID 수집
    const allNodes = await prisma.securityOrgChart.findMany({
      select: { id: true, parentId: true },
    });

    const idsToDelete: number[] = [];
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      idsToDelete.push(current);
      for (const n of allNodes) {
        if (n.parentId === current) queue.push(n.id);
      }
    }

    await prisma.$transaction(async (tx) => {
      // 역순 삭제 (리프 → 루트)
      await tx.securityOrgChart.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      await writeAuditLog(tx, {
        entityType: "ORG",
        entityId: nodeId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { type: "SecurityOrgChart", title: existing.title, deletedIds: idsToDelete },
      });
    });

    return NextResponse.json({ ok: true, deletedCount: idsToDelete.length });
  } catch (error) {
    console.error("Failed to delete security org node:", error);
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
