// GET  — 폴더 목록 조회 (하위 페이지 포함)
// POST — 폴더 생성

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const folders = await prisma.assetMapFolder.findMany({
      include: {
        pages: {
          select: { id: true, name: true, isDefault: true, isShared: true, lastAccessedAt: true, folderId: true, createdBy: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Failed to fetch folders:", error);
    return NextResponse.json({ error: "폴더 목록 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name은 필수입니다." }, { status: 400 });
    }

    const folder = await prisma.assetMapFolder.create({
      data: {
        name: name.trim(),
        color: body.color || "#6B7280",
        createdBy: user.id,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Failed to create folder:", error);
    return NextResponse.json({ error: "폴더 생성에 실패했습니다." }, { status: 500 });
  }
}
