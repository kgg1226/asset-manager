// 도메인/SSL 표기 헬퍼 (dev-036) — 목록·상세·폼이 공유하는 단일 출처

type DomainT = {
  statusUnlinked: string;
  statusLive: string;
  statusDormant: string;
  statusPendingTermination: string;
  statusTerminated: string;
  monthsSuffix: string;
  yearsSuffix: string;
};

/**
 * 결제/계약 주기 표기 — 12배수는 연수("3년"), 그 외는 개월("18개월").
 * 기존 "3Y"/"6M" 영문 약식(소수 연수 "1.5Y" 포함)을 로케일 표기로 교체.
 */
export function formatBillingCycle(months: number | null | undefined, d: Pick<DomainT, "monthsSuffix" | "yearsSuffix">): string {
  if (months == null || months <= 0) return "—";
  if (months % 12 === 0) return `${months / 12}${d.yearsSuffix}`;
  return `${months}${d.monthsSuffix}`;
}

/**
 * 도메인 전용 상태 라벨 — 하드웨어용 AssetStatus 어휘(재고 등)를 도메인 의미로 오버라이드.
 * UNUSABLE 은 도메인 맥락 라벨이 없어 호출측 기본 라벨로 폴백(null 반환).
 */
export function getDomainStatusLabel(status: string, d: DomainT): string | null {
  switch (status) {
    case "IN_STOCK": return d.statusUnlinked;
    case "IN_USE": return d.statusLive;
    case "INACTIVE": return d.statusDormant;
    case "PENDING_DISPOSAL": return d.statusPendingTermination;
    case "DISPOSED": return d.statusTerminated;
    default: return null;
  }
}
