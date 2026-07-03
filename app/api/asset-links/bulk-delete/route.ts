// POST /api/asset-links/bulk-delete — 자산 연결 일괄 삭제 (dev-054)
//
// 자산맵 다중 선택 삭제(dev-055)의 서버부. 단건 DELETE([id]/route.ts) N회 대신
// 트랜잭션 1회로 처리해 부분 실패로 인한 UI/DB 불일치를 막는다.
// 권한은 기존 단건 DELETE 와 동일(인증 사용자) — 비대칭 방지.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

const MAX_BATCH = 200;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();

    // ids 검증 — 배열·1~200개·정수만 (Number.isInteger: NaN 통과 사고 방지, dev-049 #13 교훈)
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "ids 배열이 필요합니다." }, { status: 400 });
    }
    const ids = [...new Set(body.ids as unknown[])].filter((v): v is number => Number.isInteger(v));
    if (ids.length === 0 || ids.length !== new Set(body.ids).size) {
      return NextResponse.json({ error: "ids 는 정수 배열이어야 합니다." }, { status: 400 });
    }
    if (ids.length > MAX_BATCH) {
      return NextResponse.json({ error: `한 번에 최대 ${MAX_BATCH}개까지 삭제할 수 있습니다.` }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.assetLink.findMany({
        where: { id: { in: ids } },
        include: {
          sourceAsset: { select: { name: true } },
          targetAsset: { select: { name: true } },
          sourceExternal: { select: { name: true } },
          targetExternal: { select: { name: true } },
        },
      });
      const foundIds = new Set(existing.map((l) => l.id));
      const notFound = ids.filter((id) => !foundIds.has(id));

      if (existing.length > 0) {
        await tx.assetLink.deleteMany({ where: { id: { in: [...foundIds] } } });

        for (const link of existing) {
          await writeAuditLog(tx, {
            entityType: "ASSET_LINK",
            entityId: link.id,
            action: "DELETED",
            actor: user.username,
            actorType: "USER",
            actorId: user.id,
            details: {
              sourceAssetId: link.sourceAssetId,
              targetAssetId: link.targetAssetId,
              linkType: link.linkType,
              sourceName: link.sourceAsset?.name ?? link.sourceExternal?.name ?? null,
              targetName: link.targetAsset?.name ?? link.targetExternal?.name ?? null,
              bulk: true,
              batchSize: existing.length,
            },
          });
        }
      }

      return { deleted: existing.length, notFound };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to bulk-delete asset links:", error);
    return NextResponse.json(
      { error: "자산 연결 일괄 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
