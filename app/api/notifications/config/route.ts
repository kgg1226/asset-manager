/**
 * GET  /api/notifications/config — 알림 설정 상태 조회 (ADMIN)
 * PUT  /api/notifications/config — 알림 설정 저장/삭제 (ADMIN)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import {
  NOTIFICATION_KEYS,
  type NotificationConfigKey,
  getConfigStatus,
  setConfigValue,
  deleteConfigValue,
} from "@/lib/system-config";

const VALID_KEYS = new Set<string>(NOTIFICATION_KEYS);

// ── GET: 설정 상태 조회 ──
export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  try {
    const configs = await getConfigStatus();
    return NextResponse.json({ configs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PUT: 설정 저장/삭제 ──
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.configs)) {
    return NextResponse.json(
      { error: "configs 배열 필요: [{ key, value }]" },
      { status: 400 }
    );
  }

  const entries = body.configs as Array<{ key: string; value: string | null }>;

  // 유효성 검사
  for (const entry of entries) {
    if (!VALID_KEYS.has(entry.key)) {
      return NextResponse.json(
        { error: `유효하지 않은 키: ${entry.key}` },
        { status: 400 }
      );
    }
    if (entry.value !== null && typeof entry.value !== "string") {
      return NextResponse.json(
        { error: `값은 문자열 또는 null이어야 합니다: ${entry.key}` },
        { status: 400 }
      );
    }
    if (typeof entry.value === "string" && entry.value.length > 2000) {
      return NextResponse.json(
        { error: `값이 너무 깁니다 (최대 2000자): ${entry.key}` },
        { status: 400 }
      );
    }
  }

  try {
    const changedKeys: string[] = [];

    for (const entry of entries) {
      const key = entry.key as NotificationConfigKey;
      if (entry.value !== null && entry.value.trim() !== "") {
        await setConfigValue(key, entry.value.trim(), user.id);
        changedKeys.push(key);
      } else {
        await deleteConfigValue(key);
        changedKeys.push(`${key}(삭제)`);
      }
    }

    // 감사 로그 (값은 기록하지 않음 — 키 이름만)
    if (changedKeys.length > 0) {
      await writeAuditLog(prisma, {
        entityType: "SYSTEM_CONFIG",
        entityId: 0,
        action: "CONFIG_UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { keys: changedKeys },
      });
    }

    const configs = await getConfigStatus();
    return NextResponse.json({ ok: true, configs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
