// MDM-lite 기기 컴플라이언스 공유 상수·헬퍼 (dev-027)
// enum 값 배열·라벨·뱃지 클래스의 단일 출처 — 라우트/대시보드/상세 패널이 공유한다.

import type { TranslationDict } from "@/lib/i18n/types";

export const ENROLLMENT_STATUSES = ["UNENROLLED", "ENROLLED", "PENDING", "RETIRED"] as const;
export const COMPLIANCE_STATUSES = ["COMPLIANT", "NON_COMPLIANT", "UNKNOWN"] as const;
export const SECURITY_CHECK_KEYS = [
  "diskEncrypted",
  "passcodeSet",
  "firewallOn",
  "antivirusOn",
  "osUpToDate",
  "jailbrokenRooted",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];
export type SecurityCheckKey = (typeof SECURITY_CHECK_KEYS)[number];

type DeviceT = TranslationDict["device"];

export function enrollmentLabel(d: DeviceT, s: string): string {
  switch (s) {
    case "UNENROLLED": return d.enrollUnenrolled;
    case "ENROLLED": return d.enrollEnrolled;
    case "PENDING": return d.enrollPending;
    case "RETIRED": return d.enrollRetired;
    default: return s;
  }
}

export function complianceLabel(d: DeviceT, s: string): string {
  return s === "COMPLIANT" ? d.compCompliant : s === "NON_COMPLIANT" ? d.compNonCompliant : d.compUnknown;
}

export function complianceBadgeClass(s: string): string {
  return s === "COMPLIANT"
    ? "bg-green-100 text-green-700"
    : s === "NON_COMPLIANT"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-600";
}

export function securityCheckLabel(d: DeviceT, key: SecurityCheckKey): string {
  return d[key];
}
