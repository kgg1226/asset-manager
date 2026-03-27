# 조직도 · 정보보호 조직도 도식화 (React Flow 기반)

> 상태: 기획 완료
> 최종 업데이트: 2026-03-24

---

## 개요

현재 CSS flexbox + 가상 선(pseudo-element)으로 구현된 **조직도**와 **정보보호 조직도**를 React Flow 기반 인터랙티브 다이어그램으로 업그레이드한다. 자산 지도와 100% 동일할 필요 없으며, 조직 구조에 맞는 트리 레이아웃을 사용한다.

---

## 현재 상태 (AS-IS)

| 항목 | 조직도 (`visual` 탭) | 정보보호 조직도 (`security` 탭) |
|---|---|---|
| 렌더링 | HTML/CSS flexbox + `::before`/`::after` 연결선 | 동일 |
| 인터랙션 | 노드 클릭으로 펼침/접힘만 | 동일 + 인라인 편집 |
| 드래그 | 불가 | 불가 |
| 줌/팬 | 불가 (`overflow-x-auto` 스크롤만) | 동일 |
| 레이아웃 | 고정 (CSS가 결정) | 동일 |
| 내보내기 | 없음 | 없음 |

**문제점:**
- 조직이 커지면 가로 스크롤이 극심해져서 전체 구조 파악이 어려움
- 노드를 자유롭게 배치할 수 없음
- 인쇄/공유용 이미지 내보내기 불가

---

## 목표 상태 (TO-BE)

| 항목 | 변경 |
|---|---|
| 렌더링 | **React Flow** 기반 캔버스 |
| 인터랙션 | 노드 클릭 → 상세 팝업, 드래그 이동, 줌/팬 |
| 레이아웃 | **dagre 자동 트리 레이아웃** (TB: 위→아래) + 수동 위치 조정 가능 |
| 편집 | 노드 더블클릭 → 편집 모달 (ADMIN만) |
| 내보내기 | PDF 내보내기 (자산 지도와 동일 방식) |
| 미니맵 | 우하단 미니맵 |

---

## 공통 컴포넌트 (조직도 / 정보보호 조직도 공유)

### OrgFlowCanvas

자산 지도의 `asset-map-content.tsx`를 참고하되, 훨씬 단순한 버전.

**자산 지도와 다른 점:**
| 자산 지도 | 조직도 Flow |
|---|---|
| 여러 엣지 유형 (DATA_FLOW, NETWORK...) | 단일 엣지 유형 (계층 연결) |
| 양방향/단방향 엣지 | 항상 부모→자식 (위→아래) |
| 자유 배치 (저장된 위치) | dagre 자동 배치 기본, 수동 조정은 선택 |
| 동적 핸들 분배 | 필요 없음 (1 부모 → N 자식, bottom→top 고정) |
| 섹션/그룹 | 없음 |
| 워크스페이스/페이지 관리 | 없음 |
| LinkModal (연결 생성) | 없음 (DB 계층이 곧 연결) |

**자산 지도와 같은 점:**
- React Flow + dagre 레이아웃
- 줌/팬/미니맵/컨트롤
- PDF 내보내기
- 반응형

---

## 1. 조직도 Flow

### 노드 유형

#### CompanyNode (회사)
```
┌──────────────────────────┐
│  🏢  주식회사 테스트       │
│      5개 부서 · 10명      │
└──────────────────────────┘
```
- 색상: indigo (`#4F46E5`)
- 정보: 회사명, 부서 수, 소속 직원 수

#### DepartmentNode (부서)
```
┌──────────────────────────┐
│  📁  개발팀              │
│      3명                 │
│  김민수 · 이지은 · 송다영  │
└──────────────────────────┘
```
- 색상: 깊이별 그라데이션 (sky→gray)
- 정보: 부서명, 소속 직원 수, 직원 이름 목록 (접힘 가능)

### 엣지

- 유형: `smoothstep`
- 방향: 항상 부모(bottom) → 자식(top)
- 색상: `#D1D5DB` (gray-300)
- 애니메이션: 없음 (정적)

### 레이아웃

- dagre `rankdir: "TB"` (Top → Bottom)
- `nodesep: 60`, `ranksep: 100`
- 회사가 최상위, 부서가 계층적으로 아래로 전개

### 인터랙션

| 동작 | 결과 |
|---|---|
| 노드 클릭 | 부서 상세 패널 (직원 목록, 하위 부서) |
| 노드 더블클릭 | 편집 모달 — 부서명 수정 (ADMIN) |
| 줌/팬 | React Flow 기본 |
| Fit View 버튼 | 전체 트리가 화면에 맞춤 |
| 자동 정렬 버튼 | dagre 재계산 |

---

## 2. 정보보호 조직도 Flow

