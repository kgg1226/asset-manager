# 결점 체크 백로그 (2026-06-23) — dev-039~048 누적 감사 후속

멀티에이전트 결점 체크(4갈래 + 적대적 검증)에서 확정된 14건 중,
즉시조치(P0/P1 버그)는 dev-049 에서 처리. 아래는 기능완결(P1)·부채(P2/P3) 추적.

## 기능완결 P1 — PII 증적 파이프라인 봉합 (dev-050+ 별도 트랙)

PII 모델은 골격(스키마·카탈로그)은 정합하나 양 끝단이 열려 있어 "라이프사이클 추적"이 미작동:

- **#7 입력단 결손**: AssetPiiItem.lifecycleStages(JSON 복수)·destructionMethod 는 스키마·API 가 수용하나
  PiiItemsEditor 에 입력 위젯이 없어 영구 NULL. edit-load 매핑도 3필드만 복원.
  → PiiItemRow 에 두 필드 추가 + 에디터에 단계 다중칩(PII_STAGES 재사용)·파기방법 입력 + 폼 edit-load 복원.
- **#8 통합단 분산**: 노드는 PII_ITEM_CATALOG 코드, 엣지 piiItems 는 LinkModal 자유텍스트(split ","),
  추가로 엣지 dataTypes(PII/LOG/CREDENTIAL)까지 3중 어휘. lib/pii-items.ts 주석의 "단일 출처 공유"가 코드로 안 닫힘.
  → LinkModal piiItems 입력을 카탈로그 칩으로 교체 + 기존 자유텍스트 역매핑 마이그레이션.
- **#9 출력단 부재**: ISMS-P 흐름표/증적 export 엔드포인트 0건(reports 에 pii 문자열 0). 데이터만 쌓이고 산출물 없음.
  → app/api/reports/pii-flow 신설 — AssetPiiItem + 엣지 piiItems/legalBasis 합쳐 6컬럼 흐름표. (#7 선행 필요)

## P2 부채

- **#10** 신규 AssetPiiItem(노드 PII 항목)이 자산맵에 미시각화 — 맵은 piiStage 단일만 사용.
  → 노드 data 에 piiItems category 요약 주입 + AssetNodeComponent 에 PII_CATEGORY_STYLE 배지. (dev-047 "다음" 승격)
- **#11** piiStage(단일)·lifecycleStages(복수) 의미 경계·우선순위 미정의 → 모순 가능.
  → 역할 문서화(piiStage=자산대표, lifecycleStages=항목세부) + 가능하면 자산 piiStage 를 항목 합집합에서 도출/경고.
- **#4** distributeEdgeHandles 가 state 엣지 객체 in-place 변이(handleSaveLink/onConnect 경로).
  → 순수 함수화(입력 복제 후 변이) 또는 호출부에서 복사본 전달.
- **상수 단일출처화** LINK_TYPES 3곳·DIRECTIONS 2곳(이미 dev-048 이슈5 400버그 유발)·PII_STAGE_MAP 재선언.
  → lib/asset-link.ts 신설(LINK_TYPES/DIRECTIONS as const + 타입가드), asset-map PII_STAGE_MAP 을 PII_STAGES 파생으로.
- **asset-links 검증 우회** label/protocol/condition 등이 vStr/vNum 미적용 raw 저장, piiItems Array.isArray 미검사.
  → lib/validation 의 vStr/vEnum 도입, dataTypes/piiItems 배열검사, direction!=='CONDITIONAL' 시 condition=null 강제.
- **에러처리 불일치** asset-links 는 매직문자열 switch, 자산 라우트는 ValidationError/handlePrismaError.
  → asset-links 도 handlePrismaError 수렴(P2025→404).
- **department↔orgUnit 이원화** 읽기 FK우선·쓰기 '-' 플레이스홀더 잔존(employees/new/actions.ts).
  → 스키마 변경(사전 기획+적합성 시뮬레이션 후) — department 흡수/강등. MEMORY schema-change-workflow 규칙.

## P3 정리

- **#5** 데드코드: arrow-reverse SVG marker 정의(미참조)·EdgeLabelBadge(미사용) 제거.
- **#6** AssetEdge.sourceAssetName/targetAssetName 데드 타입필드 — API 는 sourceName/targetName. 제거 또는 통일.
- **#12** PII_STAGE_MAP 을 lib/pii-stage.ts import 로 파생(현재 하드코딩, 값은 일치하나 표류 위험).
- **lint 86 warnings** no-unused-vars 44·exhaustive-deps 25(t.* 16건 무해)·no-unused-expressions 15. 자동정리 가능분부터.

## 구조 부채 (별도 대형 티켓 — SCOPE 확장 협의 필요)

- **asset-map-content.tsx 4586줄 분할** — nodes/·lib/asset-map/layout.ts·persistence.ts·모달 분리.
  동작보존 리팩터링이라 별도 티켓 + SCOPE 확장. 순수함수 추출이 테스트 도입과 맞물림.
- **테스트 도입(vitest)** — 회귀가 실제 난 지점(distributeEdgeHandles, getPiiLifecycleLayout, 저장 직렬화,
  asset-links DIRECTIONS 계약)부터 핀포인트. CLAUDE.md 파이프라인의 npm test 스냅샷이 현재 no-op.
- **타입 게이트 복구** — next.config ignoreBuildErrors:false 또는 CI 에 tsc --noEmit 잡 추가.
  현재 dev-049 로 앱코드 에러는 0 이나, .next/dev/types/validator.ts 생성물 에러가 있어 단순 false 전환은
  clean 빌드 확인 후 진행. 신규 타입오류 유입 차단이 목적.
