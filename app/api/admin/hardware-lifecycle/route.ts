// GET /api/admin/hardware-lifecycle — 하드웨어 유형별 수명 주기 설정 조회
// PUT /api/admin/hardware-lifecycle — 하드웨어 유형별 수명 주기 설정 수정

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET() {
  try {
    const settings = await prisma.hardwareLifecycleSetting.findMany({
      orderBy: { deviceType: "asc" },
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch hardware lifecycle settings:", error);
    return NextResponse.json(
      { error: "수명 주기 설정 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json({ error: "설정 배열이 필요합니다." }, { status: 400 });
    }

    const results = await prisma.$transaction(async (tx) => {
      const updated = [];
      for (const s of settings) {
        if (!s.deviceType || typeof s.usefulLifeYears !== "number" || s.usefulLifeYears < 1 || s.usefulLifeYears > 50) {
          continue;
        }
        const result = await tx.hardwareLifecycleSetting.upsert({
          where: { deviceType: s.deviceType },
          update: { usefulLifeYears: s.usefulLifeYears },
          create: { deviceType: s.deviceType, usefulLifeYears: s.usefulLifeYears },
        });
        updated.push(result);
      }

      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: 0,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { summary: "하드웨어 수명 주기 설정 변경", settings },
      });

      return updated;
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to update hardware lifecycle settings:", error);
    return NextResponse.json(
      { error: "수명 주기 설정 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
