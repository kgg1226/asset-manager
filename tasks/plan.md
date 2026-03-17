# 자산지도(Asset Map) 기능 기획

## 개요
모든 자산(라이선스, 클라우드, 하드웨어, 도메인, 계약)과 조직원·부서 간의 관계를 **한 화면의 인터랙티브 노드-엣지 그래프**로 시각화하는 페이지.

---

## 1. 시각화할 관계 (노드 & 엣지)

### 노드 유형 (6종)
| 노드 | 색상 | 아이콘 | 데이터 소스 |
|---|---|---|---|
| **라이선스** | 파랑 | FileText | License 테이블 |
| **클라우드** | 보라 | Cloud | Asset (type=CLOUD) |
| **하드웨어** | 주황 | HardDrive | Asset (type=HARDWARE) |
| **도메인/SSL** | 초록 | Globe | Asset (type=DOMAIN_SSL) |
| **조직원** | 회색 | User | Employee |
| **부서** | 하늘 | Building2 | OrgUnit |

### 엣지 유형 (5종)
| 관계 | 방향 | 라벨 | 데이터 소스 |
|---|---|---|---|
| 라이선스 → 조직원 | 할당 | "할당됨" | Assignment (returnedDate IS NULL) |
| 자산 → 조직원 | 배정 | "배정됨" | Asset.assigneeId |
| 자산 → 라이선스 | 연결 | "설치됨" | AssetLicenseLink |
| 자산/라이선스 → 부서 | 소속 | "소속" | Asset.orgUnitId / LicenseOwner |
| 라이선스 → 라이선스 | 계층 | "하위" | License.parentId |

---

## 2. 라이브러리 선택

### reactflow (권장)
- **npm 패키지**: `@xyflow/react` (v12+)
- 노드-엣지 그래프에 최적화, React 네이티브
- 줌/팬/드래그 기본 지원
- 커스텀 노드 렌더링 (아이콘, 색상, 뱃지 등)
- 폐쇄망 호환 (npm install로 번들)
- 미니맵, 컨트롤 패널 내장
- 자동 레이아웃은 dagre 또는 elkjs 보조 (옵션)

> **대안**: 순수 SVG/Canvas 직접 구현 — 라이브러리 의존 없지만 줌/팬/레이아웃 직접 구현 필요. 권장하지 않음.

---

## 3. 페이지 구조

### 경로: `/asset-map`

### 레이아웃
```
┌─────────────────────────────────────────────┐
│  필터 바                                      │
│  [유형 토글] [부서 선택] [검색] [레이아웃 전환]  │
├───────────┬─────────────────────────────────┤
│           │                                 │
│  범례     │   그래프 캔버스                    │
│  (좌측)   │   (노드 + 엣지)                  │
│           │                                 │
│           │              [미니맵]             │
│           │              [줌 컨트롤]          │
├───────────┴─────────────────────────────────┤
│  상세 패널 (노드 클릭 시 하단/우측 슬라이드)    │
└─────────────────────────────────────────────┘
```

### 필터 바 기능
- **유형 토글**: 라이선스 / 클라우드 / 하드웨어 / 도메인 / 조직원 / 부서 (다중 선택)
- **부서 필터**: 특정 부서 선택 시 해당 부서 관련 노드만 표시
- **텍스트 검색**: 자산명/조직원명으로 노드 하이라이트
- **레이아웃 전환**: 자동배치(dagre) / 자유배치(force)

### 노드 클릭 → 상세 패널
- 자산: 이름, 유형, 상태, 비용, 만료일, 연결된 자산/조직원 목록
- 조직원: 이름, 부서, 할당된 라이선스/자산 목록
- "상세 페이지로 이동" 링크 포함

---

## 4. API 설계

### `GET /api/asset-map`

**쿼리 파라미터:**
- `types` (선택): `LICENSE,CLOUD,HARDWARE,DOMAIN_SSL` — 포함할 유형
- `orgUnitId` (선택): 특정 부서 필터
- `search` (선택): 이름 검색

