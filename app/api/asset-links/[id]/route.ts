// PUT    — 자산 연결(AssetLink) 수정
// DELETE — 자산 연결 삭제

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

const LINK_TYPES = ["DATA_FLOW", "NETWORK", "DEPENDENCY", "AUTH"] as const;
const DIRECTIONS = ["UNI", "BI", "REVERSE", "CONDITIONAL"] as const; // POST 와 통일 — 기존 2값이라 REVERSE/CONDITIONAL 수정 시 400 거부됐다 (dev-048 이슈5)

type Params = { params: Promise<{ id: string }> };

// ── PUT /api/asset-links/[id] — 자산 연결 수정 ──

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const linkId = Number(id);
    if (isNaN(linkId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    const body = await request.json();

    const updated = await prisma.$transaction(async (tx) => {
      // 기존 연결 존재 확인
      const existing = await tx.assetLink.findUnique({
        where: { id: linkId },
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      // 부분 수정 — 전달된 필드만 업데이트
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};

      // 소스 — 자산/외부엔티티 4종 모두 수정 지원 (POST 대칭). 자산↔외부는 상호 배타라 한쪽 설정 시 반대 ID를 null로.
      // 기존 PUT은 자산 ID만 처리해 외부엔티티 연결을 수정할 수 없었고, NaN(예: Number("ext-5"))이
      // typeof === "number" 가드를 통과해 무음 404로 떨어졌다 (dev-049 #13/#14) → Number.isInteger 로 강화.
      if (body.sourceAssetId !== undefined && body.sourceAssetId !== null) {
        if (!Number.isInteger(body.sourceAssetId)) throw new Error("INVALID_SOURCE");
        const source = await tx.asset.findUnique({ where: { id: body.sourceAssetId }, select: { id: true } });
        if (!source) throw new Error("SOURCE_NOT_FOUND");
        data.sourceAssetId = body.sourceAssetId;
        data.sourceExternalId = null;
      } else if (body.sourceExternalId !== undefined && body.sourceExternalId !== null) {
        if (!Number.isInteger(body.sourceExternalId)) throw new Error("INVALID_SOURCE");
        const ext = await tx.externalEntity.findUnique({ where: { id: body.sourceExternalId }, select: { id: true } });
        if (!ext) throw new Error("SOURCE_NOT_FOUND");
        data.sourceExternalId = body.sourceExternalId;
        data.sourceAssetId = null;
      }

      // 타겟 — 동일 규칙
      if (body.targetAssetId !== undefined && body.targetAssetId !== null) {
        if (!Number.isInteger(body.targetAssetId)) throw new Error("INVALID_TARGET");
        const target = await tx.asset.findUnique({ where: { id: body.targetAssetId }, select: { id: true } });
        if (!target) throw new Error("TARGET_NOT_FOUND");
        data.targetAssetId = body.targetAssetId;
        data.targetExternalId = null;
      } else if (body.targetExternalId !== undefined && body.targetExternalId !== null) {
        if (!Number.isInteger(body.targetExternalId)) throw new Error("INVALID_TARGET");
        const ext = await tx.externalEntity.findUnique({ where: { id: body.targetExternalId }, select: { id: true } });
        if (!ext) throw new Error("TARGET_NOT_FOUND");
        data.targetExternalId = body.targetExternalId;
        data.targetAssetId = null;
      }

      // 자기 연결 방지 — data 에 키가 있으면(명시 변경) 그 값, 없으면 기존값. 같은 종류(자산↔자산, 외부↔외부) 동일 ID 금지.
      const has = (k: string) => Object.prototype.hasOwnProperty.call(data, k);
      const finalSourceAsset = has("sourceAssetId") ? data.sourceAssetId : existing.sourceAssetId;
      const finalTargetAsset = has("targetAssetId") ? data.targetAssetId : existing.targetAssetId;
      const finalSourceExternal = has("sourceExternalId") ? data.sourceExternalId : existing.sourceExternalId;
      const finalTargetExternal = has("targetExternalId") ? data.targetExternalId : existing.targetExternalId;
      if (finalSourceAsset != null && finalSourceAsset === finalTargetAsset) throw new Error("SELF_LINK");
      if (finalSourceExternal != null && finalSourceExternal === finalTargetExternal) throw new Error("SELF_LINK");

      if (body.linkType !== undefined) {
        if (!LINK_TYPES.includes(body.linkType)) {
          throw new Error("INVALID_LINK_TYPE");
        }
        data.linkType = body.linkType;
      }

      if (body.direction !== undefined) {
        if (!DIRECTIONS.includes(body.direction)) {
          throw new Error("INVALID_DIRECTION");
        }
        data.direction = body.direction;
      }

      if (body.label !== undefined) data.label = body.label;
      if (body.dataTypes !== undefined) {
        data.dataTypes = body.dataTypes ? JSON.stringify(body.dataTypes) : null;
      }
      if (body.piiItems !== undefined) {
        data.piiItems = body.piiItems ? JSON.stringify(body.piiItems) : null;
      }
      if (body.protocol !== undefined) data.protocol = body.protocol;
      if (body.legalBasis !== undefined) data.legalBasis = body.legalBasis;
      if (body.retentionPeriod !== undefined) data.retentionPeriod = body.retentionPeriod;
      if (body.destructionMethod !== undefined) data.destructionMethod = body.destructionMethod;
      if (body.condition !== undefined) data.condition = body.condition; // CONDITIONAL 활성화 조건 (dev-048 이슈5)

      const result = await tx.assetLink.update({
        where: { id: linkId },
        data,
        include: {
          sourceAsset: { select: { id: true, name: true, type: true, status: true } },
          targetAsset: { select: { id: true, name: true, type: true, status: true } },
          sourceExternal: { select: { id: true, name: true, type: true } },
          targetExternal: { select: { id: true, name: true, type: true } },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ASSET_LINK",
        entityId: linkId,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: data,
      });

      return result;
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "NOT_FOUND":
          return NextResponse.json(
            { error: "자산 연결을 찾을 수 없습니다." },
            { status: 404 },
          );
        case "SOURCE_NOT_FOUND":
          return NextResponse.json(
            { error: "소스 자산을 찾을 수 없습니다." },
            { status: 404 },
          );
        case "TARGET_NOT_FOUND":
          return NextResponse.json(
            { error: "타겟 자산을 찾을 수 없습니다." },
            { status: 404 },
          );
        case "SELF_LINK":
          return NextResponse.json(
            { error: "자기 자신과의 연결은 허용되지 않습니다." },
            { status: 400 },
          );
        case "INVALID_SOURCE":
          return NextResponse.json(
            { error: "sourceAssetId는 숫자여야 합니다." },
            { status: 400 },
          );
        case "INVALID_TARGET":
          return NextResponse.json(
            { error: "targetAssetId는 숫자여야 합니다." },
            { status: 400 },
          );
        case "INVALID_LINK_TYPE":
          return NextResponse.json(
            { error: `linkType 허용값: ${LINK_TYPES.join(", ")}` },
            { status: 400 },
          );
        case "INVALID_DIRECTION":
          return NextResponse.json(
            { error: `direction 허용값: ${DIRECTIONS.join(", ")}` },
            { status: 400 },
          );
      }
    }
    console.error("Failed to update asset link:", error);
    return NextResponse.json(
      { error: "자산 연결 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── DELETE /api/asset-links/[id] — 자산 연결 삭제 ──

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const linkId = Number(id);
    if (isNaN(linkId)) {
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.assetLink.findUnique({
        where: { id: linkId },
        include: {
          sourceAsset: { select: { name: true } },
          targetAsset: { select: { name: true } },
          sourceExternal: { select: { name: true } },
          targetExternal: { select: { name: true } },
        },
      });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      await tx.assetLink.delete({ where: { id: linkId } });

      await writeAuditLog(tx, {
        entityType: "ASSET_LINK",
        entityId: linkId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          sourceAssetId: existing.sourceAssetId,
          targetAssetId: existing.targetAssetId,
          linkType: existing.linkType,
          sourceName: existing.sourceAsset?.name ?? existing.sourceExternal?.name ?? null,
          targetName: existing.targetAsset?.name ?? existing.targetExternal?.name ?? null,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "자산 연결을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    console.error("Failed to delete asset link:", error);
    return NextResponse.json(
      { error: "자산 연결 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
