// GET /api/auth/me — 본인 정보 조회
// PUT /api/auth/me — 본인 정보 수정 (ADMIN: username 변경 가능)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!dbUser)
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json(dbUser);
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();
    const { username } = body;

    // USER 역할은 username 변경 불가
    if (user.role !== "ADMIN" && username) {
      return NextResponse.json(
        { error: "사용자명 변경 권한이 없습니다." },
        { status: 403 }
      );
    }

    if (username) {
      if (typeof username !== "string" || username.length < 2 || username.length > 50) {
        return NextResponse.json(
          { error: "사용자명은 2자 이상 50자 이하여야 합니다." },
          { status: 400 }
        );
      }

      // 중복 체크
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          { error: "이미 사용 중인 사용자명입니다." },
          { status: 409 }
        );
      }

      const oldUsername = user.username;

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { username },
        });

        await writeAuditLog(tx, {
          entityType: "USER",
          entityId: user.id,
          action: "UPDATED",
          actor: oldUsername,
          actorType: "USER",
          actorId: user.id,
          details: { changes: { username: { from: oldUsername, to: username } } },
        });
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "프로필 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
