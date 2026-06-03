// 기기 컴플라이언스 대시보드 (MDM-lite, dev-027)
// 기기 컴플라이언스는 관리(IT) 기능 — ADMIN 전용. proxy.ts 는 페이지/ GET 을 비로그인에도
// 통과시키므로(앱 전반 정책) 페이지에서 직접 인증·권한을 가드한다.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import DevicesContent from "./devices-content";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  // 카운트 카드는 목록(관리 대상)과 같은 모집단을 세야 일치한다 → 전부 managed:true 기준
  const [managed, compliant, nonCompliant, unknown, rows] = await Promise.all([
    prisma.deviceCompliance.count({ where: { managed: true } }),
    prisma.deviceCompliance.count({ where: { managed: true, complianceStatus: "COMPLIANT" } }),
    prisma.deviceCompliance.count({ where: { managed: true, complianceStatus: "NON_COMPLIANT" } }),
    prisma.deviceCompliance.count({ where: { managed: true, complianceStatus: "UNKNOWN" } }),
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
