/**
 * 라이프사이클(내용연수·감가상각) 정보 노출 정책 — 서버 측 강제 (dev-022 / dev-025)
 *
 * 화면 게이팅(useLifecycleVisible / LifecycleVisibilityProvider)·GET /api/feature-flags 와
 * 동일한 판정 규칙을 서버에서 재사용하기 위한 단일 출처(single source of truth).
 *
 * 정책: 내용연수/감가상각 등 라이프사이클 정보는 SUPER_ADMIN(isSuperAdmin) 또는
 *       LIFECYCLE_VISIBLE_TO_USER 플래그가 켜진 경우에만 노출한다.
 */

import { getFeatureFlag } from "@/lib/system-config";

/** 권한 판정에 필요한 최소 사용자 형태 (getCurrentUser() 반환값과 호환) */
type LifecycleUser = { isSuperAdmin: boolean } | null | undefined;

/**
 * 현재 사용자가 라이프사이클/감가상각 정보를 볼 수 있는지 판정한다.
 * - SUPER_ADMIN → 항상 노출
 * - 그 외 → LIFECYCLE_VISIBLE_TO_USER 플래그를 따른다
 * - 미인증(null) → fail-closed(비노출)
 */
export async function isLifecycleVisible(user: LifecycleUser): Promise<boolean> {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return getFeatureFlag("LIFECYCLE_VISIBLE_TO_USER");
}

/** 마스킹 대상 필드를 가진 자산 형태 (구조적 매칭 — Prisma Asset+hardwareDetail 결과와 호환) */
type LifecycleMaskableAsset = {
  billingCycle: string | null;
  monthlyCost: unknown;
  hardwareDetail: { usefulLifeYears: number | null } | null;
};

/**
 * 라이프사이클 권한이 없는 사용자에게 응답하기 전, 자산 객체에서 내용연수와 감가상각 파생값을 제거한다.
 *
 * 제거 대상(visible=false 일 때):
 *   - hardwareDetail.usefulLifeYears (내용연수)
 *   - monthlyCost (단, billingCycle === "DEPRECIATION" 인 감가상각 자산에 한함)
 *
 * 유지 대상: cost / purchaseDate / expiryDate — 하드웨어 비용 열·보증 만료 배너·도메인 SSL 만료·
 *           클라우드/계약 비용 등 비-라이프사이클 표면이 사용하므로 마스킹하지 않는다(dev-024 화면 정책과 일치).
 *
 * visible=true 면 원본을 그대로 반환한다. visible=false 면 전달된 객체를 직접 변형(mutate)하므로
 * 직렬화(NextResponse.json) 직전에 호출한다. 마스킹은 본질적으로 하드웨어(PC) 자산에만 영향을 준다
 * (비-하드웨어는 hardwareDetail 부재 + DEPRECIATION 아님 → no-op).
 */
export function maskAssetLifecycle<T extends LifecycleMaskableAsset>(
  asset: T,
  visible: boolean,
): T {
  if (visible) return asset;
  if (asset.hardwareDetail) {
    asset.hardwareDetail.usefulLifeYears = null;
  }
  if (asset.billingCycle === "DEPRECIATION") {
    asset.monthlyCost = null;
  }
  return asset;
}
