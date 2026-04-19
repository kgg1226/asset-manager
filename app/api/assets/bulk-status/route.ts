// PATCH /api/assets/bulk-status — 자산 상태 일괄 변경 (관리자 전용)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

const VALID_STATUSES = ["IN_STOCK", "IN_USE", "INACTIVE", "UNUSABLE", "PENDING_DISPOSAL", "DISPOSED"] as const;
type AssetStatus = typeof VALID_STATUSES[number];

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const ids: number[] = body?.ids;
  const status: AssetStatus = body?.status;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids 배열이 필요합니다." }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `유효하지 않은 상태입니다. 허용: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: "한 번에 최대 200개까지 변경할 수 있습니다." }, { status: 400 });
  }

  const assets = await prisma.asset.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, status: true },
  });

  if (assets.length === 0) {
    return NextResponse.json({ error: "대상 자산을 찾을 수 없습니다." }, { status: 404 });
  }

  const foundIds = assets.map((a) => a.id);

  await prisma.$transaction(async (tx) => {
    await tx.asset.updateMany({
      where: { id: { in: foundIds } },
      data: { status },
    });

    await writeAuditLog(tx, {
      entityType: "ASSET",
      entityId: foundIds[0],
      action: "STATUS_CHANGED",
      actor: user.username,
      actorType: "USER",
      actorId: user.id,
      details: {
        summary: `상태 일괄 변경 ${assets.length}건 → ${status}`,
        ids: foundIds,
        toStatus: status,
        fromStatuses: assets.map((a) => ({ id: a.id, from: a.status })),
      },
    });
  });

  return NextResponse.json({ updated: foundIds.length });
}
