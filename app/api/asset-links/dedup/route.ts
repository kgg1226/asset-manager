// POST /api/asset-links/dedup — 중복 자산 연결 정리 (dev-054)
//
// 테스트·반복 생성으로 누적된 중복 연결(같은 엔드포인트쌍 + linkType + direction)을
// 그룹당 1개만 남기고 삭제한다. { dryRun: true } 면 삭제 없이 그룹 현황만 보고.
//
// 중복 키에 direction 을 포함하는 이유: REVERSE 는 렌더 방향이 반대이고 BI/CONDITIONAL 은
// 의미가 달라, direction 이 다른 연결을 중복으로 지우면 기능 삭제에 해당한다(파괴 방지).
// A→B 와 B→A 도 별개로 취급(보수적).
//
// 생존자 선정: ① 메타 점수(piiItems 항목수×10 — PII 증적 최우선 + 비어있지 않은
// 메타 필드 수) 최고 → ② updatedAt 최신 → ③ id 최대.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type LinkRow = {
  id: number;
  sourceAssetId: number | null;
  targetAssetId: number | null;
  sourceExternalId: number | null;
  targetExternalId: number | null;
  linkType: string;
  direction: string;
  label: string | null;
  dataTypes: string | null;
  piiItems: string | null;
  protocol: string | null;
  legalBasis: string | null;
  retentionPeriod: string | null;
  destructionMethod: string | null;
  condition: string | null;
  updatedAt: Date;
};

function metaScore(link: LinkRow): number {
  let piiCount = 0;
  if (link.piiItems) {
    try {
      const arr = JSON.parse(link.piiItems);
      if (Array.isArray(arr)) piiCount = arr.length;
    } catch {
      piiCount = 1; // 레거시 자유텍스트도 메타 보유로 취급
    }
  }
  const metaFields = [
    link.label, link.dataTypes, link.protocol, link.legalBasis,
    link.retentionPeriod, link.destructionMethod, link.condition,
  ].filter((v) => v != null && String(v).trim() !== "").length;
  return piiCount * 10 + metaFields;
}

function groupKey(link: LinkRow): string {
  return [
    link.sourceAssetId ?? "-", link.sourceExternalId ?? "-",
    link.targetAssetId ?? "-", link.targetExternalId ?? "-",
    link.linkType, link.direction,
  ].join("|");
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    const result = await prisma.$transaction(async (tx) => {
      const links = (await tx.assetLink.findMany({
        orderBy: { id: "asc" },
      })) as LinkRow[];

      // 그룹핑 → 2개 이상인 그룹만 중복
      const groups = new Map<string, LinkRow[]>();
      for (const link of links) {
        const key = groupKey(link);
        const arr = groups.get(key);
        if (arr) arr.push(link);
        else groups.set(key, [link]);
      }

      const keptIds: number[] = [];
      const deletedIds: number[] = [];
      let dupGroups = 0;

      for (const members of groups.values()) {
        if (members.length < 2) continue;
        dupGroups++;
        // 생존자: 메타 점수 → updatedAt → id
        const sorted = [...members].sort((a, b) => {
          const score = metaScore(b) - metaScore(a);
          if (score !== 0) return score;
          const time = b.updatedAt.getTime() - a.updatedAt.getTime();
          if (time !== 0) return time;
          return b.id - a.id;
        });
        const keep = sorted[0];
        keptIds.push(keep.id);
        deletedIds.push(...sorted.slice(1).map((l) => l.id));
      }

      if (!dryRun && deletedIds.length > 0) {
        await tx.assetLink.deleteMany({ where: { id: { in: deletedIds } } });
        for (let i = 0; i < deletedIds.length; i++) {
          await writeAuditLog(tx, {
            entityType: "ASSET_LINK",
            entityId: deletedIds[i],
            action: "DELETED",
            actor: user.username,
            actorType: "USER",
            actorId: user.id,
            details: { dedup: true, totalDeleted: deletedIds.length },
          });
        }
      }

      return { groups: dupGroups, deleted: dryRun ? 0 : deletedIds.length, keptIds, deletedIds, dryRun };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to dedup asset links:", error);
    return NextResponse.json(
      { error: "중복 연결 정리에 실패했습니다." },
      { status: 500 },
    );
  }
}
