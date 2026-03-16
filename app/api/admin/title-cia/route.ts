// GET /api/admin/title-cia — 직책별 CIA 매핑 목록
// POST /api/admin/title-cia — 직책별 CIA 매핑 추가

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const mappings = await prisma.titleCiaMapping.findMany({
      orderBy: { title: "asc" },
    });

    // 각 매핑에 대해 영향받는 하드웨어 자산 수 집계
    const mappingsWithCount = await Promise.all(
      mappings.map(async (m) => {
        const count = await prisma.asset.count({
          where: {
            type: "HARDWARE",
            assignee: { title: m.title },
          },
        });
        return { ...m, affectedAssetCount: count };
      })
    );

    return NextResponse.json({ mappings: mappingsWithCount });
  } catch (error) {
    console.error("Failed to fetch title-cia mappings:", error);
    return NextResponse.json(
      { error: "직책 CIA 매핑 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();
    const { title, ciaC, ciaI, ciaA } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "직책명은 필수입니다." },
        { status: 400 }
      );
    }

    const validCia = (v: unknown) =>
      typeof v === "number" && [1, 2, 3].includes(v);
    if (!validCia(ciaC) || !validCia(ciaI) || !validCia(ciaA)) {
      return NextResponse.json(
        { error: "CIA 등급은 1(하), 2(중), 3(상) 중 하나여야 합니다." },
        { status: 400 }
      );
    }

    const mapping = await prisma.$transaction(async (tx) => {
      const created = await tx.titleCiaMapping.create({
        data: {
          title: title.trim(),
          ciaC,
          ciaI,
          ciaA,
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
          summary: `직책 CIA 매핑 추가: ${created.title}`,
          ciaC,
          ciaI,
          ciaA,
        },
      });

      // 해당 직책을 가진 구성원에게 할당된 하드웨어 자산 CIA 자동 갱신
      const affectedAssets = await tx.asset.findMany({
        where: {
          type: "HARDWARE",
          assignee: { title: title.trim() },
        },
        select: { id: true },
      });

      if (affectedAssets.length > 0) {
        await tx.asset.updateMany({
          where: { id: { in: affectedAssets.map((a) => a.id) } },
          data: { ciaC, ciaI, ciaA },
        });
      }

      return { ...created, affectedAssetCount: affectedAssets.length };
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unique constraint") ||
        error.message.includes("UNIQUE constraint"))
    ) {
      return NextResponse.json(
        { error: "이미 등록된 직책명입니다." },
        { status: 409 }
      );
    }
    console.error("Failed to create title-cia mapping:", error);
    return NextResponse.json(
      { error: "직책 CIA 매핑 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}
