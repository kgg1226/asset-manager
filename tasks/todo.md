# TODO

> 기획 세션(/planning)에서 관리한다.
> 최종 업데이트: 2026-03-05

---

## 완료된 기능 (master 반영 확인됨)

### 인증
- [x] 로그인 / 로그아웃 (세션 쿠키 기반)
- [x] 세션 확인 API
- [x] 역할 기반 접근 제어 (ADMIN / USER)
- [x] 로그인 브루트포스 방어 (IP 기반, 5회 실패 → 15분 잠금)

### 라이선스 관리
- [x] 라이선스 CRUD (KEY_BASED / VOLUME / NO_KEY)
- [x] 시트(개별 키) 등록·수정, 중복 검사
- [x] 라이선스 갱신 상태 변경 + 이력 기록
- [x] 라이선스 갱신일 수동 설정
- [x] 라이선스 담당자 관리 (개인/부서)
- [x] 라이선스 그룹 CRUD + 기본 그룹 자동 할당

### 할당·반납
- [x] 라이선스 할당 (Server Action — lib/assignment-actions.ts)
- [x] 라이선스 반납 / 삭제

### 조직원 관리
- [x] 조직원 CRUD
- [x] 조직원 조직 이동 (`PATCH /api/employees/[id]`)
- [x] 조직원 퇴사 처리 — 7일 유예 (`POST /api/employees/[id]/offboard`)

### 조직 관리
- [x] 회사(OrgCompany) CRUD
- [x] OrgUnit CRUD + 삭제 영향 범위 미리보기

### 배치/스케줄러
- [x] OFFBOARDING 자동 삭제 (`POST /api/cron/offboard`, CRON_SECRET 인증)
- [x] 라이선스 갱신 알림 (`POST /api/cron/renewal-notify`, D-70/30/15/7, Slack + Email)

### Admin
- [x] 사용자 CRUD
- [x] 사용자 삭제 (`DELETE /api/admin/users/[id]`)
- [x] 임시 비밀번호 발급 + mustChangePassword 플래그

### 대시보드 / 감사 로그 / CSV
- [x] 대시보드 차트 (비용 추이, 유형 분포, 누적 성장)
- [x] 감사 로그 조회 (`GET /api/history`)
- [x] CSV 임포트 (라이선스, 조직원, 그룹, 배정)

### 프론트엔드 — UI
- [x] 라이선스 목록 페이지네이션
- [x] 조직원 목록 검색·필터 (이름, 부서, 상태)
- [x] 조직원 중복 이름 구분 표시

---

## 대기 — 배포 전 확인 티켓

### 백엔드 (`role/backend` 브랜치)

> 코드 점검 결과 발견된 항목. 구현 완료로 보이나 정확성 확인 필요.

- [x] **[BE-001]** `PATCH /api/employees/[id]` — 조직 이동 시 AuditLog 기록 ✅ 이미 구현됨
  - `actorType`, `actorId`, 변경 전/후 orgUnitId 정상 기록 확인
- [x] **[BE-002]** `DELETE /api/admin/users/[id]` — 자신의 계정 삭제 방지 ✅ 이미 구현됨
  - `if (me.id === userId) return 400` 확인
- [x] **[BE-003]** 에러 응답 안전성 확인 ✅ 수정 완료
  - 30개 라우트 전수 검사: 1건 수정 (`licenses/[id]` PUT — `error.message` 직접 반환 → 제네릭 메시지로 교체)
  - 나머지 29개 라우트: 스택트레이스 미노출, 민감정보 로그 미기록 확인

### DevOps (`role/devops` 브랜치)

- [ ] **[OPS-001]** `dockerfile` — `USER` 지시문 추가 (비root 실행)
  - `RUN addgroup -S app && adduser -S app -G app` + `USER app`
- [ ] **[OPS-002]** `.dockerignore` 점검
  - `.env`, `dev.db`, `dev.db.backup`, `*.zip`, `.git` 제외 확인
- [ ] **[OPS-003]** 환경변수 문서화
  - `.env.example` 파일 생성 (실제 값 없이 키 목록만)
  - 필수: `DATABASE_URL`, `CRON_SECRET`
  - 선택: `SLACK_WEBHOOK_URL`, `SMTP_HOST/PORT/USER/PASS/FROM/SECURE`, `SECURE_COOKIE`

### 프론트엔드 (`role/frontend` 브랜치)

- [ ] **[FE-001]** `mustChangePassword` 플래그 처리 UI
  - 로그인 후 플래그가 `true`이면 비밀번호 변경 페이지로 강제 리다이렉트
  - 변경 완료 시 플래그 `false`로 업데이트 (`PUT /api/admin/users/[id]` 또는 별도 API)
- [ ] **[FE-002]** 모바일 반응형 레이아웃 (낮은 우선순위)

---

## 대기 — 사람이 직접 해야 하는 작업 (EC2 배포)

> `deploy.ps1` 실행 전 아래 순서 완료 필요

