/**
 * 시스템 설정 관리 (DB 암호화 저장 + 환경변수 폴백)
 *
 * DB에 저장된 값이 환경변수보다 우선 적용됩니다.
 * DB에 값이 없으면 process.env에서 읽습니다.
 */

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";

export const NOTIFICATION_KEYS = [
  "SLACK_WEBHOOK_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "SMTP_SECURE",
] as const;

export type NotificationConfigKey = (typeof NOTIFICATION_KEYS)[number];

/** Google Drive 설정 키 */
export const GDRIVE_KEYS = [
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_DRIVE_ROOT",
] as const;

export type GDriveConfigKey = (typeof GDRIVE_KEYS)[number];

/** 모든 시스템 설정 키 */
export type SystemConfigKey = NotificationConfigKey | GDriveConfigKey;

/** 민감한 키 (마스킹 대상) */
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  "SLACK_WEBHOOK_URL",
  "SMTP_PASS",
  "GOOGLE_PRIVATE_KEY",
]);

/** 단일 설정값 조회 (DB 우선, env 폴백) */
export async function getConfigValue(
  key: SystemConfigKey
): Promise<string | undefined> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    if (row) {
      return decrypt(row.value, row.iv, row.tag);
    }
  } catch {
    // DB 조회 실패 시 env 폴백
  }
  return process.env[key] || undefined;
}

/** 모든 알림 설정 조회 */
export async function getNotificationConfig(): Promise<
  Record<NotificationConfigKey, string | undefined>
> {
  const result = {} as Record<NotificationConfigKey, string | undefined>;

  // DB에서 일괄 조회
  let dbRows: Array<{ key: string; value: string; iv: string; tag: string }> = [];
  try {
    dbRows = await prisma.systemConfig.findMany({
      where: { key: { in: [...NOTIFICATION_KEYS] } },
    });
  } catch {
    // DB 실패 시 전부 env 폴백
  }

  const dbMap = new Map(dbRows.map((r) => [r.key, r]));

  for (const key of NOTIFICATION_KEYS) {
    const row = dbMap.get(key);
    if (row) {
      try {
        result[key] = decrypt(row.value, row.iv, row.tag);
      } catch {
        result[key] = process.env[key] || undefined;
      }
    } else {
      result[key] = process.env[key] || undefined;
    }
  }

  return result;
}

/** 설정값 저장 (암호화 + upsert) */
export async function setConfigValue(
  key: SystemConfigKey,
  plaintext: string,
  userId?: number
): Promise<void> {
  const { ciphertext, iv, tag } = encrypt(plaintext);
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: ciphertext, iv, tag, updatedBy: userId ?? null },
    update: { value: ciphertext, iv, tag, updatedBy: userId ?? null },
  });
}

/** 설정값 삭제 (환경변수 폴백으로 복원) */
export async function deleteConfigValue(
  key: SystemConfigKey
): Promise<void> {
  await prisma.systemConfig.deleteMany({ where: { key } });
}

/** 각 키의 설정 상태 조회 (UI 표시용, 값은 마스킹) */
export async function getConfigStatus(): Promise<
  Array<{
    key: NotificationConfigKey;
    source: "db" | "env" | "none";
    maskedValue: string | null;
    updatedAt: Date | null;
  }>
> {
  const dbRows = await prisma.systemConfig.findMany({
    where: { key: { in: [...NOTIFICATION_KEYS] } },
    select: { key: true, value: true, iv: true, tag: true, updatedAt: true },
  });
  const dbMap = new Map(dbRows.map((r) => [r.key, r]));

  return NOTIFICATION_KEYS.map((key) => {
    const row = dbMap.get(key);
    if (row) {
      let maskedValue: string | null = null;
      try {
        const plain = decrypt(row.value, row.iv, row.tag);
        maskedValue = maskValue(key, plain);
      } catch {
        maskedValue = "****";
      }
      return { key, source: "db" as const, maskedValue, updatedAt: row.updatedAt };
    }

    const envVal = process.env[key];
    if (envVal) {
      return {
        key,
        source: "env" as const,
        maskedValue: maskValue(key, envVal),
        updatedAt: null,
      };
    }

    return { key, source: "none" as const, maskedValue: null, updatedAt: null };
  });
}

/** 민감한 값 마스킹 */
function maskValue(key: string, value: string): string {
  if (SENSITIVE_KEYS.has(key)) {
    if (value.length <= 8) return "****";
    return "****" + value.slice(-4);
  }
  return value;
}

// ── 알림 환경설정 (Notification Preferences) ──

/** 알림 이벤트 유형 */
export const NOTIFICATION_EVENT_TYPES = [
  "ASSET_CREATED",            // 자산 생성
  "ASSET_UPDATED",            // 자산 수정
  "ASSET_DELETED",            // 자산 삭제
  "DATA_IMPORT",              // 데이터 가져오기
  "RENEWAL_APPROACHING",      // 갱신일 임박
  "CANCELLATION_APPROACHING", // 해지 통보일 임박
  "ASSIGNMENT_CHANGE",        // 배정/회수
  "USER_MANAGEMENT",          // 사용자 관리
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export interface NotificationPreferences {
  /** 알림 활성화 여부 (마스터 스위치) */
  enabled: boolean;
  /** 알림 채널 */
  channel: "SLACK" | "EMAIL" | "BOTH";
  /** 각 이벤트 유형별 ON/OFF */
  events: Record<NotificationEventType, boolean>;
  /** 갱신일 임박 — 며칠 전부터 알림 */
  renewalDaysBefore: number;
  /** 해지 통보일 임박 — 며칠 전부터 알림 */
  cancellationDaysBefore: number;
}

const PREFS_KEY = "NOTIFICATION_PREFERENCES";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  channel: "SLACK",
  events: {
    ASSET_CREATED: true,
    ASSET_UPDATED: true,
    ASSET_DELETED: true,
    DATA_IMPORT: true,
    RENEWAL_APPROACHING: true,
    CANCELLATION_APPROACHING: true,
    ASSIGNMENT_CHANGE: true,
    USER_MANAGEMENT: false,
  },
  renewalDaysBefore: 30,
  cancellationDaysBefore: 30,
};

