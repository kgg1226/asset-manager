// GET  — 자산 맵 뷰 목록 조회
// POST — 자산 맵 뷰 생성

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

const VIEW_TYPES = ["ALL", "PII", "NETWORK", "DATA_FLOW", "CUSTOM"] as const;

// ── GET /api/asset-map/views — 자산 맵 뷰 목록 조회 ──

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    // 본인이 만든 뷰 + 공유된 뷰
    const views = await prisma.assetMapView.findMany({
      where: {
        OR: [
          { createdBy: user.id },
          { isShared: true },
        ],
      },
      orderBy: [{ lastAccessedAt: "desc" }, { createdAt: "desc" }],
    });

    const parseJson = (v: string | null | undefined) => {
      if (!v || typeof v !== "string") return v ?? null;
      try { return JSON.parse(v); } catch { return null; }
    };

    const parsed = views.map((v) => ({
      ...v,
      nodePositions: parseJson(v.nodePositions),
      sectionData: parseJson(v.sectionData),
      viewport: parseJson(v.viewport),
      edgeVisibility: parseJson(v.edgeVisibility),
      filterConfig: parseJson(v.filterConfig),
    }));

    return NextResponse.json({ views: parsed });
  } catch (error) {
    console.error("Failed to fetch asset map views:", error);
    return NextResponse.json(
      { error: "자산 맵 뷰 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── POST /api/asset-map/views — 자산 맵 뷰 생성 ──

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();

    // ── 필수 필드 검증 ──
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name은 필수입니다." },
        { status: 400 },
      );
    }

    // viewType 검증 (기본값 ALL)
    const viewType = body.viewType ?? "ALL";
    if (!VIEW_TYPES.includes(viewType)) {
      return NextResponse.json(
        { error: `viewType 허용값: ${VIEW_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const view = await prisma.$transaction(async (tx) => {
      const toJsonStr = (v: unknown) => {
        if (!v) return null;
        return typeof v === "string" ? v : JSON.stringify(v);
      };

      const created = await tx.assetMapView.create({
        data: {
          name: name.trim(),
          description: body.description ?? null,
          viewType,
          nodePositions: toJsonStr(body.nodePositions),
          sectionData: toJsonStr(body.sectionData),
          viewport: toJsonStr(body.viewport),
          edgeVisibility: toJsonStr(body.edgeVisibility),
          filterConfig: toJsonStr(body.filterConfig),
          isDefault: body.isDefault ?? false,
          createdBy: user.id,
          isShared: body.isShared ?? false,
        },
      });

      await writeAuditLog(tx, {
        entityType: "SYSTEM_CONFIG",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          entityName: "AssetMapView",
          name: created.name,
          viewType: created.viewType,
          isShared: created.isShared,
        },
      });

      return created;
    });

    const parsed = {
      ...view,
      nodePositions: typeof view.nodePositions === "string"
        ? JSON.parse(view.nodePositions)
        : view.nodePositions,
    };
    return NextResponse.json(parsed, { status: 201 });
  } catch (error) {
    console.error("Failed to create asset map view:", error);
    return NextResponse.json(
      { error: "자산 맵 뷰 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
