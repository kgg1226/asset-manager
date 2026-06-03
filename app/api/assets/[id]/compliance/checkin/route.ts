// POST /api/assets/[id]/compliance/checkin — 기기 체크인 기록 (ADMIN)
//
// 체크인 1건을 이력에 남기고 DeviceCompliance.lastCheckinAt 를 갱신한다.
// complianceStatus 는 요청에 유효한 값이 "명시"된 경우에만 갱신하며, 그렇지 않으면 기존 값을
// 보존한다(클라이언트의 stale/누락 값으로 인한 조용한 강등 방지). 레코드가 없으면 생성한다
// (managed 플래그는 여기서 설정하지 않음 — 관리 대상 지정은 PUT 으로 명시).

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
  if (!Number.isInteger(assetId)) return apiError("INVALID_ID");

  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, type: true } });
  if (!asset) return apiError("NOT_FOUND");
  if (asset.type !== "HARDWARE") {
    return apiError("INVALID_INPUT", { message: "하드웨어 자산에만 체크인을 기록할 수 있습니다." });
  }

  const body = (await request.json()) as Record<string, unknown>;
  // 유효한 값이 "명시"된 경우에만 status 갱신. 미제공이면 기존 값 보존(강등 방지).
  const providedStatus: Compliance | undefined = COMPLIANCE.includes(body.complianceStatus as Compliance)
    ? (body.complianceStatus as Compliance)
    : undefined;
  const osVersion = typeof body.osVersion === "string" ? body.osVersion.trim() || null : null;
  const ipAddress = typeof body.ipAddress === "string" ? body.ipAddress.trim() || null : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  const now = new Date();

  const existing = await prisma.deviceCompliance.findUnique({
    where: { assetId },
    select: { complianceStatus: true },
  });
  // 체크인 이력에 남길 상태: 명시값 > 기존값 > UNKNOWN
  const recordedStatus: Compliance = providedStatus ?? existing?.complianceStatus ?? "UNKNOWN";

  const checkin = await prisma.$transaction(async (tx) => {
    // 컴플라이언스 레코드 확보(없으면 생성). rollup status 는 명시된 경우에만 갱신.
    const compliance = await tx.deviceCompliance.upsert({
      where: { assetId },
      create: { assetId, complianceStatus: recordedStatus, lastCheckinAt: now },
      update: { lastCheckinAt: now, ...(providedStatus ? { complianceStatus: providedStatus } : {}) },
    });
    const created = await tx.deviceCheckin.create({
      data: {
        complianceId: compliance.id,
        complianceStatus: recordedStatus,
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
      details: { kind: "device_checkin", complianceStatus: recordedStatus },
    });
    return created;
  });

  return NextResponse.json({ checkin });
}
