// POST — 기본 워크스페이스 보장 (없으면 생성, 있으면 반환)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    // 사용자의 기본 워크스페이스 조회
    let defaultView = await prisma.assetMapView.findFirst({
      where: { createdBy: user.id, isDefault: true },
    });

    // 없으면 자동 생성
    if (!defaultView) {
      defaultView = await prisma.assetMapView.create({
        data: {
          name: "기본 페이지",
          viewType: "ALL",
          isDefault: true,
          createdBy: user.id,
          lastAccessedAt: new Date(),
        },
      });
    }

    // 전체 워크스페이스 목록 (내 것 + 공유)
    const views = await prisma.assetMapView.findMany({
      where: {
        OR: [{ createdBy: user.id }, { isShared: true }],
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

    return NextResponse.json({
      defaultView: parsed.find((v) => v.id === defaultView!.id),
      views: parsed,
    });
  } catch (error) {
    console.error("Failed to ensure default workspace:", error);
    return NextResponse.json(
      { error: "기본 워크스페이스 확보에 실패했습니다." },
      { status: 500 },
    );
  }
}
