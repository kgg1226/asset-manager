// PUT    — 폴더 수정 (이름, 색상)
// DELETE — 폴더 삭제 (하위 페이지는 루트로 이동)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const folderId = Number(id);
    if (isNaN(folderId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    const body = await request.json();

    const updated = await prisma.assetMapFolder.update({
      where: { id: folderId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update folder:", error);
    return NextResponse.json({ error: "폴더 수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const folderId = Number(id);
    if (isNaN(folderId))
      return NextResponse.json({ error: "유효하지 않은 ID입니다." }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      // 하위 페이지를 루트로 이동 (folderId = null)
      await tx.assetMapView.updateMany({
        where: { folderId },
        data: { folderId: null },
      });

      await tx.assetMapFolder.delete({ where: { id: folderId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete folder:", error);
    return NextResponse.json({ error: "폴더 삭제에 실패했습니다." }, { status: 500 });
  }
}
