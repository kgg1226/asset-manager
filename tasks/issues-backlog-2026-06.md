# 이슈 백로그 (2026-06-10 일괄 진단)

> 9개 영역 병렬 코드 진단(148회 조회) 결과. 우선순위·공수·스키마 변경·결정 필요 항목 정리.

## P0 — 버그 (결정 불요, 즉시 수정)

### B1. 자산지도 계속 초기화 + 자산 추가 시 소실 [effort: low]
- **근본 원인 확정**: dev-021이 flushSave에 추가한 `setActiveWorkspace`(asset-map-content.tsx:2194)가
  매 자동저장(2~3초)마다 새 객체 참조 생성 → fetchGraph effect(:2749, 의존성=activeWorkspace 객체) 재발화 →
  전체 재로드+dagre 재배치+stale 위치 재적용. **자기 파괴 루프**.
- 자산 추가 소실도 같은 뿌리: flushSave가 로컬 nodePositions를 갱신 안 해 fetchGraph가 stale ID 필터(:2496)로
  신규 노드 탈락 → 다음 저장이 서버를 덮어써 영구 소실. (dev-020 보호장치의 회귀)
- 수정: effect 의존성 `activeWorkspace?.id`로, flushSave에서 ref 병합, restoringRef로 onMoveEnd 가드. 단일 파일.

## P1 — 빠른 가치 (스키마 불요, 결정 경미)

### F1. 환율 자동 동기화 [effort: medium]
- 진단: cron 라우트(BE-056)·인증·무료 API 폴백 전부 구현돼 있는데 **트리거만 미연결** — 버튼 안 누르면 영원히 미갱신.
- 수정: 동기화 본체를 lib로 추출 → GET 시 stale-while-revalidate(오늘 데이터 없으면 자동 동기화) + (선택) EC2 crontab 일 1회.
- 참고: 마지막 동기화 시각 표시 버그(존재하지 않는 updatedAt 참조) — 제대로 고치려면 스키마 1컬럼(보류 가능).

### F2. 증적: 다운로드 디폴트 + 미리보기 [effort: medium]
- 진단: 설계 자체가 GDrive 단일 경로(다운로드 경로 자체가 없음). 미리보기는 데이터(ArchiveData.payload)와 API 절반이
  이미 있는데 UI 미연결.
- 수정: xlsx 생성을 lib 추출 → 다운로드 라우트 신설(attachment), 다운로드 버튼 기본·GDrive 보조. 미리보기는 dataType별 건수 요약 1차.

### F3. 클라우드 자산 컬럼 재구성 [effort: low~medium]
- 진단: CloudDetail 30개 필드 중 목록 노출 2개(platform/resourceType). accountId는 fetch까지 해놓고 미표시.
  비용 셀(cost)과 상단 카드(monthlyCost) 기준 불일치. renewalDate/autoRenew/syncStatus 미노출.
- 수정: accountId·region·serviceCategory·갱신일 컬럼 추가, 비용 기준 monthlyCost로 통일, syncStatus 배지.

### F4. 도메인/SSL 1단계 [effort: medium]
- 진단: 3년(36개월)은 데이터·폼 모두 **이미 지원** — 실제 공백은 ① 목록에 주기 컬럼 없음 ② 프리셋 외 임의 개월 입력 불가
  ③ "3Y" 영문 표기(한국어 "3년" 미적용) ④ 도메인이 하드웨어용 상태(IN_STOCK=재고)를 그대로 사용 + 생성 시 상태 지정 불가.
- 수정(스키마 불요): 주기 컬럼+임의 개월 입력+한국어 연수 표기+도메인 전용 상태 라벨 매핑(미연결/운영 중/휴면/해지 예정/해지 완료)+생성 폼 상태 선택(기본 IN_USE).
- 2단계(스키마 승인 필요): registrant(소유권자), onlineStatus+lastCheckedAt(온라인 체크 cron — HTTP/DNS, 기존 cron 패턴 재사용 가능).

### F5. 자산분류체계 UI 연결 [effort: medium]
- **답변: "부분 동작"** — 정의 계층(관리 CRUD)과 API(필터 파라미터 포함)는 완성, **소비 계층이 0**: 자산 폼에 분류 선택 UI가
  없어 subCategoryId가 채워질 경로가 없고, 필터 파라미터를 호출하는 화면도 없음(사장 상태).
- 수정: 분류 트리 조회 공용 API(현재 admin 전용) + 자산 생성/편집 폼에 대분류→소분류 캐스케이드 셀렉트 + 목록 분류 컬럼/필터.

