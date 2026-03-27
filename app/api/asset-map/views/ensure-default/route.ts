// POST — 페이지 목록 조회 (초기 로드용)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    // 전체 페이지 목록 (내 것 + 공유)
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

    const defaultView = parsed.find((v) => v.isDefault) || parsed[0] || null;

    return NextResponse.json({
      defaultView,
      views: parsed,
    });
  } catch (error) {
    console.error("Failed to load pages:", error);
    return NextResponse.json(
      { error: "페이지 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