### 노드 유형

#### SecurityPositionNode (직책)
```
┌──────────────────────────┐
│  🛡️  정보보호 최고책임자   │
│  ┌────────────────────┐  │
│  │ 👤 정하늘 (보안팀장) │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

비어있는 경우:
```
┌──────────────────────────┐
│  🛡️  개인정보 관리책임자   │
│  ┌────────────────────┐  │
│  │ ⚠️ 미배정           │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

- 색상: 깊이별 (red-600 → orange-500 → gray-500)
- 배정 상태: 직원 배정 시 이름+부서, 미배정 시 경고 아이콘
- 핸들: bottom(source) → top(target)

### 엣지

- 유형: `smoothstep`
- 색상: `#FCA5A5` (red-300) — 보안 테마
- 방향: 부모(bottom) → 자식(top)

### 인터랙션

| 동작 | 결과 |
|---|---|
| 노드 클릭 | 직책 상세 패널 (담당자 정보, 하위 직책) |
| 노드 더블클릭 | 편집 모달 — 직책명 + 담당자 변경 (ADMIN) |
| 우클릭 / 메뉴 | 하위 직책 추가, 삭제 (ADMIN) |
| Fit View | 전체 보안 조직이 화면에 맞춤 |

---

## 수정 대상 파일

### 신규 파일
| 파일 | 설명 |
|---|---|
| `app/org/org-flow-canvas.tsx` | 공통 React Flow 캔버스 래퍼 (줌/팬/미니맵/PDF/dagre) |
| `app/org/org-chart-flow.tsx` | 조직도 Flow 컴포넌트 (CompanyNode + DepartmentNode) |
| `app/org/security-org-flow.tsx` | 정보보호 조직도 Flow 컴포넌트 (SecurityPositionNode) |

### 수정 파일
| 파일 | 변경 |
|---|---|
| `app/org/page.tsx` | `visual` 탭 → `org-chart-flow.tsx` 사용, `security` 탭 → `security-org-flow.tsx` 사용 |
| `app/org/org-chart-visual.tsx` | 삭제 또는 유지 (레거시 폴백) |
| `app/org/security-org-chart.tsx` | 삭제 또는 유지 (레거시 폴백) |

### 변경 없음
| 파일 | 이유 |
|---|---|
| `app/org/org-tree.tsx` | 관리 탭은 기존 트리 UI 유지 (편집 중심) |
| `app/api/org/**` | API 변경 없음 — 기존 데이터 구조 그대로 사용 |
| `prisma/schema.prisma` | DB 변경 없음 |

---

## API 변경

**없음.** 기존 API 응답을 클라이언트에서 React Flow 노드/엣지로 변환한다.

### 데이터 변환 로직 (클라이언트)

```
GET /api/org/companies (기존)
→ Response: { companies: [{ id, name, orgs: [{ id, name, parentId, members }] }] }

변환:
- CompanyNode: id="company-{id}", position=dagre
- DepartmentNode: id="dept-{id}", position=dagre
- Edge: company→dept (parentId=null), dept→dept (parentId≠null)
```

```
GET /api/org/security-chart (기존)
→ Response: [{ id, title, employeeId, parentId, employee: { name, department } }]

변환:
- SecurityPositionNode: id="sec-{id}", position=dagre
- Edge: sec-{parentId} → sec-{id}
```

---

## i18n 키 추가

```
org.flowView           → 다이어그램
org.autoArrange        → 자동 정렬
org.fitView            → 전체 보기
org.exportPdf          → PDF 내보내기
org.members            → (기존 키 재사용)
org.addChild           → 하위 추가
org.noEmployee         → 미배정
```

---

## 작업 분해

| # | 티켓 | 역할 | 내용 | 의존 |
|---|---|---|---|---|
| 1 | DEV-ORG-001 | Dev | `org-flow-canvas.tsx` — 공통 캔버스 래퍼 (ReactFlow + dagre TB + 미니맵 + 컨트롤 + PDF) | - |
| 2 | DEV-ORG-002 | Dev | `org-chart-flow.tsx` — CompanyNode + DepartmentNode + 데이터 변환 + 클릭 패널 | 1 |
| 3 | DEV-ORG-003 | Dev | `security-org-flow.tsx` — SecurityPositionNode + 데이터 변환 + 편집 모달 | 1 |
| 4 | DEV-ORG-004 | Dev | `page.tsx` 탭 교체 — visual → org-chart-flow, security → security-org-flow | 2, 3 |
| 5 | DEV-ORG-005 | Dev | i18n 키 추가 (6개 언어) | 4 |
| 6 | DEV-ORG-006 | Dev | PDF 내보내기 (react-flow viewport → 이미지 → PDF) | 1 |
