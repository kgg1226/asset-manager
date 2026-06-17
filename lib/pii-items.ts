// 개인정보 항목 카탈로그 (dev-047) — 자산이 수집·보유하는 PII 항목의 표준 코드 단일 출처.
// AssetPiiItem.itemKey 와 엣지 AssetLink.piiItems 가 공유해 표기 흔들림("이메일" vs "email")을 막는다.
// 라벨은 한국 개인정보보호법 용어(ISMS-P 도메인) 기준 — 다국어는 후속.

export const PII_ITEM_CATEGORIES = ["GENERAL", "UNIQUE_ID", "SENSITIVE", "FINANCE", "CREDENTIAL"] as const;
export type PiiItemCategory = (typeof PII_ITEM_CATEGORIES)[number];

type CatalogEntry = { category: PiiItemCategory; label: string };

// 코드 → 분류·라벨. 순서 = 폼 표시 순서.
export const PII_ITEM_CATALOG = {
  NAME:           { category: "GENERAL",    label: "이름" },
  EMAIL:          { category: "GENERAL",    label: "이메일" },
  PHONE:          { category: "GENERAL",    label: "전화번호" },
  ADDRESS:        { category: "GENERAL",    label: "주소" },
  BIRTH:          { category: "GENERAL",    label: "생년월일" },
  GENDER:         { category: "GENERAL",    label: "성별" },
  LOCATION:       { category: "GENERAL",    label: "위치정보" },
  IP:             { category: "GENERAL",    label: "IP 주소" },
  RRN:            { category: "UNIQUE_ID",  label: "주민등록번호" },
  PASSPORT:       { category: "UNIQUE_ID",  label: "여권번호" },
  DRIVER_LICENSE: { category: "UNIQUE_ID",  label: "운전면허번호" },
  FOREIGNER_ID:   { category: "UNIQUE_ID",  label: "외국인등록번호" },
  HEALTH:         { category: "SENSITIVE",  label: "건강·의료정보" },
  BIOMETRIC:      { category: "SENSITIVE",  label: "생체인식정보" },
  GENETIC:        { category: "SENSITIVE",  label: "유전정보" },
  CRIMINAL:       { category: "SENSITIVE",  label: "범죄경력" },
  BELIEF:         { category: "SENSITIVE",  label: "사상·신념" },
  ACCOUNT:        { category: "FINANCE",    label: "계좌번호" },
  CARD:           { category: "FINANCE",    label: "신용카드번호" },
  LOGIN_ID:       { category: "CREDENTIAL", label: "로그인 ID" },
  PASSWORD:       { category: "CREDENTIAL", label: "비밀번호" },
} as const satisfies Record<string, CatalogEntry>;

export type PiiItemKey = keyof typeof PII_ITEM_CATALOG;

export const PII_ITEM_KEYS = Object.keys(PII_ITEM_CATALOG) as PiiItemKey[];

export function isPiiItemKey(v: unknown): v is PiiItemKey {
  return typeof v === "string" && v in PII_ITEM_CATALOG;
}

export function piiItemLabel(key: string): string {
  return isPiiItemKey(key) ? PII_ITEM_CATALOG[key].label : key;
}

export function piiItemCategory(key: string): PiiItemCategory | null {
  return isPiiItemKey(key) ? PII_ITEM_CATALOG[key].category : null;
}

// 분류별 색상 (시각화·배지) — 고유식별/민감은 강조색
export const PII_CATEGORY_STYLE: Record<PiiItemCategory, { bg: string; text: string; label: string }> = {
  UNIQUE_ID:  { bg: "#FCEBEB", text: "#791F1F", label: "고유식별정보" },
  SENSITIVE:  { bg: "#FAEEDA", text: "#633806", label: "민감정보" },
  FINANCE:    { bg: "#EEEDFE", text: "#3C3489", label: "금융정보" },
  CREDENTIAL: { bg: "#EEEDFE", text: "#3C3489", label: "인증정보" },
  GENERAL:    { bg: "#F1EFE8", text: "#444441", label: "일반" },
};
