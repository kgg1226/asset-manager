# 하드웨어 자산 CIA 등급 — 직책 기반 자동 산정 — Phase 5

> **목표**: 하드웨어 자산의 CIA(기밀성·무결성·가용성) 등급을 자산 자체가 아닌, 할당된 사용자의 직책에 따라 자동 산정
>
> **배경**: 자산 자체에는 CIA가 의미 없음. 같은 노트북이라도 임원에게 할당되면 높은 등급, 인턴에게 할당되면 낮은 등급

---

## 1. 핵심 규칙

1. **하드웨어 생성 시**: CIA 필드 없음 (입력 불필요)
2. **할당 시**: 할당 대상 구성원의 직책(title) → 직책 등급 테이블 조회 → CIA 자동 설정
3. **반납 시**: CIA 초기화 (미할당 상태 = CIA 없음)
4. **직책 변경 시**: 해당 구성원에게 할당된 하드웨어의 CIA 자동 갱신
5. **관리자 설정**: 직책별 CIA 매핑 테이블을 관리 페이지에서 CRUD

### 예시

```
직책 등급 테이블 (관리자 설정):
┌──────────┬───────┬───────┬───────┐
│ 직책      │ C(기밀)│ I(무결)│ A(가용)│
├──────────┼───────┼───────┼───────┤
│ 대표이사   │ 상     │ 상     │ 상     │
│ 임원      │ 상     │ 상     │ 중     │
│ 팀장      │ 중     │ 중     │ 중     │
│ 과장      │ 중     │ 중     │ 하     │
│ 사원      │ 하     │ 하     │ 하     │
│ 인턴      │ 하     │ 하     │ 하     │
└──────────┴───────┴───────┴───────┘

노트북 A (미할당)       → CIA: 없음
노트북 A → 김팀장 할당  → CIA: 중/중/중
김팀장 → 임원 승진      → CIA: 상/상/중 (자동 갱신)
노트북 A 반납           → CIA: 없음
```

---

## 2. DB 스키마 변경

### [BE-083] 직책 CIA 매핑 테이블 추가

```prisma
// CIA 등급 enum
enum CiaLevel {
  HIGH    // 상
  MEDIUM  // 중
  LOW     // 하
}

// 직책별 CIA 매핑 테이블 (관리자 설정)
model TitleCiaMapping {
  id                Int       @id @default(autoincrement())
  title             String    @unique   // 직책명 (예: "임원", "팀장", "사원")
  confidentiality   CiaLevel  @default(MEDIUM)  // 기밀성
  integrity         CiaLevel  @default(MEDIUM)  // 무결성
  availability      CiaLevel  @default(MEDIUM)  // 가용성
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

### [BE-084] Asset 모델에 CIA 필드 추가

```prisma
model Asset {
  // ... 기존 필드

  // CIA 등급 (하드웨어만 사용, 할당된 사용자 직책에 따라 자동 설정)
  confidentiality   CiaLevel?   // 기밀성
  integrity         CiaLevel?   // 무결성
  availability      CiaLevel?   // 가용성
}
```

> **참고**: CIA 필드를 Asset에 직접 넣는 이유 — 증적/보고서에서 "이 시점의 CIA"가 필요하기 때문. 직책이 변경되면 자산의 CIA도 갱신하되, 이력은 AuditLog로 추적.

---

## 3. 백엔드 API

### [BE-085] 직책 CIA 매핑 CRUD API

```
GET    /api/admin/title-cia          → 전체 매핑 목록
POST   /api/admin/title-cia          → 매핑 추가 { title, confidentiality, integrity, availability }
PUT    /api/admin/title-cia/[id]     → 매핑 수정
DELETE /api/admin/title-cia/[id]     → 매핑 삭제
```

- ADMIN 역할만 접근 가능
- title 중복 검증 (409)
- 수정/삭제 시 AuditLog 기록

### [BE-086] 자산 할당 시 CIA 자동 설정

**파일**: `app/api/assets/[id]/assign/route.ts`

```typescript
// 할당 시 로직:
// 1. 할당 대상 Employee의 title 조회
// 2. TitleCiaMapping에서 해당 title의 CIA 조회
// 3. Asset의 CIA 필드 업데이트
// 4. AuditLog 기록

async function assignAsset(assetId, employeeId) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  const ciaMapping = await prisma.titleCiaMapping.findUnique({
    where: { title: employee.title }
  });

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      assigneeId: employeeId,
      status: "IN_USE",
      confidentiality: ciaMapping?.confidentiality ?? null,
      integrity: ciaMapping?.integrity ?? null,
      availability: ciaMapping?.availability ?? null,
    }
  });
}
```

**반납 시**: CIA → null로 초기화

### [BE-087] 구성원 직책 변경 시 CIA 연쇄 갱신

**파일**: `app/api/employees/[id]/route.ts` (PUT)

```typescript
// 직책(title) 변경 감지 시:
// 1. 해당 구성원에게 할당된 모든 하드웨어 자산 조회
// 2. 새 직책의 CIA 매핑 조회
// 3. 모든 해당 자산의 CIA 일괄 업데이트

