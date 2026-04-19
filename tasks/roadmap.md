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

## 단기 (다음 스프린트)

- [ ] 보고서 커스텀 내보내기 — 필드 선택 모달 + 프리셋 저장
- [ ] 정보보호 조직도 React Flow 업그레이드 (SecurityOrgChart)
- [ ] FE-047: "자산카테고리" → "증적 카테고리" 리네이밍

## 다음 티켓 초안

TITLE: 보고서 커스텀 내보내기 (필드 선택 + 프리셋)
SCOPE: app/reports/, app/api/reports/
PRIORITY: medium

TITLE: 정보보호 조직도 React Flow 업그레이드
SCOPE: app/org/security-org-chart.tsx
PRIORITY: low
