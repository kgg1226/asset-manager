// POST /api/auth/change-password
// 본인 비밀번호 변경 + mustChangePassword 플래그 해제

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: "비밀번호는 8자 이상 128자 이하여야 합니다." }, { status: 400 });
    }

    // mustChangePassword가 아닌 자발적 변경 시 현재 비밀번호 확인 필수
    if (!user.mustChangePassword) {
      if (!currentPassword || typeof currentPassword !== "string") {
        return NextResponse.json({ error: "현재 비밀번호를 입력하세요." }, { status: 400 });
      }

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

      const valid = await verifyPassword(currentPassword, dbUser.password);
      if (!valid) {
        return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
      }
    }

    const hash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hash,
          mustChangePassword: false,
        },
      });

      await writeAuditLog(tx, {
        entityType: "USER",
        entityId: user.id,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { change: "password_self" },
      });
    });

    return NextResponse.json({ message: "비밀번호가 변경되었습니다." });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json({ error: "비밀번호 변경에 실패했습니다." }, { status: 500 });
  }
}
