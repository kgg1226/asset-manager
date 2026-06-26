// 개인정보 항목 카탈로그 (dev-047) — 자산이 수집·보유하는 PII 항목의 표준 코드 단일 출처.
// AssetPiiItem.itemKey 와 엣지 AssetLink.piiItems 가 공유해 표기 흔들림("이메일" vs "email")을 막는다.
// 라벨은 한국 개인정보보호법 용어(ISMS-P 도메인) 기준 — 다국어는 후속.

import type { TranslationDict } from "@/lib/i18n/types";

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

// itemKey → i18n 키 매핑 (dev-053). 코드·분류·색상은 위 카탈로그가 단일출처로 유지하고,
// 표시 라벨만 로케일별로 분리한다.
const PII_ITEM_I18N_KEY: Record<PiiItemKey, keyof TranslationDict["pii"]> = {
  NAME: "itemName", EMAIL: "itemEmail", PHONE: "itemPhone", ADDRESS: "itemAddress",
  BIRTH: "itemBirth", GENDER: "itemGender", LOCATION: "itemLocation", IP: "itemIp",
  RRN: "itemRrn", PASSPORT: "itemPassport", DRIVER_LICENSE: "itemDriverLicense",
  FOREIGNER_ID: "itemForeignerId", HEALTH: "itemHealth", BIOMETRIC: "itemBiometric",
  GENETIC: "itemGenetic", CRIMINAL: "itemCriminal", BELIEF: "itemBelief",
  ACCOUNT: "itemAccount", CARD: "itemCard", LOGIN_ID: "itemLoginId", PASSWORD: "itemPassword",
};

// 클라이언트 표시용 i18n 라벨 — t 주입형. 카탈로그 코드가 아니면 원문 반환(레거시 자유텍스트 하위호환).
// 서버(export)는 t 획득이 불가하므로 기존 piiItemLabel(한국어)을 그대로 쓴다 — ISMS-P 국내 증적.
export function piiItemLabelI18n(key: string, t: TranslationDict): string {
  return isPiiItemKey(key) ? t.pii[PII_ITEM_I18N_KEY[key]] : key;
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
