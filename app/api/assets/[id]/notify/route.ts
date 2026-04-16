/**
 * POST /api/assets/[id]/notify
 * 만료 임박 자산에 대해 즉시 알림 발송 (이메일 + Slack)
 * 발송 결과를 NotificationLog에 기록
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail, sendSlackMessage } from "@/lib/notification";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const assetId = Number(id);
    if (isNaN(assetId)) return NextResponse.json({ error: "잘못된 자산 ID" }, { status: 400 });

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        assignee: { select: { name: true, email: true } },
        orgUnit: { select: { name: true } },
      },
    });

    if (!asset) return NextResponse.json({ error: "자산을 찾을 수 없습니다." }, { status: 404 });
    if (!asset.expiryDate) return NextResponse.json({ error: "만료일이 없는 자산입니다." }, { status: 400 });

    const daysLeft = Math.ceil(
      (new Date(asset.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const subject = `[자산 만료 임박] ${asset.name} — D-${daysLeft}`;
    const body = [
      `자산명: ${asset.name}`,
      `유형: ${asset.type}`,
      `만료일: ${new Date(asset.expiryDate).toLocaleDateString("ko-KR")} (D-${daysLeft})`,
      asset.assignee ? `담당자: ${asset.assignee.name}` : "",
      asset.orgUnit ? `부서: ${asset.orgUnit.name}` : "",
      "",
      "조치가 필요합니다. 자산 관리 시스템에서 갱신 처리해 주세요.",
    ].filter(Boolean).join("\n");

    const results: { channel: string; status: string; error?: string }[] = [];

    // Email to assignee (if they have email)
    const emailTarget = asset.assignee?.email;
    if (emailTarget) {
      const emailResult = await sendEmail({ to: emailTarget, subject, text: body });
      results.push({
        channel: "EMAIL",
        status: emailResult.ok ? "SENT" : "FAILED",
        error: emailResult.ok ? undefined : emailResult.error,
      });
      await prisma.notificationLog.create({
        data: {
          assetId,
          entityType: "ASSET",
          channel: "EMAIL",
          recipient: emailTarget,
          status: emailResult.ok ? "SENT" : "FAILED",
          errorMsg: emailResult.ok ? null : emailResult.error,
        },
      });
    } else {
      results.push({ channel: "EMAIL", status: "SKIPPED" });
    }

    // Slack
    const slackResult = await sendSlackMessage(`🔔 *자산 만료 임박*\n${body.replace(/\n/g, "\n")}`);
    results.push({
      channel: "SLACK",
      status: slackResult.ok ? "SENT" : "FAILED",
      error: slackResult.ok ? undefined : slackResult.error,
    });
    await prisma.notificationLog.create({
      data: {
        assetId,
        entityType: "ASSET",
        channel: "SLACK",
        recipient: "webhook",
        status: slackResult.ok ? "SENT" : "FAILED",
        errorMsg: slackResult.ok ? null : slackResult.error,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "ASSET",
        entityId: assetId,
        action: "NOTIFY_SENT",
        actor: user.username,
        details: JSON.stringify({ subject, results }),
      },
    });

    const anySuccess = results.some((r) => r.status === "SENT");
    return NextResponse.json({
      ok: anySuccess,
      results,
      message: anySuccess ? "알림을 발송했습니다." : "설정된 알림 채널이 없거나 발송에 실패했습니다.",
    });
  } catch (error) {
    console.error("Notify failed:", error);
    return NextResponse.json({ error: "알림 발송에 실패했습니다." }, { status: 500 });
  }
}
