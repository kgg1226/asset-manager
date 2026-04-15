# Changelog

## [0.3.0] — 2026-04-15

### New Features

- 통합 검색 확대 + 알림 이력 페이지네이션 고도화
- bulk delete + assetTag @unique 재활성화 + 안정적 dedup (#81)
- 자산 지도 UX 대폭 개선 + 로컬 더미 데이터 시드 (#70)
- 자산 지도 Alpha — 4방향 핸들, 섹션, 팔레트, PII 흐름도 (#66)
- 직책별 CIA 자동매핑, GDrive 설정 UI, 가이드 개선 (#63)
- license vendor/contract/quotation fields, contract org UI, CRUD alarm granularity (#62)
- comprehensive i18n QA — fix hardcoded strings, currency symbols, whitespace-nowrap, assign labels
- add interactive page tour guide for admin onboarding (#57)
- add i18n interactive tour guides to all 17 pages (6 languages)
- 6개 언어 다국어(i18n) 지원 (#59)
- add interactive page tour guide for admin onboarding
- 하드웨어 장비 유형에 Monitor 추가 + 동적 필드 섹션 내부 통합
- 활성 배정 있어도 라이선스 유형 변경 허용 + 경고 메시지
- Phase 5 — UX 개선, 버그 수정, 자산관리 고도화 (Sprint 1~4)
- 관리자 가이드 + 알림 테스트/디버그 로그 기능
- 클라우드 자산 알림 채널 선택 기능 (이메일/Slack/둘 다/끄기)
- 클라우드 자산 필드 고도화 + 갱신/해지통보 알림 시스템
- 클라우드 자산 필드 고도화 — 서비스 분류 + 인프라 상세 + 관리 정보
- 하드웨어 자산 필드 고도화 — 보증/구매 + 네트워크 강화
- FE-072 알림 센터 + FE-073 모바일 반응형 개선
- FE-070 통합 검색 + BE-070 Export API + BE-072 자산-라이선스 연결
- FE-071 대시보드 계약 카테고리 + BE-071 감사로그 검색 + OPS-030 헬스체크
- FE-060 계약 페이지 + BE-P3-03 페이지네이션 + SEC-010 보안 리뷰
- Phase 5 UI — 레이아웃 개편, 하드웨어 상태관리, 할당/회수, 정렬
- hardware lifecycle APIs + depreciation + asset assignment history
- upgrade Prisma ORM v6 → v7 with driver adapter
- PDF 보고서 다운로드 & 이메일 알림 API
- Phase 3 월별 보고서 API — 데이터 집계, Excel 내보내기, 자동 생성 배치
- License 계층 구조 (parentId) — Schema, API, CSV Import

### Bug Fixes

- assetTag unique 임시 제거 — EC2 P2002 오류 해결 (#80)
- EC2 중복 assetTag P2002 오류 자동 해결 (#79)
- 자산 지도 연결 생성 버그 수정 + 핸들 호버 UX 개선 (#72)
- 비밀번호 변경 + 자산 지도 레이아웃 + 섹션 개선 (#68)
- round monthly cost to nearest won (no decimals)
- change asset list limit from 1000 to 100
- redirect to home instead of login page on logout
- 라이선스 유형 변경 시 배정 유지, 시트 연결만 해제
- admin 라우트 타입 안전성 개선
- 보안 강화 + CRON 인증 통합 + Export UI 연동
- use pg directly in init-db.mjs instead of Prisma client
- use docker-compose (standalone) instead of docker compose (plugin)
- use process.env instead of env() in prisma.config.ts
- resolve build-blocking type error and enable ignoreBuildErrors
- recharts PieLabel type error - use name instead of label
- use docker build directly, remove version from compose
- --rebase 제거 + master 브랜치 확인 추가
- tasks/db-changes.md 충돌 마커 제거
- db-changes.md 충돌 마커 제거 (master에 잔류한 conflict marker 정리)
- EC2 배포 명령어를 deploy.yml 기준으로 정확하게 수정

### Documentation

- OS별 로컬 설치 가이드 + AWS 배포 Step-by-Step 가이드 추가 (#69)
- rewrite README with bilingual (KO/EN) project overview
- Phase 5 완료 상태 반영 — current-state.md, todo.md 정합성 업데이트
- 구현 현황 전수 점검 — 달성률 95%, Phase 5 티켓 신규 작성
- 하드웨어 수명주기 기획 문서 추가 (Phase 5)
- 배포 환경 정확화 — S3 버킷, EC2 ID, 포트 8080, SSM 방식, rebase 경고
- EC2 인스턴스 t4g.small (ARM64, RAM 2GB), S3→EC2 배포 방식 반영
- CLAUDE.md 현행화 + role/* 브랜치 전략 + current-state.md 갱신
- CLAUDE.md 슬래시 커맨드 수정 및 프로젝트 가이드 구체화

### Improvements

- Merge branch 'master' of https://github.com/kgg1226/asset-manager
- deploy
- CIA 점수제 + 하드웨어 삭제/태그 수정 + 기능설정 통합 + 빌드 에러 해결 (#78)
- 기능 설정 통합 + 수명 게이지 + 빌드 에러 수정 (#77)
- merge: master 동기화 — CLAUDE.md + lessons.md 충돌 해결
- 자산 수명 게이지 + 기능 플래그 + UI 개선 + 버그 수정 (#76)
- 자산지도 버그 수정 + 기능 명세 + 더미 데이터 (#75)
- 자산지도 페이지/폴더 + 수명 게이지 + i18n 전면 번역 + UI 개선 (#74)
- 자산지도 PDF 개선 + 외부조직 관리 + 사이드바 섹션 분류 (#73)
- 가이드업데이트 (#71)
- Claude/gallant varahamihira (#67)
- Claude/gallant varahamihira (#65)
- Claude/gallant varahamihira (#64)
- Merge branch 'master' of https://github.com/kgg1226/license-manager
- Claude/review implementation progress sf h ma (#61)
- merge: feat/interactive-tour-guide into master — i18n QA, currency symbols, assign labels
- merge: resolve conflicts between tour-guide and master (i18n)
- Add MIT License to the project
- consolidate FE+BE into unified Dev role (4-role system) (#60)
- untrack deploy.ps1 (sensitive deployment config)
- move examples to examples/, init-db to scripts/
- organize project files for clarity
- move role startup docs to .claude/commands/
- merge: master 최신 동기화 — 충돌 10개 파일 해결
- Merge branch 'master' into role/frontend
- Merge branch 'role/backend' of https://github.com/kgg1226/license-manager into role/backend
- merge: resolve launch.json conflict from master merge
- remove deprecated eslint config from next.config.ts
- dev.db 제거 및 .gitignore에 SQLite 패턴 추가
- Merge branch 'master' into role/backend
- planning: frontend-next.md 작성 — FE-040 + Phase 3 FE 작업 지시서
- planning: current-state.md 전면 업데이트 — PR #34/#35/#36 반영
- Merge branch 'master' of https://github.com/kgg1226/license-manager into role/backend
- merge: master 동기화 — Phase 3-1 준비
- Merge remote-tracking branch 'origin/master' into role/frontend
- merge master into role/frontend — todo.md, CLAUDE.md Phase 2 로드맵 업데이트 반영
- backend: SQLite → PostgreSQL(Supabase) 전환 (BE-010~012)
- merge: master 동기화 — Supabase 전환 + 로드맵 반영
- backend: BE-001~003 점검 완료 + 에러 응답 안전성 수정
- planning: todo.md 현행화 — 배포 전 확인 티켓 (BE-001~003, OPS-001~003, FE-001)
- Merge branch 'master' of https://github.com/kgg1226/license-manager into HEAD

---

## [0.2.0] — 2026-04-15

### New Features

- 통합 검색 확대 + 알림 이력 페이지네이션 고도화
- bulk delete + assetTag @unique 재활성화 + 안정적 dedup (#81)
- 자산 지도 UX 대폭 개선 + 로컬 더미 데이터 시드 (#70)
- 자산 지도 Alpha — 4방향 핸들, 섹션, 팔레트, PII 흐름도 (#66)
- 직책별 CIA 자동매핑, GDrive 설정 UI, 가이드 개선 (#63)
- license vendor/contract/quotation fields, contract org UI, CRUD alarm granularity (#62)
- comprehensive i18n QA — fix hardcoded strings, currency symbols, whitespace-nowrap, assign labels
- add interactive page tour guide for admin onboarding (#57)
- add i18n interactive tour guides to all 17 pages (6 languages)
- 6개 언어 다국어(i18n) 지원 (#59)
- add interactive page tour guide for admin onboarding
- 하드웨어 장비 유형에 Monitor 추가 + 동적 필드 섹션 내부 통합
- 활성 배정 있어도 라이선스 유형 변경 허용 + 경고 메시지
- Phase 5 — UX 개선, 버그 수정, 자산관리 고도화 (Sprint 1~4)
- 관리자 가이드 + 알림 테스트/디버그 로그 기능
- 클라우드 자산 알림 채널 선택 기능 (이메일/Slack/둘 다/끄기)
- 클라우드 자산 필드 고도화 + 갱신/해지통보 알림 시스템
- 클라우드 자산 필드 고도화 — 서비스 분류 + 인프라 상세 + 관리 정보
- 하드웨어 자산 필드 고도화 — 보증/구매 + 네트워크 강화
- FE-072 알림 센터 + FE-073 모바일 반응형 개선
- FE-070 통합 검색 + BE-070 Export API + BE-072 자산-라이선스 연결
- FE-071 대시보드 계약 카테고리 + BE-071 감사로그 검색 + OPS-030 헬스체크
- FE-060 계약 페이지 + BE-P3-03 페이지네이션 + SEC-010 보안 리뷰
- Phase 5 UI — 레이아웃 개편, 하드웨어 상태관리, 할당/회수, 정렬
- hardware lifecycle APIs + depreciation + asset assignment history
- upgrade Prisma ORM v6 → v7 with driver adapter
- PDF 보고서 다운로드 & 이메일 알림 API
- Phase 3 월별 보고서 API — 데이터 집계, Excel 내보내기, 자동 생성 배치
- License 계층 구조 (parentId) — Schema, API, CSV Import

### Bug Fixes

- assetTag unique 임시 제거 — EC2 P2002 오류 해결 (#80)
- EC2 중복 assetTag P2002 오류 자동 해결 (#79)
- 자산 지도 연결 생성 버그 수정 + 핸들 호버 UX 개선 (#72)
- 비밀번호 변경 + 자산 지도 레이아웃 + 섹션 개선 (#68)
- round monthly cost to nearest won (no decimals)
- change asset list limit from 1000 to 100
- redirect to home instead of login page on logout
- 라이선스 유형 변경 시 배정 유지, 시트 연결만 해제
- admin 라우트 타입 안전성 개선
- 보안 강화 + CRON 인증 통합 + Export UI 연동
- use pg directly in init-db.mjs instead of Prisma client
- use docker-compose (standalone) instead of docker compose (plugin)
- use process.env instead of env() in prisma.config.ts
- resolve build-blocking type error and enable ignoreBuildErrors
- recharts PieLabel type error - use name instead of label
- use docker build directly, remove version from compose
- --rebase 제거 + master 브랜치 확인 추가
- tasks/db-changes.md 충돌 마커 제거
- db-changes.md 충돌 마커 제거 (master에 잔류한 conflict marker 정리)
- EC2 배포 명령어를 deploy.yml 기준으로 정확하게 수정

### Documentation

- OS별 로컬 설치 가이드 + AWS 배포 Step-by-Step 가이드 추가 (#69)
- rewrite README with bilingual (KO/EN) project overview
- Phase 5 완료 상태 반영 — current-state.md, todo.md 정합성 업데이트
- 구현 현황 전수 점검 — 달성률 95%, Phase 5 티켓 신규 작성
- 하드웨어 수명주기 기획 문서 추가 (Phase 5)
- 배포 환경 정확화 — S3 버킷, EC2 ID, 포트 8080, SSM 방식, rebase 경고
- EC2 인스턴스 t4g.small (ARM64, RAM 2GB), S3→EC2 배포 방식 반영
- CLAUDE.md 현행화 + role/* 브랜치 전략 + current-state.md 갱신
- CLAUDE.md 슬래시 커맨드 수정 및 프로젝트 가이드 구체화

### Improvements

- Merge branch 'master' of https://github.com/kgg1226/asset-manager
- deploy
- CIA 점수제 + 하드웨어 삭제/태그 수정 + 기능설정 통합 + 빌드 에러 해결 (#78)
- 기능 설정 통합 + 수명 게이지 + 빌드 에러 수정 (#77)
- merge: master 동기화 — CLAUDE.md + lessons.md 충돌 해결
- 자산 수명 게이지 + 기능 플래그 + UI 개선 + 버그 수정 (#76)
- 자산지도 버그 수정 + 기능 명세 + 더미 데이터 (#75)
- 자산지도 페이지/폴더 + 수명 게이지 + i18n 전면 번역 + UI 개선 (#74)
- 자산지도 PDF 개선 + 외부조직 관리 + 사이드바 섹션 분류 (#73)
- 가이드업데이트 (#71)
- Claude/gallant varahamihira (#67)
- Claude/gallant varahamihira (#65)
- Claude/gallant varahamihira (#64)
- Merge branch 'master' of https://github.com/kgg1226/license-manager
- Claude/review implementation progress sf h ma (#61)
- merge: feat/interactive-tour-guide into master — i18n QA, currency symbols, assign labels
- merge: resolve conflicts between tour-guide and master (i18n)
- Add MIT License to the project
- consolidate FE+BE into unified Dev role (4-role system) (#60)
- untrack deploy.ps1 (sensitive deployment config)
- move examples to examples/, init-db to scripts/
- organize project files for clarity
- move role startup docs to .claude/commands/
- merge: master 최신 동기화 — 충돌 10개 파일 해결
- Merge branch 'master' into role/frontend
- Merge branch 'role/backend' of https://github.com/kgg1226/license-manager into role/backend
- merge: resolve launch.json conflict from master merge
- remove deprecated eslint config from next.config.ts
- dev.db 제거 및 .gitignore에 SQLite 패턴 추가
- Merge branch 'master' into role/backend
- planning: frontend-next.md 작성 — FE-040 + Phase 3 FE 작업 지시서
- planning: current-state.md 전면 업데이트 — PR #34/#35/#36 반영
- Merge branch 'master' of https://github.com/kgg1226/license-manager into role/backend
- merge: master 동기화 — Phase 3-1 준비
- Merge remote-tracking branch 'origin/master' into role/frontend
- merge master into role/frontend — todo.md, CLAUDE.md Phase 2 로드맵 업데이트 반영
- backend: SQLite → PostgreSQL(Supabase) 전환 (BE-010~012)
- merge: master 동기화 — Supabase 전환 + 로드맵 반영
- backend: BE-001~003 점검 완료 + 에러 응답 안전성 수정
- planning: todo.md 현행화 — 배포 전 확인 티켓 (BE-001~003, OPS-001~003, FE-001)
- Merge branch 'master' of https://github.com/kgg1226/license-manager into HEAD

---

## [0.1.2] — 2026-04-15

### New Features

- 통합 검색 확대 + 알림 이력 페이지네이션 고도화
- bulk delete + assetTag @unique 재활성화 + 안정적 dedup (#81)
- 자산 지도 UX 대폭 개선 + 로컬 더미 데이터 시드 (#70)
- 자산 지도 Alpha — 4방향 핸들, 섹션, 팔레트, PII 흐름도 (#66)
- 직책별 CIA 자동매핑, GDrive 설정 UI, 가이드 개선 (#63)
- license vendor/contract/quotation fields, contract org UI, CRUD alarm granularity (#62)
- comprehensive i18n QA — fix hardcoded strings, currency symbols, whitespace-nowrap, assign labels
- add interactive page tour guide for admin onboarding (#57)
- add i18n interactive tour guides to all 17 pages (6 languages)
- 6개 언어 다국어(i18n) 지원 (#59)
- add interactive page tour guide for admin onboarding
- 하드웨어 장비 유형에 Monitor 추가 + 동적 필드 섹션 내부 통합
- 활성 배정 있어도 라이선스 유형 변경 허용 + 경고 메시지
- Phase 5 — UX 개선, 버그 수정, 자산관리 고도화 (Sprint 1~4)
- 관리자 가이드 + 알림 테스트/디버그 로그 기능
- 클라우드 자산 알림 채널 선택 기능 (이메일/Slack/둘 다/끄기)
- 클라우드 자산 필드 고도화 + 갱신/해지통보 알림 시스템
- 클라우드 자산 필드 고도화 — 서비스 분류 + 인프라 상세 + 관리 정보
- 하드웨어 자산 필드 고도화 — 보증/구매 + 네트워크 강화
- FE-072 알림 센터 + FE-073 모바일 반응형 개선
- FE-070 통합 검색 + BE-070 Export API + BE-072 자산-라이선스 연결
- FE-071 대시보드 계약 카테고리 + BE-071 감사로그 검색 + OPS-030 헬스체크
- FE-060 계약 페이지 + BE-P3-03 페이지네이션 + SEC-010 보안 리뷰
- Phase 5 UI — 레이아웃 개편, 하드웨어 상태관리, 할당/회수, 정렬
- hardware lifecycle APIs + depreciation + asset assignment history
- upgrade Prisma ORM v6 → v7 with driver adapter
- PDF 보고서 다운로드 & 이메일 알림 API
- Phase 3 월별 보고서 API — 데이터 집계, Excel 내보내기, 자동 생성 배치
- License 계층 구조 (parentId) — Schema, API, CSV Import

### Bug Fixes

- assetTag unique 임시 제거 — EC2 P2002 오류 해결 (#80)
- EC2 중복 assetTag P2002 오류 자동 해결 (#79)
- 자산 지도 연결 생성 버그 수정 + 핸들 호버 UX 개선 (#72)
- 비밀번호 변경 + 자산 지도 레이아웃 + 섹션 개선 (#68)
- round monthly cost to nearest won (no decimals)
- change asset list limit from 1000 to 100
- redirect to home instead of login page on logout
- 라이선스 유형 변경 시 배정 유지, 시트 연결만 해제
- admin 라우트 타입 안전성 개선
- 보안 강화 + CRON 인증 통합 + Export UI 연동
- use pg directly in init-db.mjs instead of Prisma client
- use docker-compose (standalone) instead of docker compose (plugin)
- use process.env instead of env() in prisma.config.ts
- resolve build-blocking type error and enable ignoreBuildErrors
- recharts PieLabel type error - use name instead of label
- use docker build directly, remove version from compose
- --rebase 제거 + master 브랜치 확인 추가
- tasks/db-changes.md 충돌 마커 제거
- db-changes.md 충돌 마커 제거 (master에 잔류한 conflict marker 정리)
- EC2 배포 명령어를 deploy.yml 기준으로 정확하게 수정

### Documentation

- OS별 로컬 설치 가이드 + AWS 배포 Step-by-Step 가이드 추가 (#69)
- rewrite README with bilingual (KO/EN) project overview
- Phase 5 완료 상태 반영 — current-state.md, todo.md 정합성 업데이트
- 구현 현황 전수 점검 — 달성률 95%, Phase 5 티켓 신규 작성
- 하드웨어 수명주기 기획 문서 추가 (Phase 5)
- 배포 환경 정확화 — S3 버킷, EC2 ID, 포트 8080, SSM 방식, rebase 경고
- EC2 인스턴스 t4g.small (ARM64, RAM 2GB), S3→EC2 배포 방식 반영
- CLAUDE.md 현행화 + role/* 브랜치 전략 + current-state.md 갱신
- CLAUDE.md 슬래시 커맨드 수정 및 프로젝트 가이드 구체화

### Improvements

- Merge branch 'master' of https://github.com/kgg1226/asset-manager
- deploy
- CIA 점수제 + 하드웨어 삭제/태그 수정 + 기능설정 통합 + 빌드 에러 해결 (#78)
- 기능 설정 통합 + 수명 게이지 + 빌드 에러 수정 (#77)
- merge: master 동기화 — CLAUDE.md + lessons.md 충돌 해결
- 자산 수명 게이지 + 기능 플래그 + UI 개선 + 버그 수정 (#76)
- 자산지도 버그 수정 + 기능 명세 + 더미 데이터 (#75)
- 자산지도 페이지/폴더 + 수명 게이지 + i18n 전면 번역 + UI 개선 (#74)
- 자산지도 PDF 개선 + 외부조직 관리 + 사이드바 섹션 분류 (#73)
- 가이드업데이트 (#71)
- Claude/gallant varahamihira (#67)
- Claude/gallant varahamihira (#65)
- Claude/gallant varahamihira (#64)
- Merge branch 'master' of https://github.com/kgg1226/license-manager
- Claude/review implementation progress sf h ma (#61)
- merge: feat/interactive-tour-guide into master — i18n QA, currency symbols, assign labels
- merge: resolve conflicts between tour-guide and master (i18n)
- Add MIT License to the project
- consolidate FE+BE into unified Dev role (4-role system) (#60)
- untrack deploy.ps1 (sensitive deployment config)
- move examples to examples/, init-db to scripts/
- organize project files for clarity
- move role startup docs to .claude/commands/
- merge: master 최신 동기화 — 충돌 10개 파일 해결
- Merge branch 'master' into role/frontend
- Merge branch 'role/backend' of https://github.com/kgg1226/license-manager into role/backend
- merge: resolve launch.json conflict from master merge
- remove deprecated eslint config from next.config.ts
- dev.db 제거 및 .gitignore에 SQLite 패턴 추가
- Merge branch 'master' into role/backend
- planning: frontend-next.md 작성 — FE-040 + Phase 3 FE 작업 지시서
- planning: current-state.md 전면 업데이트 — PR #34/#35/#36 반영
- Merge branch 'master' of https://github.com/kgg1226/license-manager into role/backend
- merge: master 동기화 — Phase 3-1 준비
- Merge remote-tracking branch 'origin/master' into role/frontend
- merge master into role/frontend — todo.md, CLAUDE.md Phase 2 로드맵 업데이트 반영
- backend: SQLite → PostgreSQL(Supabase) 전환 (BE-010~012)
- merge: master 동기화 — Supabase 전환 + 로드맵 반영
- backend: BE-001~003 점검 완료 + 에러 응답 안전성 수정
- planning: todo.md 현행화 — 배포 전 확인 티켓 (BE-001~003, OPS-001~003, FE-001)
- Merge branch 'master' of https://github.com/kgg1226/license-manager into HEAD

---

## [0.1.2] — 2026-04-15

### New Features

- 통합 검색 확대 + 알림 이력 페이지네이션 고도화
- bulk delete + assetTag @unique 재활성화 + 안정적 dedup (#81)
- 자산 지도 UX 대폭 개선 + 로컬 더미 데이터 시드 (#70)
- 자산 지도 Alpha — 4방향 핸들, 섹션, 팔레트, PII 흐름도 (#66)
- 직책별 CIA 자동매핑, GDrive 설정 UI, 가이드 개선 (#63)
- license vendor/contract/quotation fields, contract org UI, CRUD alarm granularity (#62)
- comprehensive i18n QA — fix hardcoded strings, currency symbols, whitespace-nowrap, assign labels
- add interactive page tour guide for admin onboarding (#57)
- add i18n interactive tour guides to all 17 pages (6 languages)
- 6개 언어 다국어(i18n) 지원 (#59)
- add interactive page tour guide for admin onboarding
- 하드웨어 장비 유형에 Monitor 추가 + 동적 필드 섹션 내부 통합
- 활성 배정 있어도 라이선스 유형 변경 허용 + 경고 메시지
- Phase 5 — UX 개선, 버그 수정, 자산관리 고도화 (Sprint 1~4)
- 관리자 가이드 + 알림 테스트/디버그 로그 기능
- 클라우드 자산 알림 채널 선택 기능 (이메일/Slack/둘 다/끄기)
- 클라우드 자산 필드 고도화 + 갱신/해지통보 알림 시스템
- 클라우드 자산 필드 고도화 — 서비스 분류 + 인프라 상세 + 관리 정보
- 하드웨어 자산 필드 고도화 — 보증/구매 + 네트워크 강화
- FE-072 알림 센터 + FE-073 모바일 반응형 개선
- FE-070 통합 검색 + BE-070 Export API + BE-072 자산-라이선스 연결
- FE-071 대시보드 계약 카테고리 + BE-071 감사로그 검색 + OPS-030 헬스체크
- FE-060 계약 페이지 + BE-P3-03 페이지네이션 + SEC-010 보안 리뷰
- Phase 5 UI — 레이아웃 개편, 하드웨어 상태관리, 할당/회수, 정렬
- hardware lifecycle APIs + depreciation + asset assignment history
- upgrade Prisma ORM v6 → v7 with driver adapter
- PDF 보고서 다운로드 & 이메일 알림 API
- Phase 3 월별 보고서 API — 데이터 집계, Excel 내보내기, 자동 생성 배치
- License 계층 구조 (parentId) — Schema, API, CSV Import

### Bug Fixes

- assetTag unique 임시 제거 — EC2 P2002 오류 해결 (#80)
- EC2 중복 assetTag P2002 오류 자동 해결 (#79)
- 자산 지도 연결 생성 버그 수정 + 핸들 호버 UX 개선 (#72)
- 비밀번호 변경 + 자산 지도 레이아웃 + 섹션 개선 (#68)
- round monthly cost to nearest won (no decimals)
- change asset list limit from 1000 to 100
- redirect to home instead of login page on logout
- 라이선스 유형 변경 시 배정 유지, 시트 연결만 해제
- admin 라우트 타입 안전성 개선
- 보안 강화 + CRON 인증 통합 + Export UI 연동
- use pg directly in init-db.mjs instead of Prisma client
- use docker-compose (standalone) instead of docker compose (plugin)
- use process.env instead of env() in prisma.config.ts
- resolve build-blocking type error and enable ignoreBuildErrors
- recharts PieLabel type error - use name instead of label
- use docker build directly, remove version from compose
- --rebase 제거 + master 브랜치 확인 추가
- tasks/db-changes.md 충돌 마커 제거
- db-changes.md 충돌 마커 제거 (master에 잔류한 conflict marker 정리)
- EC2 배포 명령어를 deploy.yml 기준으로 정확하게 수정

### Documentation

- OS별 로컬 설치 가이드 + AWS 배포 Step-by-Step 가이드 추가 (#69)
- rewrite README with bilingual (KO/EN) project overview
- Phase 5 완료 상태 반영 — current-state.md, todo.md 정합성 업데이트
- 구현 현황 전수 점검 — 달성률 95%, Phase 5 티켓 신규 작성
- 하드웨어 수명주기 기획 문서 추가 (Phase 5)
- 배포 환경 정확화 — S3 버킷, EC2 ID, 포트 8080, SSM 방식, rebase 경고
- EC2 인스턴스 t4g.small (ARM64, RAM 2GB), S3→EC2 배포 방식 반영
- CLAUDE.md 현행화 + role/* 브랜치 전략 + current-state.md 갱신
- CLAUDE.md 슬래시 커맨드 수정 및 프로젝트 가이드 구체화

### Improvements

- Merge branch 'master' of https://github.com/kgg1226/asset-manager
- deploy
- CIA 점수제 + 하드웨어 삭제/태그 수정 + 기능설정 통합 + 빌드 에러 해결 (#78)
- 기능 설정 통합 + 수명 게이지 + 빌드 에러 수정 (#77)
- merge: master 동기화 — CLAUDE.md + lessons.md 충돌 해결
- 자산 수명 게이지 + 기능 플래그 + UI 개선 + 버그 수정 (#76)
- 자산지도 버그 수정 + 기능 명세 + 더미 데이터 (#75)
- 자산지도 페이지/폴더 + 수명 게이지 + i18n 전면 번역 + UI 개선 (#74)
- 자산지도 PDF 개선 + 외부조직 관리 + 사이드바 섹션 분류 (#73)
- 가이드업데이트 (#71)
- Claude/gallant varahamihira (#67)
- Claude/gallant varahamihira (#65)
- Claude/gallant varahamihira (#64)
- Merge branch 'master' of https://github.com/kgg1226/license-manager
- Claude/review implementation progress sf h ma (#61)
- merge: feat/interactive-tour-guide into master — i18n QA, currency symbols, assign labels
- merge: resolve conflicts between tour-guide and master (i18n)
- Add MIT License to the project
- consolidate FE+BE into unified Dev role (4-role system) (#60)
- untrack deploy.ps1 (sensitive deployment config)
- move examples to examples/, init-db to scripts/
- organize project files for clarity
- move role startup docs to .claude/commands/
- merge: master 최신 동기화 — 충돌 10개 파일 해결
- Merge branch 'master' into role/frontend
- Merge branch 'role/backend' of https://github.com/kgg1226/license-manager into role/backend
- merge: resolve launch.json conflict from master merge
- remove deprecated eslint config from next.config.ts
- dev.db 제거 및 .gitignore에 SQLite 패턴 추가
- Merge branch 'master' into role/backend
- planning: frontend-next.md 작성 — FE-040 + Phase 3 FE 작업 지시서
- planning: current-state.md 전면 업데이트 — PR #34/#35/#36 반영
- Merge branch 'master' of https://github.com/kgg1226/license-manager into role/backend
- merge: master 동기화 — Phase 3-1 준비
- Merge remote-tracking branch 'origin/master' into role/frontend
- merge master into role/frontend — todo.md, CLAUDE.md Phase 2 로드맵 업데이트 반영
- backend: SQLite → PostgreSQL(Supabase) 전환 (BE-010~012)
- merge: master 동기화 — Supabase 전환 + 로드맵 반영
- backend: BE-001~003 점검 완료 + 에러 응답 안전성 수정
- planning: todo.md 현행화 — 배포 전 확인 티켓 (BE-001~003, OPS-001~003, FE-001)
- Merge branch 'master' of https://github.com/kgg1226/license-manager into HEAD

---

## [0.1.1] — 2026-04-14

### New Features

- bulk delete + assetTag @unique 재활성화 + 안정적 dedup (#81)
- 자산 지도 UX 대폭 개선 + 로컬 더미 데이터 시드 (#70)
- 자산 지도 Alpha — 4방향 핸들, 섹션, 팔레트, PII 흐름도 (#66)
- 직책별 CIA 자동매핑, GDrive 설정 UI, 가이드 개선 (#63)
- license vendor/contract/quotation fields, contract org UI, CRUD alarm granularity (#62)
- comprehensive i18n QA — fix hardcoded strings, currency symbols, whitespace-nowrap, assign labels
- add interactive page tour guide for admin onboarding (#57)
- add i18n interactive tour guides to all 17 pages (6 languages)
- 6개 언어 다국어(i18n) 지원 (#59)
- add interactive page tour guide for admin onboarding
- 하드웨어 장비 유형에 Monitor 추가 + 동적 필드 섹션 내부 통합
- 활성 배정 있어도 라이선스 유형 변경 허용 + 경고 메시지
- Phase 5 — UX 개선, 버그 수정, 자산관리 고도화 (Sprint 1~4)
- 관리자 가이드 + 알림 테스트/디버그 로그 기능
- 클라우드 자산 알림 채널 선택 기능 (이메일/Slack/둘 다/끄기)
- 클라우드 자산 필드 고도화 + 갱신/해지통보 알림 시스템
- 클라우드 자산 필드 고도화 — 서비스 분류 + 인프라 상세 + 관리 정보
- 하드웨어 자산 필드 고도화 — 보증/구매 + 네트워크 강화
- FE-072 알림 센터 + FE-073 모바일 반응형 개선
- FE-070 통합 검색 + BE-070 Export API + BE-072 자산-라이선스 연결
- FE-071 대시보드 계약 카테고리 + BE-071 감사로그 검색 + OPS-030 헬스체크
- FE-060 계약 페이지 + BE-P3-03 페이지네이션 + SEC-010 보안 리뷰
- Phase 5 UI — 레이아웃 개편, 하드웨어 상태관리, 할당/회수, 정렬
- hardware lifecycle APIs + depreciation + asset assignment history
- upgrade Prisma ORM v6 → v7 with driver adapter
- PDF 보고서 다운로드 & 이메일 알림 API
- Phase 3 월별 보고서 API — 데이터 집계, Excel 내보내기, 자동 생성 배치
- License 계층 구조 (parentId) — Schema, API, CSV Import

### Bug Fixes

- assetTag unique 임시 제거 — EC2 P2002 오류 해결 (#80)
- EC2 중복 assetTag P2002 오류 자동 해결 (#79)
- 자산 지도 연결 생성 버그 수정 + 핸들 호버 UX 개선 (#72)
- 비밀번호 변경 + 자산 지도 레이아웃 + 섹션 개선 (#68)
- round monthly cost to nearest won (no decimals)
- change asset list limit from 1000 to 100
- redirect to home instead of login page on logout
- 라이선스 유형 변경 시 배정 유지, 시트 연결만 해제
- admin 라우트 타입 안전성 개선
- 보안 강화 + CRON 인증 통합 + Export UI 연동
- use pg directly in init-db.mjs instead of Prisma client
- use docker-compose (standalone) instead of docker compose (plugin)
- use process.env instead of env() in prisma.config.ts
- resolve build-blocking type error and enable ignoreBuildErrors
- recharts PieLabel type error - use name instead of label
- use docker build directly, remove version from compose
- deploy-remote.sh CRLF -> LF, add sed safety
- --rebase 제거 + master 브랜치 확인 추가
- tasks/db-changes.md 충돌 마커 제거
- db-changes.md 충돌 마커 제거 (master에 잔류한 conflict marker 정리)
- EC2 배포 명령어를 deploy.yml 기준으로 정확하게 수정

### Documentation

- OS별 로컬 설치 가이드 + AWS 배포 Step-by-Step 가이드 추가 (#69)
- rewrite README with bilingual (KO/EN) project overview
- Phase 5 완료 상태 반영 — current-state.md, todo.md 정합성 업데이트
- 구현 현황 전수 점검 — 달성률 95%, Phase 5 티켓 신규 작성
- 하드웨어 수명주기 기획 문서 추가 (Phase 5)
- 배포 환경 정확화 — S3 버킷, EC2 ID, 포트 8080, SSM 방식, rebase 경고
- EC2 인스턴스 t4g.small (ARM64, RAM 2GB), S3→EC2 배포 방식 반영
- CLAUDE.md 현행화 + role/* 브랜치 전략 + current-state.md 갱신
- CLAUDE.md 슬래시 커맨드 수정 및 프로젝트 가이드 구체화

### Improvements

- Merge branch 'master' of https://github.com/kgg1226/asset-manager
- deploy
- CIA 점수제 + 하드웨어 삭제/태그 수정 + 기능설정 통합 + 빌드 에러 해결 (#78)
- 기능 설정 통합 + 수명 게이지 + 빌드 에러 수정 (#77)
- merge: master 동기화 — CLAUDE.md + lessons.md 충돌 해결
- 자산 수명 게이지 + 기능 플래그 + UI 개선 + 버그 수정 (#76)
- 자산지도 버그 수정 + 기능 명세 + 더미 데이터 (#75)
- 자산지도 페이지/폴더 + 수명 게이지 + i18n 전면 번역 + UI 개선 (#74)
- 자산지도 PDF 개선 + 외부조직 관리 + 사이드바 섹션 분류 (#73)
- 가이드업데이트 (#71)
- Claude/gallant varahamihira (#67)
- Claude/gallant varahamihira (#65)
- Claude/gallant varahamihira (#64)
- Merge branch 'master' of https://github.com/kgg1226/license-manager
- Claude/review implementation progress sf h ma (#61)
- merge: feat/interactive-tour-guide into master — i18n QA, currency symbols, assign labels
- merge: resolve conflicts between tour-guide and master (i18n)
- Add MIT License to the project
- consolidate FE+BE into unified Dev role (4-role system) (#60)
- untrack deploy.ps1 (sensitive deployment config)
- move examples to examples/, init-db to scripts/
- organize project files for clarity
- move role startup docs to .claude/commands/
- merge: master 최신 동기화 — 충돌 10개 파일 해결
- Merge branch 'master' into role/frontend
- Merge branch 'role/backend' of https://github.com/kgg1226/license-manager into role/backend
- merge: resolve launch.json conflict from master merge
- remove deprecated eslint config from next.config.ts
- dev.db 제거 및 .gitignore에 SQLite 패턴 추가
- Merge branch 'master' into role/backend
- planning: frontend-next.md 작성 — FE-040 + Phase 3 FE 작업 지시서
- planning: current-state.md 전면 업데이트 — PR #34/#35/#36 반영
- Merge branch 'master' of https://github.com/kgg1226/license-manager into role/backend
- merge: master 동기화 — Phase 3-1 준비
- Merge remote-tracking branch 'origin/master' into role/frontend
- merge master into role/frontend — todo.md, CLAUDE.md Phase 2 로드맵 업데이트 반영
- backend: SQLite → PostgreSQL(Supabase) 전환 (BE-010~012)
- merge: master 동기화 — Supabase 전환 + 로드맵 반영
- backend: BE-001~003 점검 완료 + 에러 응답 안전성 수정
- planning: todo.md 현행화 — 배포 전 확인 티켓 (BE-001~003, OPS-001~003, FE-001)
- Merge branch 'master' of https://github.com/kgg1226/license-manager into HEAD

---

