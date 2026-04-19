/**
 * GET /api/notifications/history
 * 알림 발송 이력 조회 (페이지네이션 + 필터 지원)
 * Query: ?status=SUCCESS|FAILED&channel=EMAIL|SLACK&entityType=LICENSE|ASSET&page=1&limit=50
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // SUCCESS | FAILED
  const channel = searchParams.get("channel"); // EMAIL | SLACK
  const entityType = searchParams.get("entityType"); // LICENSE | ASSET
  const from = searchParams.get("from"); // ISO date string
  const to = searchParams.get("to"); // ISO date string
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 500);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (entityType) where.entityType = entityType;
  if (from || to) {
    where.sentAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.notificationLog.count({ where }),
    prisma.notificationLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        license: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true, type: true } },
      },
    }),
  ]);

  // 통계 요약 — 전체 로그 기준(페이지 무관)으로 집계
  const [okCount, failCount, emailCount, slackCount] = await Promise.all([
    prisma.notificationLog.count({ where: { ...where, status: "SUCCESS" } }),
    prisma.notificationLog.count({ where: { ...where, status: "FAILED" } }),
    prisma.notificationLog.count({ where: { ...where, channel: "EMAIL" } }),
    prisma.notificationLog.count({ where: { ...where, channel: "SLACK" } }),
  ]);

  const stats = {
    total,
    ok: okCount,
    fail: failCount,
    byChannel: {
      EMAIL: emailCount,
      SLACK: slackCount,
    },
  };

  return NextResponse.json({
    logs,
    stats,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
