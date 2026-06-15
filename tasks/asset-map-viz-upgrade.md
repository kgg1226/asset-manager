# 자산지도 시각화 고도화 설계안 (2026-06-13)

> 목표: ISMS-P "업무별 개인정보 흐름도"(단계×주체 2D 매트릭스)를 **영감**으로, 형식에 얽매이지 않고
> "명확한 가시화"를 달성. **pii 흐름도 + network 구성도** 둘 다. 코드 변경 전 설계 확정 단계.
> 멀티에이전트 분석(현황 4 + 설계 2 + 적대적 검증 1, 59만 토큰) 종합.

---

## 1. 현황 진단 (핵심)

### PII 뷰 (개인정보 흐름도)
- `getPiiLifecycleLayout`(asset-map-content.tsx:802-996)이 4단계(수집/저장/이용·제공/파기)를
  **1차원 행 스윔레인**으로만 배치. ROW_HEIGHT=240, 같은 단계는 가로 일렬.
- 단계 배정: ① `Asset.piiStage` 명시값(dev-039) → ② 이름·카테고리 패턴 추측 → ③ 미매칭은 기본 '이용·제공'.
- 격차: **주체 축(이용자/제공자/제3자) 없음**(1D), 노드 모양 미분화, 흐름선 암호화 분류 없음,
  번호 흐름 설명 없음, 범례·법적근거가 모달에만 있어 PDF 단독 증적 불가.

### Network 뷰 (네트워크 구성도)
- **프론트에 `view==="network"` 분기가 0개.** API가 NETWORK 링크만 필터(route.ts:32-45)할 뿐,
  레이아웃은 일반 dagre(LR)로 떨어짐 → "구성도"가 아니라 "관계 그래프".
- `HardwareDetail`의 네트워크 필드(ipAddress/subnetMask/gateway/vlanId/dnsName/hostname/portCount,
  schema 564-610)가 **시각화에 0% 활용** — API select가 `deviceType`만 가져옴(route.ts:83,103).
- 격차: 서브넷/VLAN/존 그룹핑 없음, 계층(인터넷/DMZ/내부/관리) 없음, 노드에 IP/VLAN 미표시, 범례 없음.

### 공통 인프라 (재사용 토대)
- 노드 5종(asset/externalEntity/assetGroup/section/piiStageLabel), 섹션 직렬화/복원(dev-039),
  엣지 모델(AssetLink: linkType/direction/dataTypes/piiItems/protocol/legalBasis/retentionPeriod/
  destructionMethod — 암호화 전용 필드만 없음), dagre + PII 스윔레인 2종 레이아웃, A3 PDF(toPng→@react-pdf).
- 단일 출처 부재: PII_STAGES(lib)와 PII_STAGE_MAP·STAGE_META(컴포넌트)가 이중 관리. LINK_TYPES도 6곳 분산.

### 외부 모범사례 핵심
- ISMS-P 1.2.2: 흐름표(항목×단계×**주체**×근거×기간×파기) → 흐름도 도식. "생명주기 × 처리주체" 매트릭스가 본질.
- 암호화: 인터넷·DMZ 구간 고유식별정보 암호화 필수 → **영역별 암호화 적용 구간 시각 구분**이 증적 관행.
- AWS 구성도: Region>VPC>AZ>Subnet 중첩, public/private/DMZ 티어 좌→우, 보안경계 점선, 카테고리 색상군.
- React Flow: 스윔레인/영역은 parentId+extent:'parent' sub-flow, 부모가 자식보다 배열 앞에.

---

## 2. ⚠️ 검증이 잡은 결정적 결함 (구현 시 필수 반영)

### B-1. 자동저장 루프(dev-032)와 2D 좌표의 정면 충돌 — **최대 회귀 위험**
- `flushSave`(2154-2223)는 **piiStageLabel만 저장 스킵**(2167)하고 나머지 모든 노드 좌표를
  `nodePositions`에 무조건 저장. 매트릭스/스윔레인 셀 자동좌표가 DB에 박힘 → 1회 드래그 후
  복원 effect(2787-2846, **view 무관 무조건 적용**)가 덮어써 **격자 붕괴 = dev-032 루프 부활**.
- **처방(양측 가드)**: ① 복원 effect에 `view==='pii'|'network'` 가드 + ② **flushSave 저장 측에서도**
  격자 자동배치 노드(asset/externalEntity)를 `nodePositions`에서 제외하거나 "셀 스냅 좌표만 저장".
  ③ 신규 배경 노드(networkZone 등)는 piiStageLabel처럼 **저장 스킵 목록(2167)에 반드시 추가** —
  안 하면 fetchGraph ID 필터로 유령 노드 부활.

### B-2. 범례·번호흐름 Panel이 PDF 증적에 안 들어감 — **증적 누락**
- PDF는 `toPng(.react-flow__viewport)`로 **노드 평면만** 캡처. React Flow `<Panel>`은 viewport 밖
  오버레이라 캡처 안 됨. "PDF 단독 증적" 가치와 모순.
- **처방**: 증적용 범례·번호흐름은 `<Panel>`이 아니라 **viewport 내부 비드래그 노드**(piiStageLabel 패턴)로
  렌더. 화면 보조용만 Panel.

