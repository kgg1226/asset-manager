// GET  — 자산 연결(AssetLink) 목록 조회
// POST — 자산 연결 생성

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

const LINK_TYPES = ["DATA_FLOW", "NETWORK", "DEPENDENCY", "AUTH"] as const;
const DIRECTIONS = ["UNI", "BI", "REVERSE", "CONDITIONAL"] as const;

// ── GET /api/asset-links — 자산 연결 목록 조회 ──

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const links = await prisma.assetLink.findMany({
      include: {
        sourceAsset: { select: { id: true, name: true, type: true, status: true } },
        targetAsset: { select: { id: true, name: true, type: true, status: true } },
        sourceExternal: { select: { id: true, name: true, type: true } },
        targetExternal: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error("Failed to fetch asset links:", error);
    return NextResponse.json(
      { error: "자산 연결 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── POST /api/asset-links — 자산 연결 생성 ──

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();

    // ── 필수 필드 검증 ──
    const { sourceAssetId, targetAssetId, sourceExternalId, targetExternalId, linkType } = body;

    // Source: either sourceAssetId or sourceExternalId must be provided
    const hasSourceAsset = sourceAssetId != null && typeof sourceAssetId === "number";
    const hasSourceExternal = sourceExternalId != null && typeof sourceExternalId === "number";
    if (!hasSourceAsset && !hasSourceExternal) {
      return NextResponse.json(
        { error: "sourceAssetId 또는 sourceExternalId 중 하나는 필수입니다." },
        { status: 400 },
      );
    }

    // Target: either targetAssetId or targetExternalId must be provided
    const hasTargetAsset = targetAssetId != null && typeof targetAssetId === "number";
    const hasTargetExternal = targetExternalId != null && typeof targetExternalId === "number";
    if (!hasTargetAsset && !hasTargetExternal) {
      return NextResponse.json(
        { error: "targetAssetId 또는 targetExternalId 중 하나는 필수입니다." },
        { status: 400 },
      );
    }

    // Self-link check: same entity type AND same ID
    if (hasSourceAsset && hasTargetAsset && sourceAssetId === targetAssetId) {
      return NextResponse.json(
        { error: "자기 자신과의 연결은 허용되지 않습니다." },
        { status: 400 },
      );
    }
    if (hasSourceExternal && hasTargetExternal && sourceExternalId === targetExternalId) {
      return NextResponse.json(
        { error: "자기 자신과의 연결은 허용되지 않습니다." },
        { status: 400 },
      );
    }

    if (!linkType || !LINK_TYPES.includes(linkType)) {
      return NextResponse.json(
        { error: `linkType은 필수입니다. 허용값: ${LINK_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    // direction 검증 (기본값 UNI)
    const direction = body.direction ?? "UNI";
    if (!DIRECTIONS.includes(direction)) {
      return NextResponse.json(
        { error: `direction 허용값: ${DIRECTIONS.join(", ")}` },
        { status: 400 },
      );
    }

    const link = await prisma.$transaction(async (tx) => {
      // 소스 자산/외부조직 존재 검증
      let sourceName = "";
      if (hasSourceAsset) {
        const sourceAsset = await tx.asset.findUnique({
          where: { id: sourceAssetId },
          select: { id: true, name: true },
        });
        if (!sourceAsset) throw new Error("SOURCE_NOT_FOUND");
        sourceName = sourceAsset.name;
      } else {
        const sourceExternal = await tx.externalEntity.findUnique({
          where: { id: sourceExternalId },
          select: { id: true, name: true },
        });
        if (!sourceExternal) throw new Error("SOURCE_NOT_FOUND");
        sourceName = sourceExternal.name;
      }

      // 타겟 자산/외부조직 존재 검증
      let targetName = "";
      if (hasTargetAsset) {
        const targetAsset = await tx.asset.findUnique({
          where: { id: targetAssetId },
          select: { id: true, name: true },
        });
        if (!targetAsset) throw new Error("TARGET_NOT_FOUND");
        targetName = targetAsset.name;
      } else {
        const targetExternal = await tx.externalEntity.findUnique({
          where: { id: targetExternalId },
          select: { id: true, name: true },
        });
        if (!targetExternal) throw new Error("TARGET_NOT_FOUND");
        targetName = targetExternal.name;
      }

      // AssetLink 생성
      const created = await tx.assetLink.create({
        data: {
          sourceAssetId: hasSourceAsset ? sourceAssetId : null,
          targetAssetId: hasTargetAsset ? targetAssetId : null,
          sourceExternalId: hasSourceExternal ? sourceExternalId : null,
          targetExternalId: hasTargetExternal ? targetExternalId : null,
          linkType,
          direction,
          label: body.label ?? null,
          dataTypes: body.dataTypes ? JSON.stringify(body.dataTypes) : null,
          piiItems: body.piiItems ? JSON.stringify(body.piiItems) : null,
          protocol: body.protocol ?? null,
          legalBasis: body.legalBasis ?? null,
          retentionPeriod: body.retentionPeriod ?? null,
          destructionMethod: body.destructionMethod ?? null,
          sourceHandle: body.sourceHandle ?? null,
          targetHandle: body.targetHandle ?? null,
        },
        include: {
          sourceAsset: { select: { id: true, name: true, type: true, status: true } },
          targetAsset: { select: { id: true, name: true, type: true, status: true } },
          sourceExternal: { select: { id: true, name: true, type: true } },
          targetExternal: { select: { id: true, name: true, type: true } },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ASSET_LINK",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          sourceAssetId: hasSourceAsset ? sourceAssetId : null,
          targetAssetId: hasTargetAsset ? targetAssetId : null,
          sourceExternalId: hasSourceExternal ? sourceExternalId : null,
          targetExternalId: hasTargetExternal ? targetExternalId : null,
          linkType,
          direction,
          sourceName,
          targetName,
        },
      });

      return created;
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SOURCE_NOT_FOUND") {
        return NextResponse.json(
          { error: "소스 자산/외부조직을 찾을 수 없습니다." },
          { status: 404 },
        );
      }
      if (error.message === "TARGET_NOT_FOUND") {
        return NextResponse.json(
          { error: "타겟 자산/외부조직을 찾을 수 없습니다." },
          { status: 404 },
        );
      }
    }
    console.error("Failed to create asset link:", error);
    return NextResponse.json(
      { error: "자산 연결 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
