// BE-052: GET /api/admin/archives/[id]/status
// BE-054: DELETE /api/admin/archives/[id]

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const archiveId = Number(id);
  if (isNaN(archiveId)) return NextResponse.json({ error: "잘못된 ID입니다." }, { status: 400 });

  const archive = await prisma.archive.findUnique({
    where: { id: archiveId },
    include: {
      category: { select: { id: true, name: true } },
      logs: { orderBy: { createdAt: "asc" } },
      data: { select: { dataType: true, recordCount: true } },
    },
  });

  if (!archive) return NextResponse.json({ error: "증적을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(archive);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  const { id } = await params;
  const archiveId = Number(id);
  if (isNaN(archiveId)) return NextResponse.json({ error: "잘못된 ID입니다." }, { status: 400 });

  const archive = await prisma.archive.findUnique({ where: { id: archiveId } });
  if (!archive) return NextResponse.json({ error: "증적을 찾을 수 없습니다." }, { status: 404 });

  if (archive.status === "RUNNING") {
    return NextResponse.json({ error: "진행 중인 증적은 삭제할 수 없습니다." }, { status: 409 });
  }

  await prisma.archive.delete({ where: { id: archiveId } });

  await writeAuditLog(prisma, {
    entityType: "ARCHIVE",
    entityId: archiveId,
    action: "DELETED",
    actor: user.username,
    details: { summary: `${archive.yearMonth} 증적 삭제` },
  });

  return NextResponse.json({ ok: true });
}