### B-3. PII 패턴매칭 stage와 매트릭스 열의 의미 충돌
- 현 matchFn(831-843)은 `isExternalEntity===true`면 무조건 '이용·제공' 행 고정. 그런데 주체 축도
  외부엔티티를 수탁/제3자 열로 보냄 → **수탁사가 저장 단계 처리**(클라우드 수탁 저장)를 표현 불가.
  행·열이 외부엔티티에서 직교하지 않음.
- **처방**: 외부엔티티 행 배정을 **명시 piiStage 우선**으로 바꿔야 매트릭스가 거짓 증적을 안 만듦.

---

## 3. 설계 — PII 뷰 2D 증적 매트릭스 (additive)
- 세로축 = `PII_STAGES`(lib 단일 출처) 단계 행 / 가로축 = 처리 주체 열(내부 0 / 수탁 1 / 제3자 2),
  주체는 `ExternalEntity.type` + 내·외부로 도출(스키마 무). `getPiiLifecycleLayout` 내부만 2D화(시그니처 보존).
- 셀 배경 레인 = SectionNode 유사 비선택 배경 노드(dev-039 z-order 패턴 재사용).
- 노드 배지(piiStage 표시 + 미지정 흐림), 흐름선 protocol 파싱(암호화 빨강 실선/평문 파랑 점선,
  `view==='pii'` 분기에서만 — LINK_COLORS 불변), 번호흐름·범례는 **노드로** 렌더(B-2).

## 4. 설계 — Network 계층 구성도 (additive)
- `getNetworkLayout()` 신설(PII 템플릿). 행 = 신뢰계층(인터넷/경계·방화벽/DMZ/내부망/관리망),
  배정: deviceType(firewall·router→경계, switch→배포, server·host→액세스, 외부→인터넷) + IP/게이트웨이 폴백.
- 열 = VLAN/서브넷(vlanId, 없으면 ipAddress+subnetMask로 CIDR 계산). 존 배경 레인 + 계층 헤더 카드(노드).
- `view==="network"` 분기를 2757·3145 두 곳에 추가(PII와 동일 패턴), all/data_flow 불변.

---

## 5. 단계 로드맵 (검증 권장 순서 — 회귀 최소 → 큰 작업)

| 단계 | 내용 | 스키마 | DEPLOY | 회귀 위험 |
|------|------|--------|--------|----------|
| **N1 (권장 1순위)** | Network: API select에 IP/VLAN/gateway/subnet/hostname 추가 + 노드에 IP/VLAN 배지(network 뷰만) | 무 | true | **0** — 레이아웃·저장·복원 미변경, 순수 additive |
| **P1 (권장 2순위)** | PII: 흐름선 보안 분류(protocol 파싱 → 암호화 빨강/평문 파랑), `view==='pii'` 분기만 | 무 | false | 낮음 — 엣지 빌드 분기만 |
| **P0 (선행 필수)** | **저장/복원 양측 가드**(B-1) — 격자 자동배치 노드 좌표 저장 제외 + view 가드. 2D/계층 레이아웃의 전제 | 무 | false | 이걸 안 하면 dev-032 부활 |
| P2 | PII 2D 매트릭스화(주체 열 + 셀 배경) — **P0 완료 후에만**. 외부엔티티 행 배정 piiStage 우선(B-3) | 무 | false | 중 |
| N2 | Network 5계층 레이아웃 + 존 배경 + 헤더 카드 — **P0 완료 후**. CIDR 폴백·zone 저장 스킵 | 무 | false | 중 |
| P3/N3 | 범례·번호흐름 **노드**(B-2) + i18n + PDF 반영 | 무 | false | 낮음 |
| 게이트 | (승인 후) piiStage 'BACKUP' 추가 / AssetLink.encrypted·processingSubject·flowOrder / network trafficDirection | **승인** | true | — |

## 6. 스키마 변경 목록 (전부 후순위 게이트 — 1~3단계는 무스키마로 완결)
- `Asset.piiStage`에 'BACKUP' 값 추가 — String?라 마이그레이션 무이나 PII_STAGE_MAP 인덱스 강결합 주의(B-3 C항).
- `AssetLink.encrypted Boolean?` — protocol 파싱 신뢰성 보강(미도입 시 파싱 폴백).
- `AssetLink.processingSubject String?` — 엣지별 주체 명시(미도입 시 type 도출).
- `AssetLink.flowOrder Int?` — 번호흐름 수동 고정(미도입 시 파생 정렬).
- 전부 nullable additive, 1차 가치엔 불필요. 도입 시 CLAUDE.md 규칙상 인간 승인.

## 7. 파괴 방지 (CLAUDE.md)
- 기존 export(getLayoutedElements/getPiiLifecycleLayout/nodeTypes 5종)·라우트·핸들러 0건 삭제.
- 모든 변경 additive, `view` 가드로 타 뷰 보존. SCOPE: asset-map-content.tsx, api/asset-map/route.ts, lib/i18n/*.
- 각 단계 독립 PR, build/lint 기준선 대조.
