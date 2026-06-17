# 추가 이슈 5건 — 우선순위 로드맵 + 상세 수정 계획 (2026-06-16)

> 멀티에이전트 진단(자동저장 버그·자산PII항목·클라우드필드·SBOM, 5 에이전트) 종합.
> 핵심: 자동저장이 데이터유실급 P0. 나머지는 오작동위험(P1)→non-breaking(P2)→breaking·신규역량(P3).

## 🔴 P0 — 자동저장 데이터유실 (effort: low, schema: none) — 최우선
**파일**: app/asset-map/asset-map-content.tsx + app/api/asset-map/views/[id]/route.ts
- **근본 원인**: flushSave가 PUT 응답을 검사하지 않음(2218). fetch는 4xx/5xx에 reject 안 함 →
  401(세션만료)/404(뷰 삭제됨)/500(DB오류)에도 try가 throw 없이 끝나 setSaveStatus('saved')(2244) 실행.
  게다가 dirtyRef=false 유지(2181) + savedState로 ref/state 덮어씀(2236-2243) → 후속 flushSave는
  early-return(2180) → **변경분 영구 소실**. beforeunload(dirtyRef 의존) 방어선도 무력화.
- **저장 트리거 답**: 하이브리드 — 액션이 markDirty로 debounce 타이머를 건다(액션 단위 호출, 시간 단위 저장).
  노드드래그 2000ms, 엣지생성/삭제 300ms, 정렬 500ms, 팔레트 추가 300ms, 뷰포트 3000ms(별도 타이머).
- **수정**:
  1. `const res = await fetch(...PUT...)` + `if (!res.ok) throw` 를 savedState 적용 전에 삽입
  2. savedState 병합·setActiveWorkspace·setSaveStatus('saved')를 res.ok 통과 후로만 재배치
     → 실패 시 catch가 setSaveStatus('dirty')+dirtyRef=true 복구, stale 오염 차단
  3. 회귀 테스트(__tests__): 401·500에서 'saved' 미표시 + dirty 유지 + 재전송 검증

## P1 — 오작동 위험 / P0 동반
### P1-a. 자동저장 markDirty 누락 액션 (같은 PR로 P0와 묶음, schema: none)
- 누락: 섹션 생성 handleAddSection(3399), 섹션 편집 onBlur 이름(4410)·설명(4423)·색상(4438)·삭제(4476),
  handleAutoLayout(3187), 노드 리사이즈(onNodesChange 2921 dimensions 변경). → 각 지점 markDirty 추가.
### P1-b. 클라우드 갱신일 이중출처 (schema: 단계적 breaking, 데이터 주의)
- Asset.renewalDate vs CloudDetail.renewalDate 이중 → cron renewal-notify 알림 누락/오발송 위험.
- **선행 조사**: renewal-notify가 어느 필드 읽는지 확인 → 클라우드는 Asset.renewalDate 단일화
  → 폼 입력 제거(non-breaking) → 백필 마이그레이션 → 컬럼 드롭(P3).

## P2 — non-breaking 개선 / 기능 확장
### P2-a. 자동저장 잔여 (schema: none): beforeunload 페이로드에 edgeVisibility 누락 추가, debounce 기아(maxWait), 타이머 이원화 정리
### P2-b. 클라우드 필드 정리 (schema: none): syncStatus 죽은 배지 제거(cloud/page.tsx:286), seatCount를 SaaS/PaaS만 노출+라벨 명확화, 서비스유형별 폼 그룹화(resourceType 매트릭스: 컴퓨트/DB/스토리지/서버리스/네트워크/SaaS)
### P2-c. 자산 PII 항목 인벤토리 (schema: additive, effort: medium)
- **현황**: PII 항목(이름/이메일/주민번호)은 엣지(AssetLink.piiItems)에만 존재. 자산 노드 레벨엔
  piiStage(단계 1개)뿐 → 흐름 없는 자산의 수집 항목 추적 불가, 항목×자산 보유기간·근거 답 불가.
- **계획**: ① lib/pii-items.ts 카탈로그(코드·분류 고유식별정보/민감정보/일반, schema 무) ②
  스키마(승인): 권장 AssetPiiItem 모델(assetId/category/itemKey/legalBasis/retentionPeriod/
  destructionMethod/lifecycleStages) 또는 경량 Asset.piiItems String? ③ PiiItemsEditor 폼 ④
  asset-map route 노드 SELECT에 piiItems 추가 → AssetNode 분류별 배지. piiStage 보존(공존).

## P3 — breaking / 신규 역량 (인간 승인)
### P3-a. 클라우드 사장 컬럼 6개 드롭 (breaking): importSource/externalArn/lastSyncAt/syncStatus/rawMetadata/tags — sync 미구현 확정 시. 항상 빈 값이라 데이터유실 0. + CloudDetail.renewalDate 드롭(P1-b 백필 후)
### P3-b. SBOM 증적 역량 (additive, effort: high) — SPDX/CycloneDX
- 격차: SoftwareComponent 모델 부재(version/purl/cpe/hash), 의존성 그래프 표준 식별자 없음,
  OSS 라이선스(MIT/GPL)·정책 모델 없음, CVE/VEX 연동 전무, SBOM export(SPDX/CycloneDX) 부재.
- 단계: ① SoftwareComponent ② ComponentDependency(direct/transitive) ③ Vulnerability+VEX
  ④ lib/sbom/{cyclonedx,spdx}.ts export ⑤ 통합 증적 허브(/exports: 대장 Excel + 흐름도 PDF + SBOM JSON)
  ⑥ (선택) package-lock/syft import + CVE 재스캔 cron.

## 스키마 승인 묶음 (prisma 쓰기 금지 — 일괄 결재)
| # | 변경 | 종류 | 종속 | 위험 |
|---|------|------|------|------|
| S1 | AssetPiiItem 모델(또는 Asset.piiItems String?) | additive | P2-c | 무위험 — 즉시 승인 권장 |
| S2 | Asset.renewalDate 백필 마이그레이션 | 데이터 | P1-b | 중(cron 조사 후) |
| S3 | CloudDetail.renewalDate 드롭 | breaking | P3-a | S2 후 |
| S4 | CloudDetail 사장 6컬럼 드롭 | breaking | P3-a | sync 폐기 확정 시 |
| S5 | SBOM 모델군(SoftwareComponent 등) | additive | P3-b | 설계 확정 후 |

## 의존관계
- autosave P0 → P1-a → P2-a (같은 파일 연속). P0가 모든 작업 게이트.
- cloudFields P1-b ← cron 조사 선행 → P3-a(드롭). P2-b는 매트릭스 작성 선행, 독립.
- piiItems: lib 카탈로그 → 스키마(S1) → UI → 시각화. 경량안이 권장안 1단계.
- sbom: 독립 신규 역량, P3.

## 착수 추천
**autosave P0 즉시 단독 착수**(데이터유실·effort low·schema none). 같은 PR에 P1-a(markDirty 누락)·
P2-a(잔여) 묶어 자산지도 자동저장 한 번에 안정화. 병렬로 S1(AssetPiiItem) 승인 + cron renewal-notify
필드 조사를 요청해두면 직후 P2-c/P1-b로 막힘 없이 전환.
