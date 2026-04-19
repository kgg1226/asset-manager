// PATCH /api/assets/bulk-tag — 하드웨어 자산 태그 일괄 수정 (관리자 전용)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type TagEntry = { id: number; assetTag: string };

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const entries: TagEntry[] = body?.entries;

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "entries 배열이 필요합니다." }, { status: 400 });
  }
  if (entries.length > 200) {
    return NextResponse.json({ error: "한 번에 최대 200개까지 수정할 수 있습니다." }, { status: 400 });
  }

  const ids = entries.map((e) => e.id);

  // Deduplicate tags within the batch
  const tagCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.assetTag.trim()) tagCounts.set(e.assetTag.trim(), (tagCounts.get(e.assetTag.trim()) ?? 0) + 1);
  }
  const dupsInBatch = [...tagCounts.entries()].filter(([, cnt]) => cnt > 1).map(([tag]) => tag);
  if (dupsInBatch.length > 0) {
    return NextResponse.json({ error: `배치 내 중복 태그: ${dupsInBatch.join(", ")}` }, { status: 400 });
  }

  // Check existing tags in DB (excluding current assets)
  const nonEmptyTags = [...tagCounts.keys()];
  if (nonEmptyTags.length > 0) {
    const conflicts = await prisma.hardwareDetail.findMany({
      where: { assetTag: { in: nonEmptyTags }, assetId: { notIn: ids } },
      select: { assetTag: true },
    });
    if (conflicts.length > 0) {
      return NextResponse.json({ error: `이미 사용 중인 태그: ${conflicts.map((c) => c.assetTag).join(", ")}` }, { status: 409 });
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const { id, assetTag } of entries) {
      await tx.hardwareDetail.updateMany({
        where: { assetId: id },
        data: { assetTag: assetTag.trim() || null },
      });
    }
    await writeAuditLog(tx, {
      entityType: "ASSET",
      entityId: ids[0],
      action: "UPDATED",
      actor: user.username,
      actorType: "USER",
      actorId: user.id,
      details: {
        summary: `자산 태그 일괄 수정 ${entries.length}건`,
        entries: entries.map((e) => ({ id: e.id, assetTag: e.assetTag })),
      },
    });
  });

  return NextResponse.json({ updated: entries.length });
}
