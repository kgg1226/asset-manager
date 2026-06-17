# 자산 PII 항목 인벤토리 — 구조 기획 + 적합성 시뮬레이션 (P2-c, 2026-06-16)

> 목표: "어떤 개인정보 항목이 어느 자산에서 수집·보유되어 어떻게 흐르는지"를 자산(노드) 단위로
> 추적·시각화. 현재는 PII 항목이 엣지(AssetLink.piiItems)에만 있어 흐름 없는 자산은 추적 불가.

## 1. 현황 (확정)
- `Asset.piiStage`(schema:430, String?) — 단계 1개(수집/저장/이용·제공/파기)만. 항목 목록 없음.
- `AssetLink.piiItems/dataTypes/legalBasis/retentionPeriod/destructionMethod`(468-475) — **엣지 레벨에만** PII 항목·메타.
- `lib/pii-stage.ts` — PII_STAGES 4단계 카탈로그.
- 격차: ① 흐름(엣지) 없는 자산(수집 단말·단독 저장소)의 보유 항목 표현 불가 ② 항목×자산 단위
  보유기간·법적근거 추적 불가(ISMS-P 흐름표 요구) ③ 자유텍스트라 표준 코드·분류·집계 불가.

## 2. 구조 설계

### 2-A. lib/pii-items.ts — 항목 카탈로그 (스키마 無, 단일 출처)
개인정보보호법 분류 기반 표준 코드 + 분류 3종:
- **GENERAL(일반)**: NAME 이름, EMAIL 이메일, PHONE 전화번호, ADDRESS 주소, BIRTH 생년월일, GENDER 성별
- **UNIQUE_ID(고유식별정보)**: RRN 주민등록번호, PASSPORT 여권번호, DRIVER_LICENSE 운전면허, FOREIGNER_ID 외국인등록번호
- **SENSITIVE(민감정보)**: HEALTH 건강·의료, BIOMETRIC 생체인식, CRIMINAL 범죄경력, GENETIC 유전정보, BELIEF 사상·신념
- **CREDENTIAL/FINANCE(기타)**: ACCOUNT 계좌번호, CARD 카드번호, LOGIN_ID 로그인ID, PASSWORD 비밀번호, LOCATION 위치, IP IP주소
```ts
export const PII_ITEM_CATALOG = {
  NAME:   { category: "GENERAL",    labelKey: "piiItem.name" },
  RRN:    { category: "UNIQUE_ID",  labelKey: "piiItem.rrn" },
  HEALTH: { category: "SENSITIVE",  labelKey: "piiItem.health" },
  CARD:   { category: "FINANCE",    labelKey: "piiItem.card" },
  ...
} as const;
export const PII_ITEM_CATEGORIES = ["GENERAL","UNIQUE_ID","SENSITIVE","FINANCE","CREDENTIAL"] as const;
```
색상 규약(시각화): UNIQUE_ID=빨강, SENSITIVE=주황, FINANCE/CREDENTIAL=보라, GENERAL=회색.
→ 엣지 piiItems 도 같은 카탈로그를 공유해 표기 흔들림("이메일" vs "email") 제거.

### 2-B. AssetPiiItem 모델 (additive — 무위험)
```prisma
model AssetPiiItem {
  id                Int      @id @default(autoincrement())
  assetId           Int
  asset             Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)
  itemKey           String   // PII_ITEM_CATALOG 코드 (NAME, RRN, CARD...)
  category          String   // GENERAL | UNIQUE_ID | SENSITIVE | FINANCE | CREDENTIAL
  lifecycleStages   String?  // JSON 배열 — 한 자산이 수집+저장 동시 가능 ["COLLECTION","STORAGE"]
  legalBasis        String?  // 법적 근거 (동의/법령/계약...)
  retentionPeriod   String?  // 보유기간 (예: "회원탈퇴 후 5년")
  destructionMethod String?  // 파기방법
  note              String?
  createdAt         DateTime @default(now())
  @@unique([assetId, itemKey])   // 자산당 항목 중복 방지
  @@index([assetId])
}
// Asset 모델에 추가: piiItems  AssetPiiItem[]
```
- 기존 컬럼 변경·삭제 0 → **additive, 무위험**. Asset.piiStage 보존(공존).
- 항목×자산×메타를 1행으로 → ISMS-P 흐름표 "수집 항목·보유기간·법적근거"를 자산 단위 충족.

### 2-C. 경량 1단계 대안 (스키마 최소)
`Asset.piiItems String?`(JSON 배열) 1컬럼만 추가 → 노드 배지·집계는 즉시 가능하나
항목별 보유기간·근거는 못 담음. **권장: 처음부터 2-B(AssetPiiItem)** — 어차피 additive·무위험이고
ISMS-P 항목별 메타가 핵심 가치라 경량안은 곧 재작업 필요.

## 3. ISMS-P 흐름표 매핑 (적합성 기준)
| ISMS-P 흐름표 컬럼 | 충족 출처 |
|---|---|
| 개인정보 항목 | AssetPiiItem.itemKey (+ category) |
| 처리 단계 | AssetPiiItem.lifecycleStages (복수) — Asset.piiStage 보완 |
| 처리 주체 | Asset(내부)/ExternalEntity.type(수탁/제3자) — D1 매트릭스 연계 |
| 보유·이용기간 | AssetPiiItem.retentionPeriod |
| 수집근거 | AssetPiiItem.legalBasis |
| 파기방법 | AssetPiiItem.destructionMethod |
→ 자산 단위로 흐름표 6컬럼 전부 생성 가능. 흐름(엣지) 없는 자산도 누락 없이 포함.

## 4. 단계 (시뮬레이션 통과 후 진행)
1. lib/pii-items.ts 카탈로그 + i18n 키 (스키마 無)
2. AssetPiiItem 모델 (prisma — additive) + asset GET/POST/PUT 통과
3. PiiItemsEditor 폼 (dev-039 PiiStageSelect 옆) — 카탈로그 다중선택 + 항목별 메타
4. asset-map route 노드에 piiItems include → AssetNode 분류별 배지
5. 흐름표 export (ISMS-P 증적) — 통합 증적 허브(SBOM goal)와 연계

## 5. 회귀 안전
- 기존 엣지 piiItems/legalBasis 삭제·변경 0 (파괴방지 규칙3). Asset.piiStage 공존.
- AssetPiiItem 미입력 자산은 기존과 동일 동작(빈 배열). 점진 도입.
