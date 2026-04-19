# Roadmap — 고도화 계획

## 완료 (2026-04-14, dev-001)

- [x] 알림 이력 status 버그 수정 — 통계 `ok`/`fail`이 "SUCCESS"/"FAILED" 기준으로 집계
- [x] 알림 이력 UI 필터 값 정정 — "OK"/"FAIL" → "SUCCESS"/"FAILED"
- [x] 알림 이력 API 페이지네이션 추가 — `page`, `limit`, `totalPages` 응답
- [x] 통합 검색 커버리지 확대 — description, key, vendor, serial, hostname, assetTag, domainName, platform, accountId, resourceId, title 필드 추가
- [x] 통합 검색 `types` 파라미터 추가 — 검색 범위 선택 가능
- [x] 통합 검색 기본 limit 5 → 10, 최대 10 → 20 상향

## 완료 (2026-04-19, dev-002)

- [x] 통합 검색 UI — 라이선스 결과에 vendor·renewalStatus, 자산 결과에 vendor 표시
- [x] 알림 이력 UI — 페이지네이션 컨트롤 추가 (20건/페이지, ‹/› + 번호 버튼)

## 단기 (다음 2주)

- [ ] 통합 검색에 조직(OrgUnit/Company) 타입 추가
- [ ] 알림 이력 — 날짜 범위 필터 추가 (`from`/`to` 파라미터)
- [ ] 알림 이력 — 재발송 액션 (FAILED 항목 재전송 버튼)

## 다음 티켓 초안

TITLE: 통합 검색에 조직 타입 추가
SCOPE: app/api/search/route.ts, app/_components/global-search.tsx
PRIORITY: medium

TITLE: 알림 이력 날짜 범위 필터 + 재발송 액션
SCOPE: app/api/notifications/history/route.ts, app/settings/notifications/page.tsx
PRIORITY: low