### F6. 탭 구성 정리 [effort: low]
- 진단: 5그룹 25항목, admin 그룹에 11개 집중. 통합 후보: 증적 카테고리→증적 안으로(C1 결정과 연동), 자산분류/CIA 매핑→"분류·등급" 묶음,
  가져오기/내보내기 인접 배치 등.

## P2 — 방향 결정 필요

### D1. 자산지도 개인정보 흐름도 → 증적 자료화 [effort: medium~high]
- **"왜 고정인가" 답변**: 수집/저장/이용·제공/파기 4개 카드는 **pii 뷰 전용 스윔레인 행 헤더**(dev-017 의도) — 사용자가 배치하는
  노드가 아니라 매 진입 시 좌표 고정 재생성되는 범례라서 이동 불가로 설계됨.
- 격차: ① pii 뷰는 영역(섹션)과 공존 불가(레이아웃이 섹션을 버림 :858-864) ② all 뷰는 섹션은 되지만 단계 카드 없음
  ③ 단계 배치가 이름 패턴 추측 의존 — **Asset.piiStage 필드는 있는데 설정 UI가 어디에도 없음** ④ PDF 내보내기는 이미 존재(A3 가로).
- 선택지: (A) pii 뷰 유지 + 섹션 공존 + piiStage 지정 UI (최소) / (B) 단계 카드를 자유 배치 팔레트로 격상해 all 뷰에서
  AWS/온프레미스 섹션과 조합 (사용자 의도 최대 부합, 공수 최대) / A→B 단계적.

### D2. 증적 카테고리 [effort: low~medium]
- **"존재 의의" 답변**: **죽은 기능** — "증적을 카테고리별 GDrive 폴더에 분류 저장"하려던 설계인데 ① 증적 생성 시 카테고리 지정 UI 없음
  ② 지정해도 driveFolder를 업로드 로직이 무시. Archive.categoryId는 코드 경로상 항상 null.
- 선택지: 연동 완성(생성 시 선택+폴더 매핑) vs 메뉴 제거(기능 삭제 승인 필요) vs 보류.

### D3. 조직도 할당 UX [effort: medium]
- 진단: 할당 UI 3곳 전부 평면 `<select>`(보안 조직도는 500명 목록). 서버 필터(orgUnitId+search)는 완비 — 순수 프런트 공백.
- 선택지: (A) 검색형 직원 피커로 기존 select 교체 / (B) 조직도 화면에서 직접 할당(노드에 멤버 표시+할당 버튼) / 둘 다.

## P3 — 대공사 (별도 설계·승인)

### R1. 관리자 권한 구조 개편 (RBAC) [effort: high — 4단계 분할 필수]
- 진단: 현재 2비트 모델(ADMIN/SUPER_ADMIN). 요구(업무별 권한·보기/수정 분리·권한 담당자·카테고리 일괄 토글·민감 권한 분리)를
  담을 자료구조 자체가 없음. 인라인 role 비교 76곳 + requireAdmin 35곳 = **약 110개 체크포인트 전수 치환**.
- 계획: ① UserPermission 모델(userId+resource 10~12키+canView/canEdit)+User.isPermissionManager, 기존 ADMIN 전권 백필
  ② lib/permissions.ts(requirePermission, SUPER_ADMIN 바이패스) ③ 110곳 단계 치환 ④ 권한 관리 UI(카테고리 일괄 토글, 민감 권한 별도 섹션).
- 결정 필요: 권한 단위(페이지 vs 기능), 권한 담당자의 한계(민감 권한·담당자 지정 가능 여부), 백필 정책.

## 권장 실행 순서
B1(즉시) → F1~F6(순차, 각각 독립 PR) → D1~D3(결정 후) → R1(P1 정리 후 착수)

## 결정 사항 (2026-06-10 사용자 확정)
- D1 PII 흐름도: **A→B 단계적** (A: pii뷰 섹션 공존+piiStage 지정 UI 먼저 → B: 단계 카드 팔레트화)
- D2 증적 카테고리: **보류** (현상 유지, F6 탭 정리에서 카테고리 통합 제외)
- D3 조직 할당: **둘 다 — 피커 먼저** (select 3곳 교체 → 조직도 직접 할당)
- R1 RBAC: **P0~P1 완료 후 착수** (설계안 승인 → 4단계)
- 실행 순서: B1 → F1~F6 → D1-A → D3 피커 → D1-B/D3-B → R1 설계
