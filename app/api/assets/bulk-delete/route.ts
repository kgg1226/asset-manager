// POST /api/assets/bulk-delete — 자산 일괄 삭제 (관리자 전용)
// 단건 DELETE 반복 대비 네트워크 왕복 1회 + DB 트랜잭션 1회로 성능 개선

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();
    const ids: number[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "삭제할 자산 ID 배열이 필요합니다." },
        { status: 400 },
      );
    }

    if (ids.length > 200) {
      return NextResponse.json(
        { error: "한 번에 최대 200개까지 삭제할 수 있습니다." },
        { status: 400 },
      );
    }

    // 삭제 대상 자산 조회 (존재하는 것만)
    const assets = await prisma.asset.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    if (assets.length === 0) {
      return NextResponse.json(
        { error: "삭제할 자산을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const foundIds = assets.map((a) => a.id);

    // 단일 트랜잭션으로 일괄 삭제 + 감사 로그
    await prisma.$transaction(async (tx) => {
      // cascade로 관련 테이블 자동 삭제 (deleteMany는 cascade 지원)
      await tx.asset.deleteMany({
        where: { id: { in: foundIds } },
      });

      // 일괄 감사 로그 (건별이 아닌 1건으로)
      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: foundIds[0],
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          bulkDelete: true,
          count: foundIds.length,
          names: assets.map((a) => a.name),
          ids: foundIds,
        },
      });
    });

    return NextResponse.json({
      deleted: foundIds.length,
      notFound: ids.length - foundIds.length,
    });
  } catch (error) {
    console.error("Bulk delete failed:", error);
    return NextResponse.json(
      { error: "일괄 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
