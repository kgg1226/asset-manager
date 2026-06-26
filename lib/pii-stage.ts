// 개인정보 처리 단계(PII lifecycle stage) 단일 출처 (dev-039).
// Asset.piiStage(String?) 의 허용값 — 자산맵 흐름도 배치·증적의 기준.
// 자산맵의 PII_STAGE_MAP(인덱스 매핑)과 순서를 일치시킨다: 수집→저장→이용·제공→파기.

import type { TranslationDict } from "@/lib/i18n/types";

export const PII_STAGES = ["COLLECTION", "STORAGE", "USAGE_PROVISION", "DESTRUCTION"] as const;
export type PiiStage = (typeof PII_STAGES)[number];

export function isPiiStage(v: unknown): v is PiiStage {
  return typeof v === "string" && (PII_STAGES as readonly string[]).includes(v);
}

// 단계 라벨 (한국어) 단일 출처 — 클라이언트 i18n(t.assetMap.pii*)을 못 쓰는 지점이 공유한다:
//   ① PiiItemsEditor 의 단계 다중칩 ② 서버 export 라우트(/api/reports/pii-flow).
// 라벨이 에디터·export 에 각자 하드코딩되면 표류하므로 여기서 한 번만 정의한다 (dev-049 백로그 #12 취지).
export const PII_STAGE_LABEL: Record<PiiStage, string> = {
  COLLECTION: "수집",
  STORAGE: "저장",
  USAGE_PROVISION: "이용·제공",
  DESTRUCTION: "파기",
};

// 클라이언트 표시용 i18n 단계 라벨 (dev-053) — 기존 assetMap.pii* 키 재사용(중복 신설 금지).
// 서버(export)는 t 획득 불가 → PII_STAGE_LABEL(한국어) 사용.
export function piiStageLabelI18n(stage: string, t: TranslationDict): string {
  switch (stage) {
    case "COLLECTION": return t.assetMap.piiCollection;
    case "STORAGE": return t.assetMap.piiStorage;
    case "USAGE_PROVISION": return t.assetMap.piiUsageProvision;
    case "DESTRUCTION": return t.assetMap.piiDestruction;
    default: return isPiiStage(stage) ? PII_STAGE_LABEL[stage] : stage;
  }
}