**응답:**
```json
{
  "nodes": [
    { "id": "license-1", "type": "LICENSE", "label": "MS Office 365", "status": "IN_USE", "monthlyCost": 15000, "meta": { ... } },
    { "id": "asset-5", "type": "HARDWARE", "label": "MacBook Pro #12", "status": "IN_USE", "meta": { ... } },
    { "id": "employee-3", "type": "EMPLOYEE", "label": "홍길동", "meta": { "orgUnit": "개발팀" } },
    { "id": "orgunit-2", "type": "ORG_UNIT", "label": "개발팀", "meta": { "memberCount": 12 } }
  ],
  "edges": [
    { "source": "license-1", "target": "employee-3", "type": "ASSIGNMENT" },
    { "source": "asset-5", "target": "employee-3", "type": "ASSIGNED_TO" },
    { "source": "asset-5", "target": "license-1", "type": "INSTALLED" },
    { "source": "employee-3", "target": "orgunit-2", "type": "BELONGS_TO" }
  ]
}
```

**성능 고려:**
- 노드 수가 많을 경우 (100개+) 서버에서 필터 적용 후 전달
- 부서 단위 필터가 기본 — 전체 보기 시 부서 노드만 표시하고 클릭 시 확장

---

## 5. 파일 구조

```
app/
  asset-map/
    page.tsx                    ← 서버 컴포넌트 (데이터 fetch)
    _components/
      asset-map-canvas.tsx      ← React Flow 캔버스 (클라이언트)
      asset-map-filters.tsx     ← 필터 바
      asset-map-legend.tsx      ← 범례
      asset-map-detail-panel.tsx ← 노드 클릭 상세
      custom-nodes.tsx          ← 커스텀 노드 컴포넌트 (유형별 아이콘/색상)
  api/
    asset-map/
      route.ts                  ← GET 핸들러
lib/
  asset-map-builder.ts          ← 노드/엣지 빌드 로직
```

---

## 6. 사이드바 추가

`app/sidebar.tsx`에 자산지도 항목 추가:
```
{ href: "/asset-map", labelKey: "assetMap", icon: <Map className="h-4 w-4" /> }
```
위치: 대시보드 바로 아래 (두 번째 항목)

---

## 7. i18n 키 추가

```
sidebar.assetMap: "자산지도" / "Asset Map" / "資産マップ" / ...
assetMap.title: "자산지도"
assetMap.filter.*: 필터 관련
assetMap.legend.*: 범례 관련
assetMap.detail.*: 상세 패널 관련
assetMap.edge.*: 엣지 라벨
```

---

## 8. 구현 순서

| 단계 | 내용 | 예상 규모 |
|---|---|---|
| **1** | `npm install @xyflow/react dagre @types/dagre` | 의존성 |
| **2** | `GET /api/asset-map` API + `lib/asset-map-builder.ts` | BE |
| **3** | `/asset-map/page.tsx` + 캔버스 컴포넌트 (기본 노드/엣지 렌더링) | FE |
| **4** | 커스텀 노드 (유형별 아이콘·색상·상태 뱃지) | FE |
| **5** | 필터 바 + 부서 드릴다운 | FE |
| **6** | 노드 클릭 → 상세 패널 | FE |
| **7** | 사이드바 메뉴 + i18n | FE |
| **8** | 범례 + 미니맵 + 줌 컨트롤 | FE 마무리 |

---

## 9. 제약 사항

- **폐쇄망**: @xyflow/react, dagre 모두 npm 번들 → OK
- **ARM64 EC2 (2GB RAM)**: React Flow는 클라이언트 렌더링이므로 서버 부하 없음. API에서 노드 수 제한(최대 500개) 권장
- **Prisma**: 기존 스키마 변경 없음 — 모든 관계 데이터가 이미 존재
