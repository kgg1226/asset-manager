// GET  — 자산 그룹 목록 조회
// POST — 자산 그룹 생성

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

// ── GET /api/asset-groups — 자산 그룹 목록 조회 ──

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const groups = await prisma.assetGroup.findMany({
      include: {
        members: {
          include: {
            asset: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Failed to fetch asset groups:", error);
    return NextResponse.json(
      { error: "자산 그룹 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── POST /api/asset-groups — 자산 그룹 생성 ──

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

    const assetIds: number[] = Array.isArray(body.assetIds) ? body.assetIds : [];

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.assetGroup.create({
        data: {
          name: name.trim(),
          description: body.description ?? null,
          color: body.color ?? "#6B7280",
          ...(assetIds.length > 0 && {
            members: {
              create: assetIds.map((assetId: number) => ({
                assetId,
              })),
            },
          }),
        },
        include: {
          members: {
            include: {
              asset: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          entityName: "AssetGroup",
          name: created.name,
          memberCount: assetIds.length,
        },
      });

      return created;
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Failed to create asset group:", error);
    return NextResponse.json(
      { error: "자산 그룹 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
