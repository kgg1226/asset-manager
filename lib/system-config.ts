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


// ── 앱 설정 (비암호화 key-value, 통합 관리) ──

/** 앱 설정 정의: 카테고리별 키, 타입, 기본값, 설명 */
export interface AppSettingDef {
  key: string;
  category: "feature" | "security" | "notification" | "asset" | "display" | "finance";
  type: "boolean" | "number" | "string" | "numberArray";
  defaultValue: string; // JSON 직렬화된 기본값
  label: string;        // 한국어 설명
  min?: number;
  max?: number;
}

export const APP_SETTINGS: AppSettingDef[] = [
  // ── 기능 공개 ──
  { key: "LIFECYCLE_VISIBLE_TO_USER", category: "feature", type: "boolean", defaultValue: "false", label: "일반 사용자에게 수명 게이지 표시" },

  // ── 보안 ──
  { key: "SESSION_DURATION_DAYS", category: "security", type: "number", defaultValue: "7", label: "세션 유효기간 (일)", min: 1, max: 90 },
  { key: "LOGIN_MAX_ATTEMPTS", category: "security", type: "number", defaultValue: "5", label: "로그인 실패 잠금 횟수", min: 3, max: 20 },
  { key: "LOGIN_LOCK_MINUTES", category: "security", type: "number", defaultValue: "15", label: "잠금 지속시간 (분)", min: 1, max: 120 },
  { key: "PASSWORD_MIN_LENGTH", category: "security", type: "number", defaultValue: "8", label: "비밀번호 최소 길이", min: 6, max: 32 },

  // ── 알림 ──
  { key: "RENEWAL_ALERT_DAYS", category: "notification", type: "numberArray", defaultValue: "[70,30,15,7]", label: "만료 알림 D-day (쉼표 구분)" },
  { key: "LIFECYCLE_THRESHOLDS", category: "notification", type: "numberArray", defaultValue: "[50,80,95]", label: "수명 임계치 알림 (%)" },

  // ── 자산 ──
  { key: "AUTO_DISPOSAL_DAYS", category: "asset", type: "number", defaultValue: "365", label: "폐기 자동 전환 기준 (일)", min: 30, max: 3650 },

  // ── 재무 ──
  { key: "VAT_RATE_PERCENT", category: "finance", type: "number", defaultValue: "10", label: "부가세율 (%)", min: 0, max: 50 },

  // ── 표시 ──
  { key: "LIST_PAGE_SIZE", category: "display", type: "number", defaultValue: "50", label: "목록 페이지당 항목 수", min: 10, max: 200 },
];

export const APP_SETTING_KEYS = APP_SETTINGS.map(s => s.key);
export type AppSettingKey = string;

// 레거시 호환
export const FEATURE_FLAG_KEYS = ["LIFECYCLE_VISIBLE_TO_USER"] as const;
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

/** 앱 설정값 조회 (타입별 파싱) */
export async function getAppSetting<T = string>(key: string): Promise<T> {
  const def = APP_SETTINGS.find(s => s.key === key);
  const defaultValue = def?.defaultValue ?? "";

  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    if (row) {
      return parseSetting(row.value, def?.type ?? "string") as T;
    }
  } catch {
    // DB 실패 시 기본값
  }
  return parseSetting(defaultValue, def?.type ?? "string") as T;
}

/** 앱 설정값 저장 */
export async function setAppSetting(
  key: string,
  value: string,
  userId?: number
): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value, iv: "", tag: "", updatedBy: userId ?? null },
    update: { value, updatedBy: userId ?? null },
  });
}

/** 모든 앱 설정 조회 (UI 표시용) */
export async function getAllAppSettings(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const def of APP_SETTINGS) {
    result[def.key] = def.defaultValue;
  }

  try {
    const rows = await prisma.systemConfig.findMany({
      where: { key: { in: APP_SETTING_KEYS } },
    });
    for (const row of rows) {
      if (row.key in result) result[row.key] = row.value;
    }
  } catch {
    // 기본값 유지
  }
  return result;
}

function parseSetting(value: string, type: string): unknown {
  switch (type) {
    case "boolean": return value === "true";
    case "number": return Number(value) || 0;
    case "numberArray": try { return JSON.parse(value); } catch { return []; }
    default: return value;
  }
}

// ── 레거시 호환 함수 ──

/** 기능 플래그 조회 (레거시 호환) */
export async function getFeatureFlag(key: FeatureFlagKey): Promise<boolean> {
  return getAppSetting<boolean>(key);
}

/** 기능 플래그 설정 (레거시 호환) */
export async function setFeatureFlag(
  key: FeatureFlagKey,
  enabled: boolean,
  userId?: number
): Promise<void> {
  await setAppSetting(key, String(enabled), userId);
}

/** 모든 기능 플래그 조회 (레거시 호환) */
export async function getAllFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  const settings = await getAllAppSettings();
  return {
    LIFECYCLE_VISIBLE_TO_USER: settings.LIFECYCLE_VISIBLE_TO_USER === "true",
  };
}
