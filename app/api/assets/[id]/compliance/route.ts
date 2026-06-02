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

  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) return NextResponse.json({ error: "잘못된 자산 ID 입니다." }, { status: 400 });

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
  if (!Number.isInteger(assetId)) return NextResponse.json({ error: "잘못된 자산 ID 입니다." }, { status: 400 });

  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true } });
  if (!asset) return NextResponse.json({ error: "자산을 찾을 수 없습니다." }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;

  const enrollmentStatus = ENROLLMENT.includes(body.enrollmentStatus as Enrollment)
    ? (body.enrollmentStatus as Enrollment)
    : undefined;
  const complianceStatus = COMPLIANCE.includes(body.complianceStatus as Compliance)
    ? (body.complianceStatus as Compliance)
    : undefined;

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
