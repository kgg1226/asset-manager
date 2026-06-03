// GET  /api/assets/[id]/compliance — 자산의 기기 컴플라이언스 레코드 조회
// PUT  /api/assets/[id]/compliance — 컴플라이언스 upsert (ADMIN)
//
// MDM-lite (dev-027): 실제 기기 제어가 아니라 등록·컴플라이언스 상태를 기록하는 경량 추적.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

const ENROLLMENT = ["UNENROLLED", "ENROLLED", "PENDING", "RETIRED"] as const;
const COMPLIANCE = ["COMPLIANT", "NON_COMPLIANT", "UNKNOWN"] as const;
type Enrollment = (typeof ENROLLMENT)[number];
type Compliance = (typeof COMPLIANCE)[number];

/** 3-상태 boolean: true/false = 설정, null = 해제(미점검), undefined = 변경 안 함 */
function triBool(v: unknown): boolean | null | undefined {
  if (typeof v === "boolean") return v;
  if (v === null) return null;
  return undefined;
}

/** 문자열 필드: string = 설정, null = 비움, 그 외 = 변경 안 함 */
function optStr(v: unknown): string | null | undefined {
  if (typeof v === "string") return v.trim() || null;
  if (v === null) return null;
  return undefined;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED");
  // 기기 보안 태세·체크인 정보(IP/OS)는 관리 정보 — ADMIN 전용
  if (user.role !== "ADMIN") return apiError("FORBIDDEN");

  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) return apiError("INVALID_ID");

  const compliance = await prisma.deviceCompliance.findUnique({
    where: { assetId },
    include: { checkins: { orderBy: { checkedAt: "desc" }, take: 10 } },
  });

  return NextResponse.json({ compliance });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED");
  if (user.role !== "ADMIN") return apiError("FORBIDDEN");

  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) return apiError("INVALID_ID");

  // 기기 컴플라이언스는 하드웨어 자산에만 부착한다(대시보드 오염 방지)
  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, type: true } });
  if (!asset) return apiError("NOT_FOUND");
  if (asset.type !== "HARDWARE") {
    return apiError("INVALID_INPUT", { message: "하드웨어 자산에만 기기 컴플라이언스를 설정할 수 있습니다." });
  }

  const body = (await request.json()) as Record<string, unknown>;

  // 명시적으로 보낸 enum 값이 잘못되면 조용히 무시하지 않고 400 (silent no-op 방지)
  if (body.enrollmentStatus !== undefined && !ENROLLMENT.includes(body.enrollmentStatus as Enrollment)) {
    return apiError("INVALID_INPUT", { message: "enrollmentStatus 값이 올바르지 않습니다." });
  }
  if (body.complianceStatus !== undefined && !COMPLIANCE.includes(body.complianceStatus as Compliance)) {
    return apiError("INVALID_INPUT", { message: "complianceStatus 값이 올바르지 않습니다." });
  }
  const enrollmentStatus = body.enrollmentStatus as Enrollment | undefined;
  const complianceStatus = body.complianceStatus as Compliance | undefined;

  const existing = await prisma.deviceCompliance.findUnique({
    where: { assetId },
    select: { enrollmentStatus: true, enrolledAt: true },
  });

  // 처음 ENROLLED 로 전환될 때 enrolledAt 기록 (이미 enrolled 면 보존)
  let enrolledAt: Date | undefined;
  if (enrollmentStatus === "ENROLLED" && existing?.enrollmentStatus !== "ENROLLED") {
    enrolledAt = existing?.enrolledAt ?? new Date();
  }

  const fields = {
    enrollmentStatus,
    complianceStatus,
    managed: typeof body.managed === "boolean" ? body.managed : undefined,
    diskEncrypted: triBool(body.diskEncrypted),
    passcodeSet: triBool(body.passcodeSet),
    firewallOn: triBool(body.firewallOn),
    antivirusOn: triBool(body.antivirusOn),
    osUpToDate: triBool(body.osUpToDate),
    jailbrokenRooted: triBool(body.jailbrokenRooted),
    externalSource: optStr(body.externalSource),
    externalDeviceId: optStr(body.externalDeviceId),
    notes: optStr(body.notes),
    ...(enrolledAt ? { enrolledAt } : {}),
  };

  const compliance = await prisma.$transaction(async (tx) => {
    const result = await tx.deviceCompliance.upsert({
      where: { assetId },
      create: { assetId, ...fields },
      update: fields,
    });
    await writeAuditLog(tx, {
      entityType: "ASSET",
      entityId: assetId,
      action: "UPDATED",
      actor: user.username,
      actorId: user.id,
      details: { kind: "device_compliance" },
    });
    return result;
  });

  return NextResponse.json({ compliance });
}