1. [ ] EC2 VPN 접속 → DB 마이그레이션 SQL 실행
   - `tasks/db-changes.md` [2026-03-04] 항목 참조
   - `sqlite3 /home/ssm-user/license-manager/data/dev.db`
2. [ ] `deploy.ps1` 실행 (Windows PowerShell, `hyeongunk` 프로필 필요)
   - 내부 순서: git push → S3 업로드 → SSM으로 EC2 빌드·배포
3. [ ] 배포 후 동작 확인
   - 로그인, 라이선스 목록, 대시보드 접근
   - 갱신 알림 cron 수동 호출 테스트 (`POST /api/cron/renewal-notify` with CRON_SECRET)

---

## #백엔드 제안 (role/backend 코드 점검 결과)

> 2026-03-05 백엔드 세션에서 전체 API 라우트 점검 후 제안.
> 기획 세션에서 우선순위 판단 후 티켓화 요청.

### P1 — 감사 로그 누락 (ISMS-P 2.11 컴플라이언스)

> 30개 데이터 변경 API 중 7개만 AuditLog 기록. 23개 누락.

- [ ] **[BE-P1-01]** 라이선스 CRUD AuditLog 추가
  - `POST /api/licenses` (생성), `PUT /api/licenses/[id]` (수정), `DELETE /api/licenses/[id]` (삭제)
- [ ] **[BE-P1-02]** 조직원 생성·수정·삭제 AuditLog 추가
  - `POST /api/employees`, `PUT /api/employees/[id]`, `DELETE /api/employees/[id]`
- [ ] **[BE-P1-03]** 사용자 관리 AuditLog 추가
  - `POST /api/admin/users` (생성), `PUT /api/admin/users/[id]` (역할/상태 변경), `DELETE /api/admin/users/[id]` (삭제)
- [ ] **[BE-P1-04]** 그룹·할당·담당자·조직 변경 AuditLog 추가
  - 그룹 CRUD, 그룹 멤버 추가/제거, 할당 반납/삭제, 담당자 추가/제거, OrgUnit 생성/수정

### P2 — 입력 검증 강화 (ISMS-P 2.8)

- [ ] **[BE-P2-01]** 문자열 길이 제한 추가
  - 이름/부서명/설명 등 상한 미설정 → `name ≤ 200`, `description ≤ 2000` 등
- [ ] **[BE-P2-02]** 숫자 범위 검증 추가
  - `totalQuantity > 0`, `price ≥ 0`, `exchangeRate > 0`, `noticePeriodDays ≥ 0`
  - 현재 음수·0 입력 시 에러 없이 저장됨
- [ ] **[BE-P2-03]** 날짜 검증 추가
  - `new Date("invalid")` → Invalid Date가 DB에 저장되는 문제
  - `expiryDate ≥ purchaseDate` 순서 검증
- [ ] **[BE-P2-04]** enum 유효성 — silent default 제거
  - `POST /api/licenses`에서 잘못된 `licenseType` 입력 시 `KEY_BASED`로 기본값 대신 400 에러 반환

### P3 — 성능 개선

- [ ] **[BE-P3-01]** 신규 조직원 자동 할당 N+1 쿼리 개선
  - `POST /api/employees` — 기본 그룹 라이선스 할당 루프 내 개별 count 쿼리 → 배치 로딩
  - 기본 그룹에 라이선스 50개 있으면 150+ 쿼리 발생
- [ ] **[BE-P3-02]** OrgUnit 삭제 시 재귀 쿼리 개선
  - `collectDescendantIds()` — depth별 개별 쿼리 → 한번에 전체 트리 로딩
- [ ] **[BE-P3-03]** 목록 API 페이지네이션 추가 (현재 /history만 지원)
  - `GET /api/licenses`, `GET /api/assignments`, `GET /api/groups`

### P4 — 코드 일관성

- [ ] **[BE-P4-01]** FK 존재 검증 추가
  - `POST /api/org/units` — parentId/companyId 미검증 → Prisma FK 에러 시 500 반환
  - `POST /api/licenses/[id]/owners` — userId/orgUnitId 존재 미검증
- [ ] **[BE-P4-02]** 에러 응답 패턴 통일
  - unique 제약 위반: 일부 라우트만 409 반환, 나머지는 500
  - 유효성 검증 실패: 400 vs silent default 혼재

---

## 참고: 주요 페이지 경로

| 경로 | 설명 |
|---|---|
| `/` | `/licenses`로 리다이렉트 |
| `/login` | 로그인 |
| `/dashboard` | 대시보드 |
| `/licenses` | 라이선스 목록 |
| `/licenses/[id]` | 라이선스 상세 |
| `/employees` | 조직원 목록 |
| `/employees/[id]` | 조직원 상세 |
| `/settings/groups` | 그룹 목록 |
| `/settings/import` | CSV 가져오기 |
| `/org` | 조직도 |
| `/history` | 감사 로그 |
| `/admin/users` | 사용자 관리 (ADMIN 전용) |
