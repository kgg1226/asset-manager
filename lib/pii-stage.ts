// 개인정보 처리 단계(PII lifecycle stage) 단일 출처 (dev-039).
// Asset.piiStage(String?) 의 허용값 — 자산맵 흐름도 배치·증적의 기준.
// 자산맵의 PII_STAGE_MAP(인덱스 매핑)과 순서를 일치시킨다: 수집→저장→이용·제공→파기.

export const PII_STAGES = ["COLLECTION", "STORAGE", "USAGE_PROVISION", "DESTRUCTION"] as const;
export type PiiStage = (typeof PII_STAGES)[number];

export function isPiiStage(v: unknown): v is PiiStage {
  return typeof v === "string" && (PII_STAGES as readonly string[]).includes(v);
}