if (oldTitle !== newTitle) {
  const assets = await prisma.asset.findMany({
    where: { assigneeId: employeeId, type: "HARDWARE" }
  });
  const newCia = await prisma.titleCiaMapping.findUnique({
    where: { title: newTitle }
  });

  await prisma.asset.updateMany({
    where: { id: { in: assets.map(a => a.id) } },
    data: {
      confidentiality: newCia?.confidentiality ?? null,
      integrity: newCia?.integrity ?? null,
      availability: newCia?.availability ?? null,
    }
  });
}
```

### [BE-088] 매핑 테이블 변경 시 기존 자산 일괄 갱신

**파일**: `app/api/admin/title-cia/[id]/route.ts` (PUT)

- 매핑의 CIA 값 변경 시 → 해당 직책을 가진 구성원에게 할당된 모든 하드웨어 자산 CIA 일괄 갱신
- 매핑 삭제 시 → 해당 직책의 자산 CIA → null

---

## 4. 프론트엔드

### [FE-083] 직책 CIA 매핑 관리 페이지

**경로**: `/admin/title-cia` 또는 `/settings/title-cia`

```
직책별 CIA 등급 설정
┌──────────┬───────┬───────┬───────┬──────┐
│ 직책      │ 기밀성 │ 무결성 │ 가용성 │ 관리  │
├──────────┼───────┼───────┼───────┼──────┤
│ 대표이사   │ 🔴 상  │ 🔴 상  │ 🔴 상  │ ✏️🗑 │
│ 임원      │ 🔴 상  │ 🔴 상  │ 🟡 중  │ ✏️🗑 │
│ 팀장      │ 🟡 중  │ 🟡 중  │ 🟡 중  │ ✏️🗑 │
│ 사원      │ 🟢 하  │ 🟢 하  │ 🟢 하  │ ✏️🗑 │
└──────────┴───────┴───────┴───────┴──────┘
[+ 직책 추가]
```

- 직책명: 텍스트 입력 (Employee.title과 매칭)
- CIA 각 항목: 드롭다운 (상/중/하)
- ADMIN 전용

### [FE-084] 하드웨어 목록/상세 — CIA 표시

**파일**: `app/hardware/page.tsx`, `app/hardware/[id]/page.tsx`

- 목록: CIA 열 추가 (배지: 🔴상 🟡중 🟢하) — 미할당 시 "—"
- 상세: CIA 섹션 표시 + "직책 기반 자동 산정" 안내

**하드웨어 생성/수정 페이지**: CIA 입력 필드 없음 (자동 산정이므로)

### [FE-085] 하드웨어 할당 UI — CIA 미리보기

- 할당 대상 선택 시 → 해당 구성원의 직책 → CIA 매핑 조회 → 미리보기 표시
- "이 자산의 CIA 등급이 중/중/중으로 설정됩니다" 안내

---

## 5. 엣지 케이스

| 상황 | 처리 |
|---|---|
| 직책이 매핑 테이블에 없는 구성원에게 할당 | CIA = null (미설정) |
| 구성원의 title이 null/빈 문자열 | CIA = null |
| 하드웨어가 아닌 자산에 할당 | CIA 설정 안 함 (하드웨어만) |
| 매핑 삭제 후 해당 직책 구성원 할당 | CIA = null |
| 구성원이 여러 하드웨어를 보유 | 모든 하드웨어에 동일 CIA 적용 |

---

## 6. 검증 체크리스트

- [ ] 하드웨어 생성 시 CIA 필드 없음
- [ ] 할당 시 직책 → CIA 자동 설정
- [ ] 반납 시 CIA 초기화 (null)
- [ ] 구성원 직책 변경 시 할당된 하드웨어 CIA 자동 갱신
- [ ] 매핑 테이블 수정 시 기존 할당 자산 CIA 일괄 갱신
- [ ] 매핑 테이블 CRUD 정상 동작
- [ ] 목록/상세 페이지 CIA 배지 표시
- [ ] 매핑에 없는 직책 할당 시 CIA = null

---

## 7. 티켓 요약

| 티켓 | 역할 | 설명 | 난이도 |
|---|---|---|---|
| BE-083 | Backend | TitleCiaMapping 스키마 + CiaLevel enum | 🟢 쉬움 |
| BE-084 | Backend | Asset 모델 CIA 필드 추가 | 🟢 쉬움 |
| BE-085 | Backend | 직책 CIA 매핑 CRUD API | 🟡 중간 |
| BE-086 | Backend | 자산 할당/반납 시 CIA 자동 설정 | 🟡 중간 |
| BE-087 | Backend | 구성원 직책 변경 시 연쇄 갱신 | 🟡 중간 |
| BE-088 | Backend | 매핑 변경 시 기존 자산 일괄 갱신 | 🟡 중간 |
| FE-083 | Frontend | 직책 CIA 매핑 관리 페이지 | 🟡 중간 |
| FE-084 | Frontend | 하드웨어 목록/상세 CIA 표시 | 🟢 쉬움 |
| FE-085 | Frontend | 할당 시 CIA 미리보기 | 🟢 쉬움 |
