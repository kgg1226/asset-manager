// 기기 컴플라이언스 대시보드 (MDM-lite, dev-027)
// 인증은 proxy.ts 미들웨어가 보장(비공개 경로). 관리 대상 기기의 등록·컴플라이언스 현황을 집계한다.

import { prisma } from "@/lib/prisma";
import DevicesContent from "./devices-content";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const [managed, compliant, nonCompliant, unknown, rows] = await Promise.all([
    prisma.deviceCompliance.count({ where: { managed: true } }),
    prisma.deviceCompliance.count({ where: { complianceStatus: "COMPLIANT" } }),
    prisma.deviceCompliance.count({ where: { complianceStatus: "NON_COMPLIANT" } }),
    prisma.deviceCompliance.count({ where: { complianceStatus: "UNKNOWN" } }),
    prisma.deviceCompliance.findMany({
      where: { managed: true },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assignee: { select: { name: true } },
            hardwareDetail: { select: { deviceType: true } },
          },
        },
      },
      orderBy: [{ lastCheckinAt: { sort: "asc", nulls: "first" } }],
      take: 100,
    }),
  ]);

  const devices = rows.map((r) => ({
    assetId: r.assetId,
    name: r.asset.name,
    deviceType: r.asset.hardwareDetail?.deviceType ?? null,
    assignee: r.asset.assignee?.name ?? null,
    enrollmentStatus: r.enrollmentStatus,
    complianceStatus: r.complianceStatus,
    lastCheckinAt: r.lastCheckinAt ? r.lastCheckinAt.toISOString() : null,
  }));

  return (
    <DevicesContent
      counts={{ managed, compliant, nonCompliant, unknown }}
      devices={devices}
    />
  );
}
