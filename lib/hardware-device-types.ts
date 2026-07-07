// 하드웨어 장비 유형 단일 출처 (dev-065) — 폼 셀렉트(new/edit 중복 상수)를 승격.
//
// ⚠️ DEVICE_TYPES 의 "저장 값 문자열"은 변경 금지 — 아래가 원시 문자열로 참조한다:
//   자산맵 network 뷰(api/asset-map/route.ts "Network", asset-map-content placedIds/아이콘 매칭),
//   PC 감가상각 판별(api/assets isPcDeviceType Laptop|Desktop), 폐기 크론, asset-register 리포트 분류,
//   HardwareLifecycleSetting.deviceType 키.
//
// 유형군(DeviceTypeGroup)은 "표시 전용" 파생 개념이다 — 장비 분류에 맞지 않는 입력 필드
// (OS/PII/기기관리)를 조건 표시하기 위한 것으로, 데이터 모델·저장 값에는 영향이 없다.
// 숨김은 은닉이 아니다: 기존 저장값이 있으면 "기타 저장값" 접힘 섹션으로 노출한다(파괴 방지).

export const DEVICE_TYPES = [
  "Laptop", "Desktop", "Server", "Network", "Mobile", "Monitor", "Peripheral",
  "SecurityDevice", "Storage", "Backup", "Rack", "Component", "Facility", "Other",
] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export type DeviceTypeGroup = "COMPUTING" | "NETWORK" | "MOBILE" | "STORAGE" | "PERIPHERAL";

const GROUP_BY_TYPE: Record<string, DeviceTypeGroup> = {
  Laptop: "COMPUTING", Desktop: "COMPUTING", Server: "COMPUTING",
  Network: "NETWORK", SecurityDevice: "NETWORK",
  Mobile: "MOBILE",
  Storage: "STORAGE", Backup: "STORAGE",
  Monitor: "PERIPHERAL", Peripheral: "PERIPHERAL", Rack: "PERIPHERAL",
  Component: "PERIPHERAL", Facility: "PERIPHERAL",
  // Other/미지정/목록 외 자유값(CSV 유입) → null(전체 표시 폴백)
};

// 미지정("")·Other·목록 외 자유값이면 null → 호출부는 전체 표시(안전 폴백)
export function resolveDeviceGroup(deviceType?: string | null): DeviceTypeGroup | null {
  if (!deviceType) return null;
  if (GROUP_BY_TYPE[deviceType]) return GROUP_BY_TYPE[deviceType];
  // 하위호환: 대소문자 흔들림(CSV 유입) 재시도
  const hit = Object.keys(GROUP_BY_TYPE).find((k) => k.toLowerCase() === deviceType.toLowerCase());
  return hit ? GROUP_BY_TYPE[hit] : null;
}

export type VisibleField =
  | "os" | "osVersion" | "macAddress" | "ipAddress" | "hostname"
  | "specs" | "gpu" | "displaySize" | "piiSection" | "compliancePanel";

// 유형군 × 필드 표시 매트릭스 (dev-065 확정안).
// NETWORK 군은 os/osVersion 대신 기존 firmwareVersion(인프라 블록)이 정본 — 재라벨 중복을 만들지 않는다.
const MATRIX: Record<DeviceTypeGroup, Record<VisibleField, boolean>> = {
  COMPUTING:  { os: true,  osVersion: true,  macAddress: true,  ipAddress: true,  hostname: true,  specs: true,  gpu: true,  displaySize: true,  piiSection: true,  compliancePanel: true },
  NETWORK:    { os: false, osVersion: false, macAddress: true,  ipAddress: true,  hostname: true,  specs: false, gpu: false, displaySize: false, piiSection: false, compliancePanel: false },
  MOBILE:     { os: true,  osVersion: true,  macAddress: true,  ipAddress: false, hostname: false, specs: false, gpu: false, displaySize: false, piiSection: true,  compliancePanel: true },
  STORAGE:    { os: false, osVersion: false, macAddress: true,  ipAddress: true,  hostname: true,  specs: false, gpu: false, displaySize: false, piiSection: true,  compliancePanel: false },
  PERIPHERAL: { os: false, osVersion: false, macAddress: false, ipAddress: false, hostname: false, specs: false, gpu: false, displaySize: false, piiSection: false, compliancePanel: false },
};

// group=null(미지정/Other/자유값)은 항상 true — 기존 동작 보존(전체 표시)
export function isFieldVisible(group: DeviceTypeGroup | null, field: VisibleField): boolean {
  if (!group) return true;
  return MATRIX[group][field];
}
