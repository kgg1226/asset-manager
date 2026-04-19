/**
 * POST /api/notifications/resend
 * FAILED 알림 이력 항목을 재발송하고 새 NotificationLog를 생성한다.
 * Body: { logId: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSlackMessage } from "@/lib/notification";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { logId } = await req.json().catch(() => ({}));
  if (!logId || typeof logId !== "number") {
    return NextResponse.json({ error: "logId 필수" }, { status: 400 });
  }

  const log = await prisma.notificationLog.findUnique({
    where: { id: logId },
    include: {
      license: { select: { id: true, name: true, expiryDate: true } },
      asset: { select: { id: true, name: true, type: true, expiryDate: true } },
    },
  });

  if (!log) return NextResponse.json({ error: "이력을 찾을 수 없습니다." }, { status: 404 });

  const subject = log.license
    ? `[재발송] 라이선스 만료 알림 — ${log.license.name}`
    : log.asset
    ? `[재발송] 자산 만료 알림 — ${log.asset.name}`
    : `[재발송] 알림`;

  const body = log.license
    ? `라이선스: ${log.license.name}\n만료일: ${log.license.expiryDate ? new Date(log.license.expiryDate).toLocaleDateString("ko-KR") : "미설정"}\n\n조치가 필요합니다.`
    : log.asset
    ? `자산: ${log.asset.name}\n유형: ${log.asset.type}\n만료일: ${log.asset.expiryDate ? new Date(log.asset.expiryDate).toLocaleDateString("ko-KR") : "미설정"}\n\n조치가 필요합니다.`
    : "알림 재발송";

  let result: { ok: boolean; error?: string };

  if (log.channel === "EMAIL") {
    result = await sendEmail({ to: log.recipient, subject, text: body });
  } else {
    result = await sendSlackMessage(`🔔 *${subject}*\n${body}`);
  }

  await prisma.notificationLog.create({
    data: {
      licenseId: log.licenseId,
      assetId: log.assetId,
      entityType: log.entityType,
      channel: log.channel,
      recipient: log.recipient,
      status: result.ok ? "SUCCESS" : "FAILED",
      errorMsg: result.ok ? null : result.error ?? null,
    },
  });

  return NextResponse.json({ ok: result.ok, error: result.error });
}
