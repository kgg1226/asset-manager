# 보고서 커스텀 내보내기

> 상태: 기획 완료
> 최종 업데이트: 2026-03-23

---

## 개요

관리자가 보고서 내보내기(Excel/PDF) 시 포함할 **필드와 집계 차원을 선택**할 수 있도록 한다. 자주 사용하는 조합은 **프리셋(템플릿)**으로 저장·불러오기 가능.

---

## 현재 상태 (AS-IS)

| 항목 | 현재 |
|---|---|
| 상세 열 | 고정 10열 (Excel) / 7열 (PDF) |
| 집계 차원 | 유형별 · 상태별 · 부서별 (고정 3개) |
| 필드 선택 | 불가능 |
| 프리셋 | 없음 |
| CIA 등급 | 보고서 미포함 |
| 팀별 장비 현황 | 없음 |

## 목표 상태 (TO-BE)

| 항목 | 변경 |
|---|---|
| 상세 열 | 관리자가 체크박스로 on/off 선택 |
| 집계 차원 | 포함할 집계 시트/섹션 선택 |
| 필드 선택 | 내보내기 전 모달에서 선택 |
| 프리셋 | 이름 붙여 저장, 불러오기, 삭제 |
| CIA 등급 | 선택 가능한 상세 열로 추가 |
| 팀별 장비 현황 | 새 집계 차원으로 추가 |

---

## 선택 가능한 필드 목록

### A. 상세 열 (Detail Columns)

| 필드 키 | 라벨 | 기본값 | 비고 |
|---|---|---|---|
| `name` | 자산명 | ON (고정) | 항상 포함 |
| `type` | 자산 유형 | ON | |
| `status` | 상태 | ON | |
| `vendor` | 공급업체 | ON | |
| `monthlyCost` | 월 비용 | ON | |
| `currency` | 통화 | OFF | |
| `billingCycle` | 결제 주기 | OFF | |
| `assignee` | 담당자 | ON | |
| `department` | 부서 | ON | |
| `company` | 회사 | OFF | 다중 회사 운영 시 |
| `purchaseDate` | 구매일 | OFF | |
| `expiryDate` | 만료일 | ON | |
| `renewalDate` | 갱신일 | OFF | |
| `ciaC` | 기밀성 (C) | OFF | 1~3 |
| `ciaI` | 무결성 (I) | OFF | 1~3 |
| `ciaA` | 가용성 (A) | OFF | 1~3 |
| `ciaTotal` | CIA 합계 | OFF | 계산 필드 (C+I+A) |
| `lifecyclePercent` | 수명 잔여율 | OFF | 계산 필드 (구매일~만료일 기준 %) |
| `description` | 비고 | OFF | |

### B. 집계 차원 (Summary Sections)

| 키 | 라벨 | 기본값 | 비고 |
|---|---|---|---|
| `byType` | 유형별 집계 | ON | 기존 유지 |
| `byStatus` | 상태별 집계 | ON | 기존 유지 |
| `byDepartment` | 부서별 집계 | ON | 기존 유지 |
| `byTeamDevice` | 팀별 장비 현황 | OFF | **신규** — 아래 상세 |
| `byCia` | CIA 등급 분포 | OFF | **신규** — 등급별 자산 수 |

### C. 팀별 장비 현황 (`byTeamDevice`) 상세

피벗 테이블 형식:

| 부서 | Laptop | Desktop | Server | Mobile | 모니터 | 기타 | 합계 |
|---|---|---|---|---|---|---|---|
| 개발팀 | 2 | 0 | 0 | 0 | 1 | 0 | 3 |
| 인프라팀 | 0 | 0 | 1 | 0 | 0 | 1 | 2 |
| 마케팅팀 | 0 | 1 | 0 | 1 | 0 | 0 | 2 |

- 행: OrgUnit(부서)
- 열: HardwareDetail.deviceType (Laptop/Desktop/Server/Network/Mobile/Monitor/Peripheral/Other)
- 값: 해당 부서 + 장비유형의 자산 수 (status = IN_USE만)

---

## UI 설계

### 내보내기 모달 (Export Config Modal)

보고서 페이지의 "Excel 내보내기" / "PDF 내보내기" 버튼 클릭 시 모달 표시.

```
┌─────────────────────────────────────────────┐
│  보고서 내보내기 설정                         │
│                                             │
│  프리셋: [▼ 기본값          ] [저장] [삭제]   │
│                                             │
│  ── 집계 섹션 ──────────────────────────────  │
│  ☑ 유형별 집계    ☑ 상태별 집계               │
│  ☑ 부서별 집계    ☐ 팀별 장비 현황            │
│  ☐ CIA 등급 분포                             │
│                                             │
│  ── 상세 열 ────────────────────────────────  │
│  ☑ 자산명(필수)  ☑ 유형     ☑ 상태           │
│  ☑ 공급업체      ☑ 월 비용   ☐ 통화          │
│  ☐ 결제 주기     ☑ 담당자    ☑ 부서          │
│  ☐ 회사         ☐ 구매일    ☑ 만료일         │
│  ☐ 갱신일       ☐ 기밀성(C) ☐ 무결성(I)     │
│  ☐ 가용성(A)    ☐ CIA 합계  ☐ 수명 잔여율    │
│  ☐ 비고                                     │
│                                             │
│  [전체 선택] [기본값 초기화]                   │
│                                             │
│         [취소]  [Excel 내보내기] [PDF 내보내기] │
└─────────────────────────────────────────────┘
```

