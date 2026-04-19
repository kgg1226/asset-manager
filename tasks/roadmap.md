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

## 완료 (2026-04-19, dev-003)

- [x] 통합 검색에 조직(OrgUnit/Company) 타입 추가 — 이름 검색 후 /org로 이동
- [x] Prisma 클라이언트 재생성으로 License.vendor 필드 TS 오류 해소

## 완료 (2026-04-19, dev-004)

- [x] 알림 이력 날짜 범위 필터 (from/to) — API + UI 모두 적용
- [x] FAILED 항목 재발송 버튼 — POST /api/notifications/resend + 새 로그 생성

## 단기 (다음 스프린트)

- [ ] Phase 6 — 자산 지도 고도화 (PII 흐름도, 뷰 프리셋, 그룹 박스 등)
- [ ] 정보자산관리대장 엑셀 내보내기 (ISMS 컨설팅 양식)
- [ ] 목록 API 페이지네이션 (라이선스/할당/그룹 — 현재 히스토리만 지원)

## 다음 티켓 초안

TITLE: Phase 6 — 자산 지도 PII 흐름도 뷰
SCOPE: app/asset-map/, app/api/asset-map/, prisma/schema.prisma
PRIORITY: high

TITLE: 정보자산관리대장 엑셀 내보내기
SCOPE: app/api/reports/, app/reports/
PRIORITY: medium
