// GET  — 외부 엔티티 목록 조회
// POST — 외부 엔티티 생성

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

const ENTITY_TYPES = ["TRUSTEE", "PARTNER", "GOVERNMENT", "OTHER"] as const;

// ── GET /api/external-entities — 외부 엔티티 목록 조회 ──

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const entities = await prisma.externalEntity.findMany({
      include: {
        _count: {
          select: {
            outgoingLinks: true,
            incomingLinks: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ entities });
  } catch (error) {
    console.error("Failed to fetch external entities:", error);
    return NextResponse.json(
      { error: "외부 엔티티 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── POST /api/external-entities — 외부 엔티티 생성 ──

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();

    // ── 필수 필드 검증 ──
    const { name, type } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name은 필수입니다." },
        { status: 400 },
      );
    }

    if (!type || !ENTITY_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type은 필수입니다. 허용값: ${ENTITY_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const entity = await prisma.$transaction(async (tx) => {
      const created = await tx.externalEntity.create({
        data: {
          name: name.trim(),
          type,
          description: body.description ?? null,
          contactInfo: body.contactInfo ?? null,
        },
        include: {
          _count: {
            select: {
              outgoingLinks: true,
              incomingLinks: true,
            },
          },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ASSET_LINK",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: {
          entityName: "ExternalEntity",
          name: created.name,
          type: created.type,
        },
      });

      return created;
    });

    return NextResponse.json(entity, { status: 201 });
  } catch (error) {
    console.error("Failed to create external entity:", error);
    return NextResponse.json(
      { error: "외부 엔티티 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