### 프리셋 저장 모달

"저장" 클릭 시:
```
┌──────────────────────┐
│  프리셋 저장          │
│                      │
│  이름: [ISMS-P 감사용] │
│                      │
│  [취소]  [저장]       │
└──────────────────────┘
```

---

## API 변경

### 1. Excel/PDF 내보내기 API — 쿼리 파라미터 추가

**`GET /api/reports/monthly/{yearMonth}/excel`**
**`GET /api/reports/monthly/{yearMonth}/pdf`**

추가 쿼리 파라미터:

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `columns` | string (콤마 구분) | 상세 열 키 목록. 예: `name,type,status,monthlyCost,ciaC,ciaI,ciaA` |
| `sections` | string (콤마 구분) | 집계 섹션 키 목록. 예: `byType,byDepartment,byTeamDevice` |

- 파라미터 생략 시: 기존 기본값 유지 (하위 호환)
- `name` 열은 항상 포함 (첫 번째 열 고정)

**예시 요청:**
```
GET /api/reports/monthly/2026-03/excel?columns=name,type,status,monthlyCost,assignee,department,ciaC,ciaI,ciaA&sections=byType,byDepartment,byTeamDevice
```

### 2. 프리셋 CRUD API (신규)

**`GET /api/reports/presets`**
```json
// Response
{
  "presets": [
    {
      "id": 1,
      "name": "ISMS-P 감사용",
      "columns": ["name","type","status","ciaC","ciaI","ciaA","ciaTotal","department"],
      "sections": ["byType","byDepartment","byCia"],
      "isDefault": false,
      "createdAt": "2026-03-23T00:00:00Z"
    }
  ]
}
```

**`POST /api/reports/presets`**
```json
// Request
{
  "name": "ISMS-P 감사용",
  "columns": ["name","type","status","ciaC","ciaI","ciaA","ciaTotal","department"],
  "sections": ["byType","byDepartment","byCia"]
}
// Response: 201 { id, name, ... }
```

**`DELETE /api/reports/presets/{id}`**
```
// Response: 204 No Content
```

---

## DB 변경

### 신규 모델: `ReportPreset`

```prisma
model ReportPreset {
  id        Int      @id @default(autoincrement())
  name      String
  columns   String   // JSON array: ["name","type","status",...]
  sections  String   // JSON array: ["byType","byDepartment",...]
  isDefault Boolean  @default(false)
  createdBy Int?     // userId
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## i18n 키 추가

`lib/i18n/` 6개 언어 파일에 추가:

```
report.exportSettings       → 보고서 내보내기 설정
report.preset               → 프리셋
report.savePreset           → 프리셋 저장
report.deletePreset         → 프리셋 삭제
report.presetName           → 프리셋 이름
report.summarySections      → 집계 섹션
report.detailColumns        → 상세 열
report.selectAll            → 전체 선택
report.resetDefault         → 기본값 초기화
report.byTeamDevice         → 팀별 장비 현황
report.byCia                → CIA 등급 분포
report.column.name          → 자산명
report.column.type          → 자산 유형
report.column.status        → 상태
report.column.vendor        → 공급업체
report.column.monthlyCost   → 월 비용
report.column.currency      → 통화
report.column.billingCycle  → 결제 주기
report.column.assignee      → 담당자
report.column.department    → 부서
report.column.company       → 회사
report.column.purchaseDate  → 구매일
report.column.expiryDate    → 만료일
report.column.renewalDate   → 갱신일
report.column.ciaC          → 기밀성 (C)
report.column.ciaI          → 무결성 (I)
report.column.ciaA          → 가용성 (A)
report.column.ciaTotal      → CIA 합계
report.column.lifecyclePercent → 수명 잔여율
report.column.description   → 비고
```

---

## 작업 분해

| # | 티켓 | 역할 | 내용 |
|---|---|---|---|
| 1 | DEV-RPT-001 | Dev | `ReportPreset` 모델 추가 + `prisma db push` |
| 2 | DEV-RPT-002 | Dev | `/api/reports/presets` CRUD API |
| 3 | DEV-RPT-003 | Dev | Excel API — `columns`/`sections` 쿼리 파라미터 처리 |
| 4 | DEV-RPT-004 | Dev | PDF API — `columns`/`sections` 쿼리 파라미터 처리 |
| 5 | DEV-RPT-005 | Dev | `byTeamDevice` 집계 로직 (피벗 테이블) |
| 6 | DEV-RPT-006 | Dev | `byCia` 집계 로직 (CIA 등급 분포) |
| 7 | DEV-RPT-007 | Dev | `ciaTotal`, `lifecyclePercent` 계산 필드 로직 |
| 8 | DEV-RPT-008 | Dev | 내보내기 설정 모달 UI (체크박스 + 프리셋 드롭다운) |
| 9 | DEV-RPT-009 | Dev | i18n 키 추가 (6개 언어) |
| 10 | DEV-RPT-010 | Dev | 이메일 발송 시에도 프리셋 적용 |
