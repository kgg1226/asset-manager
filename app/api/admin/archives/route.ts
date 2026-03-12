// BE-050: GET /api/admin/archives — 증적 목록
// BE-051: POST /api/admin/archives/export — 수동 내보내기 트리거

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

export async function GET(_request: NextRequest) {
  const user = await requireAdmin();

  const archives = await prisma.archive.findMany({
    include: {
      category: { select: { id: true, name: true } },
      logs: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { data: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(archives);
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();

  try {
    const body = await request.json();
    const { yearMonth, categoryId } = body;

    if (!yearMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
      return NextResponse.json({ error: "유효하지 않은 기간입니다. 형식: YYYY-MM" }, { status: 400 });
    }

    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 이미 진행 중인 증적이 있는지 확인
    const running = await prisma.archive.findFirst({
      where: { yearMonth, status: { in: ["PENDING", "RUNNING"] } },
    });
    if (running) {
      return NextResponse.json({ error: `${yearMonth} 증적이 이미 진행 중입니다.` }, { status: 409 });
    }

    const archive = await prisma.archive.create({
      data: {
        yearMonth,
        categoryId: categoryId ?? null,
        status: "PENDING",
        trigger: "manual",
        startDate,
        endDate,
        createdBy: user.id,
      },
    });

    await writeAuditLog(prisma, {
      entityType: "ARCHIVE",
      entityId: archive.id,
      action: "CREATED",
      actor: user.username,
      details: { summary: `${yearMonth} 증적 생성 요청` },
    });

    // 비동기로 증적 작업 시작 (백그라운드)
    // 실제 구현에서는 job queue 사용 권장
    runArchiveJob(archive.id, yearMonth, startDate, endDate).catch(console.error);

    return NextResponse.json(archive, { status: 201 });
  } catch (error) {
    console.error("Archive creation failed:", error);
    return NextResponse.json({ error: "증적 생성에 실패했습니다." }, { status: 500 });
  }
}

/** 증적 작업 실행 (비동기) */
async function runArchiveJob(archiveId: number, yearMonth: string, startDate: Date, endDate: Date) {
  try {
    await prisma.archive.update({ where: { id: archiveId }, data: { status: "RUNNING" } });

    await prisma.archiveLog.create({
      data: { archiveId, level: "info", message: `${yearMonth} 증적 시작` },
    });

    // 1. 라이선스 스냅샷
    const licenses = await prisma.license.findMany({
      where: { createdAt: { lte: endDate } },
      include: {
        assignments: { where: { returnedDate: null }, select: { employeeId: true } },
        owners: { select: { userId: true, orgUnitId: true } },
      },
    });

    await prisma.archiveData.create({
      data: {
        archiveId,
        dataType: "licenses",
        payload: licenses.map((l) => ({
          id: l.id,
          name: l.name,
          licenseType: l.licenseType,
          totalQuantity: l.totalQuantity,
          unitPrice: l.unitPrice,
          currency: l.currency,
          paymentCycle: l.paymentCycle,
          totalAmountKRW: l.totalAmountKRW,
          isVatIncluded: l.isVatIncluded,
          renewalStatus: l.renewalStatus,
          expiryDate: l.expiryDate,
          adminName: l.adminName,
          assignedCount: l.assignments.length,
        })),
        recordCount: licenses.length,
      },
    });

    await prisma.archiveLog.create({
      data: { archiveId, level: "info", message: `라이선스 ${licenses.length}건 스냅샷 완료` },
    });

    // 2. 조직원 스냅샷
    const employees = await prisma.employee.findMany({
      where: { status: { not: "DELETED" } },
      select: { id: true, name: true, department: true, email: true, status: true, companyId: true, orgUnitId: true },
    });

    await prisma.archiveData.create({
      data: {
        archiveId,
        dataType: "employees",
        payload: employees,
        recordCount: employees.length,
      },
    });

    await prisma.archiveLog.create({
      data: { archiveId, level: "info", message: `조직원 ${employees.length}건 스냅샷 완료` },
    });

    // 3. 변경 이력 스냅샷 (해당 기간)
    const auditLogs = await prisma.auditLog.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    await prisma.archiveData.create({
      data: {
        archiveId,
        dataType: "audit_logs",
        payload: auditLogs,
        recordCount: auditLogs.length,
      },
    });

    await prisma.archiveLog.create({
      data: { archiveId, level: "info", message: `변경이력 ${auditLogs.length}건 스냅샷 완료` },
    });

    // 4. 자산 스냅샷
    let assetCount = 0;
    try {
      const assets = await (prisma as any).asset.findMany({
        where: { createdAt: { lte: endDate }, status: { not: "DISPOSED" } },
        select: { id: true, name: true, type: true, status: true, monthlyCost: true, currency: true, expiryDate: true },
      });
      await prisma.archiveData.create({
        data: {
          archiveId,
          dataType: "assets",
          payload: assets,
          recordCount: assets.length,
        },
      });
      assetCount = assets.length;
    } catch {
      // asset 테이블이 없는 경우 skip
    }

    await prisma.archiveLog.create({
      data: { archiveId, level: "info", message: `자산 ${assetCount}건 스냅샷 완료. 증적 완료!` },
    });

    await prisma.archive.update({
      where: { id: archiveId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await prisma.archive.update({ where: { id: archiveId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.archiveLog.create({
      data: { archiveId, level: "error", message: `증적 실패: ${msg}` },
    }).catch(() => {});
  }
}
