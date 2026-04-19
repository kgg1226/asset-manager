# Roadmap — 고도화 계획

## 완료 (2026-04-14, dev-001)

- [x] 알림 이력 status 버그 수정 — 통계 `ok`/`fail`이 "SUCCESS"/"FAILED" 기준으로 집계
- [x] 알림 이력 API 페이지네이션 추가 — `page`, `limit`, `totalPages` 응답
- [x] 통합 검색 커버리지 확대, types 파라미터, limit 상향

## 완료 (2026-04-19, dev-002~006)

- [x] 통합 검색 UI — vendor·renewalStatus·조직 타입 표시 + 조직 섹션 추가
- [x] 알림 이력 UI — 페이지네이션 + 날짜 범위 필터 + FAILED 재발송 버튼
- [x] 정보자산관리대장 엑셀 내보내기 (ISMS 양식, 6시트)
- [x] 조직도 비주얼 → React Flow (dagre 레이아웃, MiniMap, PNG 내보내기)
- [x] Prisma 클라이언트 재생성, assetTag findFirst 버그 수정

## 완료 (2026-04-19, dev-006~007)

- [x] 보고서 커스텀 내보내기 — 필드 선택 모달 + 프리셋 저장 (localStorage)
- [x] 정보보호 조직도 React Flow 업그레이드 (SecurityOrgChart)
- [x] FE-047: "자산카테고리" → "증적 카테고리" 리네이밍

## 완료 (2026-04-19, dev-008)

- [x] BE-078: 보고서 생성 → 증적 자동 연동 (Excel 다운로드 시 Archive 자동 생성 + 이력 UI)

## 완료 (2026-04-19, dev-009)

- [x] FE-048: 자산지도 노드 정렬 — 다중 선택 시 툴바(왼/가로중앙/오른/위/세로중앙/아래)
- [x] FE-049: 자산지도 노드 크기 일괄 맞추기 (평균 크기 적용)

## 완료 (2026-04-19, dev-010)

- [x] 증적 API 개선 — GET /api/archives (비관리자 조회) + POST (자산 스냅샷 포함)
- [x] 보고서 페이지 증적 이력 섹션 (→ 관리자 /admin/archives 연결)

## 완료 (2026-04-19, dev-011)

- [x] 보고서 상세 페이지 UI 개선 — 바 차트 분류 테이블, 타입 클릭 필터, 자산 검색

## 완료 (2026-04-19, dev-012)

- [x] 자산지도 레이블 표시 토글 — 툴바 버튼으로 노드 텍스트 on/off

## 완료 (2026-04-19, dev-013)

- [x] 대시보드 만료 알림 뱃지 — 상단 벨 아이콘에 30일 이내 만료 건수 즉시 표시 (마운트 시 자동 로드)

## 완료 (2026-04-19, dev-014)

- [x] 보고서 이전 월 대비 비용 증감 표시 — 데이터 API에 prevMonthlyCost 추가, 요약 카드에 증감 뱃지

## 완료 (2026-04-19, dev-015)

- [x] 자산 목록 페이지 Excel 내보내기 버튼 — Hardware/Cloud/Domain/License 각 페이지 헤더

## 완료 (2026-04-19, dev-016)

- [x] 감사 로그 빠른 날짜 필터 (오늘/7일/30일/90일) + 작업자/검색 통합 입력

## 다음 스프린트

- [ ] 라이선스 갱신 이력 페이지 개선
- [ ] 자산 태그 일괄 편집 (bulk edit)
- [ ] 조직 구성원 온보딩 워크플로우 개선

## 다음 티켓 초안

TITLE: 보고서 커스텀 내보내기 (필드 선택 + 프리셋)
SCOPE: app/reports/, app/api/reports/
PRIORITY: medium

TITLE: 정보보호 조직도 React Flow 업그레이드
SCOPE: app/org/security-org-chart.tsx
PRIORITY: low
