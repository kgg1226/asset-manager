// POST /api/assets/[id]/compliance/checkin — 기기 체크인 기록 (ADMIN)
//
// 체크인 1건을 이력에 남기고, DeviceCompliance 의 lastCheckinAt·complianceStatus 를 갱신한다.
// 컴플라이언스 레코드가 없으면 생성한다(체크인이 곧 관리 시작).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

const COMPLIANCE = ["COMPLIANT", "NON_COMPLIANT", "UNKNOWN"] as const;
type Compliance = (typeof COMPLIANCE)[number];

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED");
  if (user.role !== "ADMIN") return apiError("FORBIDDEN");

  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) return NextResponse.json({ error: "잘못된 자산 ID 입니다." }, { status: 400 });

  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true } });
  if (!asset) return NextResponse.json({ error: "자산을 찾을 수 없습니다." }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const complianceStatus: Compliance = COMPLIANCE.includes(body.complianceStatus as Compliance)
    ? (body.complianceStatus as Compliance)
    : "UNKNOWN";
  const osVersion = typeof body.osVersion === "string" ? body.osVersion.trim() || null : null;
  const ipAddress = typeof body.ipAddress === "string" ? body.ipAddress.trim() || null : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  const now = new Date();

  const checkin = await prisma.$transaction(async (tx) => {
    // 컴플라이언스 레코드 확보(없으면 생성)
    const compliance = await tx.deviceCompliance.upsert({
      where: { assetId },
      create: { assetId, complianceStatus, lastCheckinAt: now },
      update: { complianceStatus, lastCheckinAt: now },
    });
    const created = await tx.deviceCheckin.create({
      data: {
        complianceId: compliance.id,
        complianceStatus,
        osVersion,
        ipAddress,
        note,
        source: "MANUAL",
        checkedAt: now,
      },
    });
    await writeAuditLog(tx, {
      entityType: "ASSET",
      entityId: assetId,
      action: "STATUS_CHANGED",
      actor: user.username,
      actorId: user.id,
      details: { kind: "device_checkin", complianceStatus },
    });
    return created;
  });

  return NextResponse.json({ checkin });
}
