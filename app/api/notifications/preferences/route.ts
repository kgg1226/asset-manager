/**
 * GET  /api/notifications/preferences — 알림 환경설정 조회
 * PUT  /api/notifications/preferences — 알림 환경설정 저장
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/system-config";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const prefs = await getNotificationPreferences();
  return NextResponse.json({ prefs });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.prefs) {
    return NextResponse.json({ error: "prefs 객체 필요" }, { status: 400 });
  }

  const prefs = body.prefs as NotificationPreferences;

  try {
    await setNotificationPreferences(prefs, user.id);

    await writeAuditLog(prisma, {
      entityType: "SYSTEM_CONFIG",
      entityId: 0,
      action: "CONFIG_UPDATED",
      actor: user.username,
      actorType: "USER",
      actorId: user.id,
      details: { type: "NOTIFICATION_PREFERENCES", enabled: prefs.enabled, channel: prefs.channel },
    });

    return NextResponse.json({ ok: true, prefs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
