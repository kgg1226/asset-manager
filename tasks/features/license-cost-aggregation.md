# 라이선스 계층 비용 취합 — Phase 5

> **목표**: 상위 라이선스는 자체 비용 없이, 하위 라이선스 비용의 합계를 자동 취합하여 표시
>
> **전제**: Phase 3-1 (라이선스 계층 구조) ✅ 완료됨

---

## 1. 핵심 규칙

1. **하위 라이선스**: 개별적으로 `unitPrice`, `quantity`, `paymentCycle` 등 비용 필드를 가짐
2. **상위 라이선스**: 자체 비용 필드 입력 불가 (또는 무시) — 비용 = SUM(하위 라이선스 비용)
3. **대시보드 총합**: 하위 비용만 합산 (상위는 취합 표시용이므로 중복 계산 제외)
4. **하위가 없는 라이선스**: 기존처럼 자체 비용 사용

### 예시

```
MS 365 (상위)               → 총 비용: ₩1,200,000/월 (= 50만 + 30만 + 40만)
  ├─ Teams Pro              → ₩500,000/월
  ├─ OneDrive Business      → ₩300,000/월
  └─ Exchange Online        → ₩400,000/월
```

- 대시보드 월간 총합에는 Teams + OneDrive + Exchange = ₩1,200,000만 포함
- MS 365 행은 취합 표시용이므로 중복 합산하지 않음

---

## 2. 백엔드 변경

### [BE-080] 상위 라이선스 비용 취합 로직

**스키마 변경: 없음** — 기존 `parentId` / `children` 관계 활용

**API 변경:**

#### GET /api/licenses (목록)

```typescript
// 기존: 각 라이선스의 totalAmountKRW만 반환
// 변경: 상위 라이선스에 aggregatedCost 추가

interface LicenseResponse {
  // ... 기존 필드
  totalAmountKRW: number | null;      // 자체 비용 (하위 있으면 null)
  aggregatedCostKRW: number | null;   // 하위 합산 비용 (상위만 값 존재)
  aggregatedMonthlyCostKRW: number | null;  // 하위 합산 월 비용
  children: LicenseResponse[];
}
```

- `children`이 있는 라이선스: `aggregatedCostKRW = SUM(children.totalAmountKRW)`
- `children`이 없는 라이선스: `aggregatedCostKRW = null`, 자체 `totalAmountKRW` 사용

#### POST /api/licenses (생성)

- `parentId`가 설정된 경우: 기존처럼 비용 필드 입력 가능 (하위 라이선스)
- `parentId`가 null이고 `children`이 있을 예정인 경우: 비용 필드 무시 (상위 라이선스)
- 판단 기준: children 존재 여부는 동적이므로, **생성 시점에는 제한하지 않음**
  - 하위가 추가되면 그때부터 자체 비용 대신 취합 비용 표시

#### PUT /api/licenses/:id (수정)

- children이 있는 라이선스의 비용 필드 수정 시: 무시하거나 경고 반환
  - `{ warning: "하위 라이선스가 있어 비용은 자동 취합됩니다" }`

### [BE-081] 대시보드 비용 중복 제거

**파일**: `lib/dashboard-aggregator.ts`

```typescript
// 변경 전: 모든 라이선스의 monthlyCostKRW 합산
// 변경 후: children이 있는 라이선스(상위)는 합산에서 제외

function normalizeLicenses(licenses) {
  return licenses
    .filter(l => !hasChildren(l))  // 상위 라이선스 제외 (하위만 합산)
    .map(l => ({ ...normalize(l) }));
}
```

### [BE-082] 보고서/Export 비용 취합 반영

**파일**: `app/api/export/all/route.ts`, `app/api/reports/monthly/`

- Excel/PDF 내보내기 시 상위 라이선스 행에 취합 비용 표시
- 총합 계산 시 하위만 합산 (중복 방지)

---

## 3. 프론트엔드 변경

### [FE-080] 라이선스 목록 — 비용 취합 표시

**파일**: `app/licenses/page.tsx`

| 항목 | 현재 | 변경 후 |
|---|---|---|
| 상위 라이선스 연간 비용 열 | 자체 비용 표시 | 하위 합산 비용 + "(취합)" 표기 |
| 하위 라이선스 연간 비용 열 | 자체 비용 표시 | 기존 유지 |
| 하위 없는 라이선스 | 자체 비용 표시 | 기존 유지 |

### [FE-081] 라이선스 등록/수정 — 비용 입력 제어

**파일**: `app/licenses/new/page.tsx`, `app/licenses/[id]/edit/page.tsx`

- children이 있는 라이선스 수정 시: 비용 섹션 비활성화 + 안내 메시지
  - "하위 라이선스의 비용이 자동 취합됩니다"
- 하위 라이선스 등록/수정: 기존 비용 입력 유지

### [FE-082] 라이선스 상세 — 비용 요약

**파일**: `app/licenses/[id]/page.tsx`

- 상위 라이선스 상세에서 하위 비용 내역 테이블 표시:
  ```
  ┌─────────────────────────────┐
  │ 비용 요약 (하위 라이선스)      │
  ├──────────┬──────────────────┤
  │ Teams Pro │ ₩500,000/월     │
  │ OneDrive  │ ₩300,000/월     │
  │ Exchange  │ ₩400,000/월     │
  ├──────────┼──────────────────┤
  │ 합계      │ ₩1,200,000/월   │
  └──────────┴──────────────────┘
  ```

---

## 4. 검증 체크리스트

- [ ] 상위 라이선스 목록: 하위 비용 합산 정상 표시
- [ ] 상위 라이선스 상세: 하위 비용 내역 + 합계
- [ ] 하위 라이선스 추가 시: 상위 비용 자동 갱신
- [ ] 하위 라이선스 삭제 시: 상위 비용 자동 차감
- [ ] 대시보드 총합: 중복 계산 없음 (하위만 합산)
- [ ] Excel/PDF 내보내기: 상위 행에 취합 비용 표시, 총합 정확
- [ ] children 없는 라이선스: 기존 동작 유지

---

## 5. 영향 범위

| 파일 | 역할 | 변경 내용 |
|---|---|---|
| `app/api/licenses/route.ts` | BE | GET 응답에 aggregatedCost 추가 |
| `app/api/licenses/[id]/route.ts` | BE | PUT 시 children 있으면 비용 무시 |
| `lib/cost-calculator.ts` | BE | 취합 헬퍼 함수 추가 |
| `lib/dashboard-aggregator.ts` | BE | 상위 라이선스 중복 제거 |
| `app/api/export/all/route.ts` | BE | 취합 비용 반영 |
| `app/licenses/page.tsx` | FE | 취합 비용 표시 |
| `app/licenses/[id]/page.tsx` | FE | 비용 요약 테이블 |
| `app/licenses/[id]/edit/page.tsx` | FE | 비용 입력 비활성화 |

---

## 6. 티켓 요약

| 티켓 | 역할 | 설명 | 난이도 |
|---|---|---|---|
| BE-080 | Backend | 비용 취합 로직 + API 응답 | 🟡 중간 |
| BE-081 | Backend | 대시보드 중복 제거 | 🟢 쉬움 |
| BE-082 | Backend | 보고서/Export 반영 | 🟡 중간 |
| FE-080 | Frontend | 목록 비용 표시 | 🟢 쉬움 |
| FE-081 | Frontend | 등록/수정 비용 제어 | 🟢 쉬움 |
| FE-082 | Frontend | 상세 비용 요약 | 🟡 중간 |
