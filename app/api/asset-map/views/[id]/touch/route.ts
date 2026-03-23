// PATCH — 워크스페이스 lastAccessedAt 갱신 (전환 시 호출)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const viewId = Number(id);
    if (isNaN(viewId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    await prisma.assetMapView.update({
      where: { id: viewId },
      data: { lastAccessedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to touch workspace:", error);
    return NextResponse.json(
      { error: "워크스페이스 접근 시각 갱신에 실패했습니다." },
      { status: 500 },
    );
  }
}
