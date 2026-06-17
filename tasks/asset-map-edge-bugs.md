# 자산지도 연결선·애니메이션·뷰전환 버그 7건 (2026-06-16 진단)

> 멀티에이전트 진단(3그룹 병렬 + 종합). 7건 = 3 근본원인 클러스터.

## 클러스터 A — fetchGraph 재실행 결합 (animateEdges/view → 통째 재로드)
fetchGraph useCallback이 animateEdges 의존(2804) + effect가 fetchGraph 의존(2811-2815)
→ 애니메이션 토글이 네트워크 재요청 + dagre 재배치 + 팔레트 리셋을 전부 유발.
- 이슈6 (토글 시 위치·팔레트 초기화): animateEdges가 2804 의존성 — 직접 원인
- 이슈3-A (껐다 켜야 적용): 신규 엣지(onConnect 3066-3092)에 animated 누락 → 토글 우회로 의존
- 이슈3-B (마커 크기 흔들림): markerEnd(2721) markerUnits 미지정 → strokeWidth 종속(BI3/UNI2/COND1.5)

## 클러스터 B — 비-all 뷰 "엣지 연결 역산" + 가시성 화이트리스트 충돌
- 이슈1 (미연결 Network 장비 탈락): route.ts:108-114가 엣지 연결 노드(assetNodeIds)만 반환,
  deviceType 필터 안 씀. NETWORK 링크 없는 Network 장비 제외
- 이슈4 (탭 전환 시 연결선 소실): flushSave(2212-2216)가 "직전 뷰 가시 엣지 id"를 visibleEdgeIds로
  저장 → 다른 뷰 가면 그 뷰 엣지가 화이트리스트에 없어 전탈락. markDirty가 덮어쓰면 영구 제거

## 클러스터 C — 핸들 분배 · 방향 표현
- 이슈7 (겹친 선 소실): distributeEdgeHandles(697-735)가 target/source 독립 루프 → 같은 변에서
  incoming/outgoing이 동일 퍼센트 핸들(left-p33) 공유 → 완전 겹침 + onConnect 가드(3098) stale
- 이슈2 (BI≈UNI): animated가 방향 무분기(2715) → 양방향 흐름 표현 없음 + markerStart context-stroke 색 불일치

## 회귀 위험 (★ dev-032 영구소실 영역)
- dev-032는 "workspace-id 재발화"만 막음, "view/animateEdges 재발화"는 미처리 → 클러스터 A 수정은 정합
- 클러스터 B(이슈4)는 flushSave visibleEdgeIds 덮어쓰기 = dev-032가 경고한 stale 저장 루프 계열.
  합집합 잘못 구현 시 "다음 저장이 서버 덮어써 영구 소실" 재발 → edgeVisibility를 view별 맵 분리 필수
- getLayoutedElements(777-783)가 기존 position 무시·덮어씀 = 위치 초기화 증폭기

## 권장 PR 분할·순서
| 순서 | PR | 이슈 | 위험 | 비고 |
|------|----|----|------|------|
| 1 | PR-A 토글 분리 | 6, 3-A | 중 | animateEdges 의존성 제거 + animateEdgesRef + 토글 in-place setEdges. 체감 최대 |
| 2 | PR-B 마커 고정 | 3-B | 저 | markerUnits:'userSpaceOnUse'. 독립·즉시 |
| 3 | PR-C 핸들 분배 | 7 | 중 | distributeEdgeHandles 단일 네임스페이스 + 가드 제거 |
| 4 | PR-D flush 가드 | (가드) | — | 뷰 전환 중 flush 억제(restoringRef 동형). PR-E 전제 |
| 5 | PR-E 비-all 뷰 | 1, 4 | **고** | route OR 확장 + view≠all 필터 스킵 + edgeVisibility view별 맵. PR-D 후 |
| 6 | PR-F BI 양방향 | 2 | 중 | 커스텀 edge 타입 + 시작 화살촉 색. 신규 |
| 7 | PR-G 조건부(스키마) | 5 | 고 | AssetLink.condition String? 승인 + PATCH DIRECTIONS 4값 통일 |

PR-A/B/C 독립·병렬 가능. PR-D→E 직렬 필수. PR-G만 스키마 승인 대상.

## 스키마 변경 (이슈5만)
- AssetLink.condition String? (nullable) — 인간 승인
- 동반(승인 외): asset-links route POST/PATCH condition 통과, **PATCH DIRECTIONS=["UNI","BI"]→4값 통일**
  (현재 기존 링크를 REVERSE/CONDITIONAL로 PATCH 시 400), LinkModal 조건 textarea, 상세 모달 표시