/** 알림 환경설정 조회 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: PREFS_KEY } });
    if (row) {
      const json = decrypt(row.value, row.iv, row.tag);
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(json) };
    }
  } catch {
    // 실패 시 기본값
  }
  return { ...DEFAULT_PREFERENCES };
}

/** 알림 환경설정 저장 */
export async function setNotificationPreferences(
  prefs: NotificationPreferences,
  userId?: number
): Promise<void> {
  const { ciphertext, iv, tag } = encrypt(JSON.stringify(prefs));
  await prisma.systemConfig.upsert({
    where: { key: PREFS_KEY },
    create: { key: PREFS_KEY, value: ciphertext, iv, tag, updatedBy: userId ?? null },
    update: { value: ciphertext, iv, tag, updatedBy: userId ?? null },
  });
}


// ── Google Drive 설정 ──

/** Google Drive 설정 일괄 조회 */
export async function getGDriveConfig(): Promise<
  Record<GDriveConfigKey, string | undefined>
> {
  const result = {} as Record<GDriveConfigKey, string | undefined>;

  let dbRows: Array<{ key: string; value: string; iv: string; tag: string }> = [];
  try {
    dbRows = await prisma.systemConfig.findMany({
      where: { key: { in: [...GDRIVE_KEYS] } },
    });
  } catch {
    // DB 실패 시 env 폴백
  }

  const dbMap = new Map(dbRows.map((r) => [r.key, r]));

  for (const key of GDRIVE_KEYS) {
    const row = dbMap.get(key);
    if (row) {
      try {
        result[key] = decrypt(row.value, row.iv, row.tag);
      } catch {
        result[key] = process.env[key] || undefined;
      }
    } else {
      result[key] = process.env[key] || undefined;
    }
  }

  return result;
}

/** Google Drive 설정 상태 조회 (UI 표시용) */
export async function getGDriveConfigStatus(): Promise<
  Array<{
    key: GDriveConfigKey;
    source: "db" | "env" | "none";
    maskedValue: string | null;
    updatedAt: Date | null;
  }>
> {
  const dbRows = await prisma.systemConfig.findMany({
    where: { key: { in: [...GDRIVE_KEYS] } },
    select: { key: true, value: true, iv: true, tag: true, updatedAt: true },
  });
  const dbMap = new Map(dbRows.map((r) => [r.key, r]));

  return GDRIVE_KEYS.map((key) => {
    const row = dbMap.get(key);
    if (row) {
      let maskedValue: string | null = null;
      try {
        const plain = decrypt(row.value, row.iv, row.tag);
        maskedValue = maskValue(key, plain);
      } catch {
        maskedValue = "****";
      }
      return { key, source: "db" as const, maskedValue, updatedAt: row.updatedAt };
    }

    const envVal = process.env[key];
    if (envVal) {
      return {
        key,
        source: "env" as const,
        maskedValue: maskValue(key, envVal),
        updatedAt: null,
      };
    }

    return { key, source: "none" as const, maskedValue: null, updatedAt: null };
  });
}


// ── 기능 플래그 (비암호화 key-value) ──

/** 기능 플래그 키 목록 */
export const FEATURE_FLAG_KEYS = [
  "LIFECYCLE_VISIBLE_TO_USER", // 일반 사용자에게 수명 게이지 표시 여부
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  LIFECYCLE_VISIBLE_TO_USER: false, // 기본: 관리자만 보임
};

/** 기능 플래그 조회 (DB 우선, 기본값 폴백) */
export async function getFeatureFlag(key: FeatureFlagKey): Promise<boolean> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    if (row) return row.value === "true";
  } catch {
    // DB 실패 시 기본값
  }
  return FEATURE_FLAG_DEFAULTS[key];
}

/** 기능 플래그 설정 */
export async function setFeatureFlag(
  key: FeatureFlagKey,
  enabled: boolean,
  userId?: number
): Promise<void> {
  const value = enabled ? "true" : "false";
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value, iv: "", tag: "", updatedBy: userId ?? null },
    update: { value, updatedBy: userId ?? null },
  });
}

/** 모든 기능 플래그 조회 */
export async function getAllFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  const result = { ...FEATURE_FLAG_DEFAULTS };
  try {
    const rows = await prisma.systemConfig.findMany({
      where: { key: { in: [...FEATURE_FLAG_KEYS] } },
    });
    for (const row of rows) {
      const k = row.key as FeatureFlagKey;
      if (k in result) result[k] = row.value === "true";
    }
  } catch {
    // 기본값 유지
  }
  return result;
}
