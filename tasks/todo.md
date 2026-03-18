# TODO (Legacy - See New System Below)

> 기획 세션(/planning)에서 관리한다.
> 최종 업데이트: 2026-03-09

---

## 🔴 우선순위 1 — 배포 완료 (PostgreSQL 전환 ✅)

> PostgreSQL 자체 호스팅 완료. Docker Compose 설정 완료.
> **EC2에서 docker-compose up -d 실행 후 테스트 진행 중.**

### 진행 상황
- [x] **[BE-010]** `prisma/schema.prisma` — PostgreSQL provider ✅ 완료
- [x] **[BE-011]** `lib/prisma.ts` — PrismaClient 표준화 ✅ 완료
- [x] **[BE-012]** SQLite 패키지 제거 ✅ 완료
- [x] **[BE-013]** `npx prisma db push` ✅ 완료
- [x] **[BE-014]** `npx prisma db seed` (admin 사용자) ✅ 완료
- [x] **[OPS-010]** `docker-compose.yml` — PostgreSQL 서비스 추가 ✅ 완료
- [x] **[OPS-011]** `.env.example` 생성 ✅ 완료
- [x] **[OPS-001]** `dockerfile` — better-sqlite3 제거 ✅ 완료
- [x] **[OPS-002]** `.dockerignore` — SQLite 파일 제거 ✅ 완료

### 즉시 작업
- [ ] EC2에서 `docker-compose up -d` 실행 및 로그인 테스트
- [ ] 기본 CRUD 동작 확인 (라이선스 목록 조회, 등록, 삭제)
- [ ] 감사 로그 정상 기록 확인

---

## 🟡 우선순위 2 — 배포 전 마무리 🔴 NOW ACTIVE

> ⚠️ **이 섹션의 항목들은 아래 요약이므로, 자세한 요구사항은 반드시 `tasks/TICKETS.md`를 참조하세요.**
>
> 각 역할이 실제 작업할 때는:
> - 🔵 **Backend**: `tasks/roles/BACKEND-START.md` → BE-ORG-001, BE-ORG-002 in `TICKETS.md`
> - 🎨 **Frontend**: `tasks/roles/FRONTEND-START.md` → FE-001, FE-ORG-001 in `TICKETS.md`
> - 🟢 **DevOps**: `tasks/roles/DEVOPS-START.md` → OPS-010/011/001/002 in `TICKETS.md`

### 프론트엔드 (`role/frontend`)

- [x] **[FE-001]** `mustChangePassword` 강제 비밀번호 변경 UI ✅ 완료
  - 로그인 후 플래그 `true` 시 비밀번호 변경 페이지로 강제 리다이렉트
  - 변경 완료 시 `PUT /api/admin/users/[id]` 로 플래그 해제

- [x] **[FE-ORG-001]** `/org` 페이지 — 회사(Company) CRUD UI 추가 ✅ 완료
  - 상단 "새 회사 생성" 버튼 추가 (모달)
  - 회사 카드에 "수정" 버튼 추가 (모달)
  - 회사 카드에 "삭제" 버튼 추가 (확인 모달)
  - 삭제 전 영향 범위 표시 (소속 부서 수, 영향 조직원 수)
  - 삭제 확인 텍스트: "삭제하겠습니다"

### 백엔드 (`role/backend`)

- [x] **[BE-ORG-001]** `PUT /api/org/companies/[id]` — 회사 이름 수정 ✅ 완료
  - 요청: `{ name: string }`
  - 중복 검증 (409 에러)
  - AuditLog 기록 (UPDATED)

- [x] **[BE-ORG-002]** `DELETE /api/org/companies/[id]` — 회사 삭제 ✅ 완료
  - 소속 부서 확인 (있으면 409 에러)
  - AuditLog 기록 (DELETED)

---

## 🔵 우선순위 3 — 배포 후 (사람이 직접) 📚 REFERENCE

> 이 섹션은 배포 후 진행할 작업 목록입니다. 자세한 내용은 `tasks/VISION.md` 참조.

1. [ ] Supabase Dashboard에서 마이그레이션 확인 (테이블 생성 완료 여부)
2. [ ] `deploy.ps1` 실행
   - 내부 순서: git push → S3 업로드 → SSM으로 EC2 빌드·배포
3. [ ] 배포 후 동작 확인
   - 로그인 / 라이선스 목록 / 대시보드 접근
   - cron 수동 호출 (`POST /api/cron/renewal-notify` with `CRON_SECRET`)

---

## #백엔드 제안 (role/backend 코드 점검 결과)

> 2026-03-05 백엔드 세션에서 전체 API 라우트 점검 후 제안.
> 기획 세션에서 우선순위 판단 후 티켓화 요청.

### P1 — 감사 로그 누락 (ISMS-P 2.11 컴플라이언스) ✅ 완료

> 30개 데이터 변경 API 전수에 AuditLog 기록 추가 완료.

- [x] **[BE-P1-01]** 라이선스 CRUD AuditLog 추가 ✅
- [x] **[BE-P1-02]** 조직원 생성·수정·삭제 AuditLog 추가 ✅
- [x] **[BE-P1-03]** 사용자 관리 AuditLog 추가 ✅
- [x] **[BE-P1-04]** 그룹·할당·담당자·조직 변경 AuditLog 추가 ✅

### P2 — 입력 검증 강화 (ISMS-P 2.8) ✅ 완료

> lib/validation.ts 공용 유틸리티 + 15개 API 라우트 적용 완료.

- [x] **[BE-P2-01]** 문자열 길이 제한 추가 ✅
- [x] **[BE-P2-02]** 숫자 범위 검증 추가 ✅
- [x] **[BE-P2-03]** 날짜 검증 추가 ✅
- [x] **[BE-P2-04]** enum 유효성 — silent default 제거 ✅

### P3 — 성능 개선 ✅ 완료 (P3-01, P3-02)

> P3-01/02 최적화 완료. P3-03 페이지네이션은 Phase 2 이후 검토.

- [x] **[BE-P3-01]** 신규 조직원 자동 할당 N+1 쿼리 개선 ✅
  - `POST /api/employees` — 개별 count → groupBy 배치 쿼리 (150+ → 3 쿼리)
- [x] **[BE-P3-02]** OrgUnit 삭제 시 재귀 쿼리 개선 ✅
  - `collectDescendantIds()` — 전체 트리 1회 로딩 + 인메모리 BFS
- [ ] **[BE-P3-03]** 목록 API 페이지네이션 추가 (현재 /history만 지원)
  - `GET /api/licenses`, `GET /api/assignments`, `GET /api/groups`

### P4 — 코드 일관성 ✅ 완료

> 7개 라우트 FK 검증 + 20개 라우트 handlePrismaError 적용 완료.

- [x] **[BE-P4-01]** FK 존재 검증 추가 ✅
  - 7개 라우트: org/units, employees, groups, licenses/owners
  - companyId, parentId, orgUnitId, userId, licenseIds[] 배치 검증
- [x] **[BE-P4-02]** 에러 응답 패턴 통일 ✅
  - `handlePrismaError` 유틸리티: P2002→409, P2003→400, P2025→404
  - 기존 `error.message.includes("Unique constraint")` 전량 교체

---

## 🟢 Phase 2 — 자산 유형 확장 (Supabase 전환 후 착수) 📚 ROADMAP

> 📌 **미래 계획입니다.** 자세한 내용은 `tasks/VISION.md` (roadmap) 및 스펙 문서 참조.
>
> 스펙: `tasks/features/asset-management.md`, `tasks/features/org-and-dashboard-improvements.md`

### 백엔드 (`role/backend`)
- [ ] **[BE-020]** `prisma/schema.prisma` — `Asset`, `HardwareDetail`, `CloudDetail` 모델 추가
  - AssetType enum (SOFTWARE, CLOUD, HARDWARE, DOMAIN_SSL, OTHER)
  - AssetStatus enum (ACTIVE, INACTIVE, DISPOSED)
- [ ] **[BE-021]** `GET|POST /api/assets` — 자산 목록 조회·등록
- [ ] **[BE-022]** `GET|PUT|DELETE /api/assets/[id]` — 자산 상세·수정·삭제
- [ ] **[BE-023]** `PATCH /api/assets/[id]/status` — 자산 상태 변경 (INACTIVE / DISPOSED)
- [ ] **[BE-024]** `GET /api/assets/expiring` — 만료 임박 자산 목록
- [ ] **[BE-025]** `POST /api/cron/renewal-notify` — Asset 만료 알림 통합 (expiryDate 기준)

### 프론트엔드 (`role/frontend`)
- [ ] **[FE-010]** `/assets` — 자산 목록 페이지 (탭: 전체·소프트웨어·클라우드·하드웨어·도메인)
  - 각 탭별 필터링 및 정렬
  - 자산 상태 배지 (ACTIVE/INACTIVE/DISPOSED)
- [ ] **[FE-011]** `/assets/new` — 자산 등록 폼 (유형별 추가 필드 동적 표시)
  - SOFTWARE: 라이선스 키, 버전
  - CLOUD: 플랫폼, 계정ID, 좌석 수
  - HARDWARE: 제조사, 모델, SN, 위치
  - DOMAIN_SSL: 도메인명, 인증서 유효기간
- [ ] **[FE-012]** `/assets/[id]` — 자산 상세 페이지
  - 자산 정보 + 유형별 상세정보
  - 할당 이력 (Assignment history)

---

## 🟢 Phase 3 — 월별 비용 보고서 + 통합 대시보드 (Phase 2 완료 후 착수) 📚 ROADMAP

> 📌 **미래 계획입니다.** 자세한 내용은 `tasks/VISION.md` 참조.
>
> 스펙: `tasks/features/monthly-report.md`, `tasks/features/org-and-dashboard-improvements.md`

### 백엔드 (`role/backend`)

**대시보드 통합 API:**
- [ ] **[BE-030]** `GET /api/dashboard/overview` — 전체 자산 집계 (비용, 만료, 상태)
- [ ] **[BE-031]** `GET /api/dashboard/by-category?type=SOFTWARE` — 카테고리별 대시보드

**월별 보고서 API:**
- [ ] **[BE-032]** `GET /api/reports/monthly?month=2026-02` — 월별 종합 보고서
- [ ] **[BE-033]** `GET /api/reports/monthly/export?format=xlsx` — Excel 내보내기
- [ ] **[BE-034]** `GET /api/reports/monthly/export?format=pdf` — PDF 내보내기
- [ ] **[BE-035]** `GET /api/reports/history` — 보고서 생성 이력

### 프론트엔드 (`role/frontend`)

**통합 대시보드:**
- [ ] **[FE-020]** `/dashboard` 확장 — 통합 자산 현황
  - 탭: 개요 / 라이선스 / 클라우드 / 하드웨어 / 도메인SSL
- [ ] **[FE-021]** `/dashboard?type=SOFTWARE` — 라이선스 전용 대시보드
- [ ] **[FE-022]** `/dashboard?type=CLOUD` — 클라우드 전용 대시보드
- [ ] **[FE-023]** `/dashboard?type=HARDWARE` — 하드웨어 전용 대시보드
- [ ] **[FE-024]** `/dashboard?type=DOMAIN_SSL` — 도메인/SSL 전용 대시보드

**월별 보고서 페이지:**
- [ ] **[FE-025]** `/reports` — 월별 종합 보고서
- [ ] **[FE-026]** 보고서 공유 기능 (이메일)

---

## 🟢 Phase 4 — 정보자산 증적 시스템 (Phase 3 완료 후 착수) 📚 ROADMAP

> 📌 **미래 계획입니다. 최종 목표입니다.** 자세한 내용은 `tasks/VISION.md` 참조.
>
> 스펙: `tasks/features/asset-archiving.md`
> ISO27001/ISMS-P 기준 월별 자산 자동 증적 + 구글드라이브 연동

### 백엔드 (`role/backend`)

**DB 마이그레이션:**
- [ ] **[BE-040]** ExchangeRate 테이블 생성 (환율 이력)
- [ ] **[BE-041]** AssetCategory 테이블 생성 (관리자 설정 카테고리)
- [ ] **[BE-042]** Archive 테이블 생성 (증적 메타데이터)
- [ ] **[BE-043]** ArchiveLog 테이블 생성 (작업 로그)
- [ ] **[BE-044]** License: `isVatIncluded` 컬럼 추가
- [ ] **[BE-045]** ArchiveData 테이블 생성 (스냅샷 데이터)
- [ ] **[BE-046]** `prisma generate` 실행

**API 구현:**
- [ ] **[BE-047]** AssetCategory CRUD: `GET|POST|PUT|DELETE /api/admin/asset-categories/[id]`
- [ ] **[BE-048]** ExchangeRate 조회: `GET /api/admin/exchange-rates`
- [ ] **[BE-049]** ExchangeRate 동기화: `POST /api/admin/exchange-rates/sync`
- [ ] **[BE-050]** 증적 목록: `GET /api/admin/archives`
- [ ] **[BE-051]** 수동 내보내기: `POST /api/admin/archives/export` (비동기)
- [ ] **[BE-052]** 증적 상태: `GET /api/admin/archives/[id]/status`
- [ ] **[BE-053]** 증적 로그: `GET /api/admin/archives/[id]/logs`
- [ ] **[BE-054]** 증적 삭제: `DELETE /api/admin/archives/[id]`

**배치 및 내보내기:**
- [ ] **[BE-055]** 정기 증적 배치 (매월 1일 00:00, 지난 1달 데이터)
- [ ] **[BE-056]** 환율 동기화 배치 (매일 09:00, OpenExchangeRates API)
- [ ] **[BE-057]** Excel 생성 (4개 시트: 자산현황, 조직원, 변경이력, 비용요약)
- [ ] **[BE-058]** CSV 생성 (데이터 정제 형식)
- [ ] **[BE-059]** 환율 자동 적용 (단가 × 수량 × 환율 × VAT)
- [ ] **[BE-060]** 변경 이력 추출 (AuditLog 기반)

**Google Drive 통합:**
- [ ] **[BE-061]** OAuth 2.0 설정 (service account)
- [ ] **[BE-062]** 구글드라이브 업로드 라이브러리
- [ ] **[BE-063]** 폴더 생성 및 경로 관리 (YYYY/YYYY-MM)
- [ ] **[BE-064]** 파일 공유 (이메일 선택)
- [ ] **[BE-065]** 업로드 실패 시 재시도 로직

### 프론트엔드 (`role/frontend`)
- [ ] **[FE-030]** `/admin/asset-categories` — 카테고리 관리 페이지
- [ ] **[FE-031]** `/admin/archives` — 증적 목록 및 수동 내보내기
- [ ] **[FE-032]** 증적 상태 모니터링 UI (진행률, 로그)
- [ ] **[FE-033]** 기간 선택 캘린더 (최대 5년)
- [ ] **[FE-034]** 환율 관리 UI (환율 조회, 동기화 트리거)

---

## ✅ Phase 5 — UX 개선 + 버그 수정 + 자산관리 고도화 ✅ COMPLETED

> **스펙**: `tasks/features/phase5-ux-improvements.md`
> **DB 변경**: `tasks/db-changes.md` (2026-03-15 섹션)
> **API 추가**: `tasks/api-spec.md` (Phase 5 섹션)
> **담당**: Ralph loop 에이전트
> **최종 업데이트**: 2026-03-15
> **완료일**: 2026-03-15

### 🔧 Sprint 1 — 버그 수정 ✅ COMPLETED

- [x] **[P5-BUG-001]** 하드웨어 자산 등록 403 에러 수정 ✅
  - `POST /api/assets`에서 ADMIN 전용 체크 제거 → 인증된 사용자 모두 등록 가능

- [x] **[P5-BUG-002]** 라이선스 "No Key" 표시 제거 ✅
  - 라이선스 목록·상세 페이지에서 NO_KEY 타입 배지 미표시

- [x] **[P5-BUG-003]** 이력 페이지 이름 통일 → "변경 이력" ✅
  - 사이드바, 페이지 제목 일괄 변경

---

### 🎨 Sprint 2 — UX 개선 ✅ COMPLETED

- [x] **[P5-FE-001]** 내 프로필 페이지 (`/settings/profile`) ✅
  - `GET/PUT /api/auth/me` 구현, 프로필 UI, 역할별 편집 범위 구분

- [x] **[P5-FE-002]** 비밀번호 수동 변경 UI ✅
  - `/settings/profile` 내 비밀번호 변경 섹션 (현재→새→확인 3단계)

- [x] **[P5-FE-003]** 조직원 부서 → 조직/하위조직 선택 대체 ✅
  - department 자동 세팅 (선택한 orgUnit 이름), 기존 호환성 유지

- [x] **[P5-FE-004]** 이력 유형/액션별 색상 구분 ✅
  - CREATED=초록, UPDATED=파랑, DELETED=빨강, 엔티티별 라벨 색상

---

### ⚙️ Sprint 3 — 자산관리 고도화 ✅ COMPLETED

- [x] **[P5-BE-001]** DB 스키마 확장 ✅
  - HardwareDetail 9개 필드, DomainDetail 모델, HardwareLifecycleSetting 모델

- [x] **[P5-BE-002]** 하드웨어 유형별 동적 필드 API ✅
  - POST/PUT에 cpu, ram, storage 등 새 필드 저장/수정

- [x] **[P5-BE-003]** 하드웨어 수명 주기 설정 API ✅
  - `GET/PUT /api/admin/hardware-lifecycle` ADMIN 전용

- [x] **[P5-FE-005]** 하드웨어 유형별 동적 폼 UI ✅
  - Laptop/Desktop/Server: CPU+RAM+Storage, Network: 포트, Mobile: IMEI, Peripheral: 연결방식+해상도
  - 등록/수정 페이지 모두 적용, 상세 페이지에 새 필드 표시

- [x] **[P5-BE-004]** 도메인/SSL 상세 API ✅
  - DomainDetail 저장/수정, `monthlyCost = cost / billingCycleMonths` 자동 계산

- [x] **[P5-FE-006]** 도메인/SSL 폼 개선 UI ✅
  - 갱신일 라벨, 비용 주기 개월 선택 (1~120개월), 월 환산 비용 실시간 표시, 자동 갱신 체크박스
  - 등록/수정/상세 페이지 모두 적용

---

### 📄 Sprint 4 — PDF/환율/추가 기능 ✅ COMPLETED

- [x] **[P5-BE-005]** PDF 보고서 한글 깨짐 수정 ✅
  - NotoSansKR Regular/Bold 폰트 번들링 (`public/fonts/`)
  - `@react-pdf/renderer` Font.register로 한글 폰트 적용
  - 모든 PDF 라벨을 한글로 변경 (커버, 요약, 테이블 헤더, 상태 라벨)
  - 하이퍼네이션 비활성화

- [x] **[P5-BE-006]** 환율 수동 동기화 기능 추가 ✅
  - `POST /api/cron/exchange-rate-sync` ADMIN 세션으로도 호출 가능
  - ADMIN 수동 동기화 시 기존 데이터 덮어쓰기 허용 (cron은 스킵)

- [x] **[P5-FE-007]** 환율 관리 페이지 개선 ✅
  - "지금 동기화" 버튼 (녹색) + 로딩 스피너
  - 마지막 동기화 시각 표시, 소스별 배지 (API/수동)
  - 동기화 결과 토스트 알림

- [x] **[P5-FE-008]** 만료 임박 자산 대시보드 위젯 ✅
  - D-7 빨강, D-30 주황, D-90 노랑 배지
  - 클릭 시 자산 유형별 상세 페이지 이동
  - 최대 20건 표시, 만료일 가까운 순 정렬

- [x] **[P5-FE-009]** 설정 페이지 구조화 ✅
  - `/settings` 레이아웃 + 상단 탭 내비게이션 (내 프로필/그룹 관리/데이터 가져오기)
  - 탭: 프로필 / 그룹 관리 / CSV 가져오기 / 하드웨어 수명 주기
  - ADMIN 전용 탭 구분

---

### 📋 Sprint 별 요약

| Sprint | 티켓 수 | 역할 | 예상 난이도 |
|---|---|---|---|
| **Sprint 1** (버그) | 3 | BE 1, FE 2 | ⭐ 낮음 |
| **Sprint 2** (UX) | 4 | BE 1, FE 3, 혼합 2 | ⭐⭐ 보통 |
| **Sprint 3** (자산 고도화) | 6 | BE 4, FE 2 | ⭐⭐⭐ 높음 |
| **Sprint 4** (PDF/환율/추가) | 5 | BE 2, FE 3 | ⭐⭐⭐ 높음 |

---

### 작업 순서 가이드 (Ralph loop 에이전트)

```
1. Sprint 1 먼저 완료 (버그 수정 — 체감 즉시 개선)
2. Sprint 2 진행 (UX — 프로필/비밀번호/조직원 개선)
3. Sprint 3 진행 (자산 고도화 — DB 스키마 먼저, API, 마지막 FE)
4. Sprint 4 진행 (PDF/환율 — 난이도 높음, 충분한 테스트)
```

**BE 작업 순서 (의존성 반영)**:
1. P5-BUG-001 (403 수정)
2. P5-BE-001 (DB 스키마) ← 다른 BE 작업의 전제 조건
3. P5-FE-001 중 BE 부분 (auth/me API)
4. P5-BE-002, P5-BE-003 (하드웨어)
5. P5-BE-004 (도메인)
6. P5-BE-005 (PDF)
7. P5-BE-006 (환율 배치)

**FE 작업 순서 (BE 완료 후)**:
1. P5-BUG-002, P5-BUG-003 (즉시 가능)
2. P5-FE-004 (이력 색상 — 즉시 가능)
3. P5-FE-001, P5-FE-002 (프로필 — BE auth/me 완료 후)
4. P5-FE-003 (조직원 — 즉시 가능)
5. P5-FE-005 (하드웨어 — BE-001,002 완료 후)
6. P5-FE-006 (도메인 — BE-004 완료 후)
7. P5-FE-007~009 (환율/대시보드/설정)

---

## 📦 CSV 대량 등록 (임포트) 현황

> **최종 업데이트**: 2026-03-18

### ✅ 지원 중 (8개 타입)

| 타입 | 필수 필드 | 주요 옵션 필드 | 비고 |
|---|---|---|---|
| **라이선스** | name, totalQuantity, purchaseDate | vendor, paymentCycle, unitPrice, currency, exchangeRate, licenseType, key, parentLicenseName | 계층구조·비용 필드 지원 |
| **조직원** | name, department | email, title, companyName, orgUnitName, groupName | title 임포트 시 하드웨어 CIA 자동 캐스케이드 |
| **그룹** | name | description, isDefault, licenseNames(;구분) | 라이선스 멤버 자동 동기화 |
| **할당** | licenseName, employeeEmail | assignedDate, reason | 시트 자동 배정 |
| **시트(키)** | licenseName, key | — | KEY_BASED 전용 |
| **클라우드** | name | vendor, platform, accountId, region, serviceCategory, resourceType, instanceSpec, monthlyCost, currency | 배정자·조직 연결 지원 |
| **도메인·SSL** | name | domainName, registrar, sslType, issuer, cost, currency, autoRenew | — |
| **하드웨어** | name | deviceType, manufacturer, model, serialNumber, assetTag, hostname, os, cpu, ram, storage, ciaC, ciaI, ciaA | CIA 직접 입력(1~3) 또는 배정자 직책 매핑 자동 적용 |

### 🟡 미지원 / 향후 추가 검토

- [ ] **계약(Contract)** 임포트 — 계약 유형·거래처·자동갱신 등
- [ ] **CSV 일괄 수정(업데이트)** — 현재 클라우드/도메인/하드웨어는 생성만 지원, 기존 자산 업데이트 미지원
- [ ] **임포트 미리보기** — 실제 반영 전 변경 예정 내역 프리뷰 UI
- [ ] **임포트 이력** — 언제 누가 몇 건 임포트했는지 조회 (현재 AuditLog에만 기록)

---

## 🟣 Phase 6 — 자산 지도 + 흐름도 자동 생성 📚 ROADMAP

> 📌 **미래 계획입니다.** 자산 간 연결 관계(그래프 데이터)를 기반으로 다양한 뷰를 자동 생성.
> 사이드바에 **[Alpha]** 태그 표시, 기능 확인용 페이지로 운영.

### 핵심 아이디어

자산 간 연결(edge) 데이터를 한번 정의하면, 같은 그래프에서 여러 뷰를 자동 렌더링:
- **자산 지도** — 전체 인프라 토폴로지 (노드 그래프)
- **개인정보 흐름도** — PII 생명주기별 자동 분류 (수집→저장→이용→파기)
- **네트워크 토폴로지** — 네트워크 연결 관계
- **데이터 흐름도** — 시스템 간 데이터 이동 경로

### 백엔드 (`role/backend`)

**DB 모델:**
- [ ] **[BE-070]** `AssetLink` 모델 추가 (자산 연결 관계)
  ```
  AssetLink {
    id, sourceAssetId, targetAssetId,
    linkType: DATA_FLOW | NETWORK | DEPENDENCY | AUTH
    direction: UNI | BI
    label: string (예: "API 호출", "DB 연결", "개인정보 전송")
    dataTypes: string[] (예: ["PII", "LOG", "CREDENTIAL"])
    piiItems: string[] (예: ["이름", "이메일", "휴대전화번호"])
    protocol: string? (예: "HTTPS", "TCP", "SSH")
    legalBasis: string? (예: "개인정보보호법 제15조")
    retentionPeriod: string? (예: "회원탈퇴 후 5일")
    destructionMethod: string? (예: "DB 삭제 배치")
  }
  ```
- [ ] **[BE-070b]** `ExternalEntity` 모델 추가 (외부 수탁사/연계처)
  ```
  ExternalEntity {
    id, name, type: TRUSTEE | PARTNER | GOVERNMENT | OTHER
    description, contactInfo
  }
  ```
  - AssetLink의 source/target이 Asset 또는 ExternalEntity가 될 수 있도록 (polymorphic)
- [ ] **[BE-070c]** `AssetMapView` 모델 추가 (뷰 프리셋 저장)
  ```
  AssetMapView {
    id, name, description
    viewType: ALL | PII | NETWORK | DATA_FLOW | CUSTOM
    nodePositions: JSON (노드별 x, y 좌표)
    filterConfig: JSON (필터 설정)
    createdBy, isShared
  }
  ```
- [ ] **[BE-070d]** `AssetGroup` 모델 추가 (자산 그룹핑)
  ```
  AssetGroup {
    id, name, description, color
    assets: Asset[] (다대다)
  }
  ```
  - 여러 자산을 하나의 박스로 묶기 (예: "골드스푼 AWS 인프라")
- [ ] **[BE-071]** `AssetLink` CRUD API: `GET|POST|PUT|DELETE /api/asset-links`
- [ ] **[BE-071b]** `ExternalEntity` CRUD API: `GET|POST|PUT|DELETE /api/external-entities`
- [ ] **[BE-071c]** `AssetMapView` CRUD API: `GET|POST|PUT|DELETE /api/asset-map/views`
- [ ] **[BE-071d]** `AssetGroup` CRUD API: `GET|POST|PUT|DELETE /api/asset-groups`

**그래프 조회 API:**
- [ ] **[BE-072]** `GET /api/asset-map` — 전체 자산 그래프 (노드 + 엣지)
- [ ] **[BE-073]** `GET /api/asset-map?view=pii` — PII 흐름만 필터
- [ ] **[BE-074]** `GET /api/asset-map?view=network` — 네트워크 연결만 필터

**자동 분류 로직:**
- [ ] **[BE-075]** PII 흐름도 자동 생성
  - `linkType=DATA_FLOW` + `dataTypes includes PII` → 개인정보 흐름도 포함
  - 자산 `type`(CLOUD/HARDWARE/DOMAIN)으로 생명주기 단계 자동 분류
  - 수집 단계: 사용자 접점 자산 (웹서버, 앱서버)
  - 저장 단계: DB, 스토리지 (RDS, S3)
  - 이용/제공: 외부 연계 자산 + ExternalEntity 노드
  - 파기: 배치/스케줄러 자산
  - 각 단계별 처리 개인정보 항목(piiItems) 자동 집계
  - 법적 근거(legalBasis) · 보유기간(retentionPeriod) · 파기방법(destructionMethod) 표시

**감사 로그:**
- [ ] **[BE-076]** AssetLink 변경 이력 AuditLog 기록 (생성/수정/삭제)

**CSV 임포트:**
- [ ] **[BE-077]** AssetLink 대량 등록 CSV 임포트 지원

### 프론트엔드 (`role/frontend`)

- [ ] **[FE-040]** `/asset-map` — 자산 지도 페이지 (Alpha)
  - reactflow 기반 인터랙티브 노드 그래프
  - 자산 유형별 노드 아이콘/색상 (서버, DB, 스토리지, 네트워크)
  - 외부 수탁사/연계처 노드 (ExternalEntity, 별도 아이콘)
  - 자산 그룹 박스 표시 (AssetGroup → 그룹 내 자산을 하나의 박스로)
  - 드래그앤드롭으로 노드 위치 조정 → **좌표 DB 저장**
  - 엣지 클릭 시 연결 상세 (프로토콜, 데이터 유형, PII 항목)
  - 뷰 전환: 전체 / PII 흐름 / 네트워크 / 데이터 흐름
- [ ] **[FE-040b]** 뷰 프리셋 저장/불러오기 UI
  - "회원가입 흐름", "결제 흐름" 등 커스텀 뷰 저장
  - 뷰 공유 (다른 사용자도 열람 가능)
- [ ] **[FE-041]** 자산 연결 편집 UI
  - 노드 간 드래그로 새 연결 생성
  - 연결 유형·방향·라벨·데이터유형 설정 모달
  - PII 항목 태깅 (체크리스트: 이름, 이메일, 전화번호, 주민번호 등)
  - 법적 근거·보유기간·파기방법 입력 필드
- [ ] **[FE-042]** PII 흐름도 뷰
  - 생명주기별 레이아웃 (수집 → 저장 → 이용/제공 → 파기)
  - 이미지 예시처럼 행(수집/저장/이용/파기) × 열(정보주체/처리흐름/외부연계/처리개인정보) 구조
  - 처리 개인정보 항목(piiItems) 자동 표시
  - 외부 수탁사/연계처 노드 표시 (NICE, 알리고 등)
  - 법적 근거·보유기간 주석 표시
- [ ] **[FE-043]** 사이드바에 `[Alpha]` 태그 표시
  - "자산 지도 [Alpha]" 메뉴 항목 추가
  - Alpha 배지 스타일 (보라색 뱃지)

### 내보내기
- [ ] **[FE-044]** PDF/이미지 내보내기 — ISMS 심사 제출용 흐름도 출력
- [ ] **[FE-045]** 엑셀 매트릭스 내보내기 — 표 형태(행: 생명주기, 열: 정보주체/처리흐름/외부연계)

### 기술 스택 (폐쇄망 호환)
- **그래프 렌더링**: `reactflow` (npm 번들, CDN 불필요)
- **레이아웃 알고리즘**: `dagre` (계층 레이아웃) 또는 `d3-force` (물리 시뮬레이션)
- **내보내기**: SVG/PNG 다운로드, PDF (`@react-pdf/renderer`), Excel (`exceljs`)

---

## 📋 요약: 이 파일의 역할

| 섹션 | 상태 | 참고 |
|------|------|------|
| **우선순위 1 (PostgreSQL 전환)** | ✅ COMPLETED | 역사 기록용 |
| **우선순위 2 (배포 전 마무리)** | ✅ COMPLETED | 역사 기록용 |
| **Phase 2-4** | ✅ COMPLETED | `current-state.md` 참조 |
| **Phase 5 (UX + 버그 + 고도화)** | ✅ COMPLETED | PR #50 |
| **Phase 6 (자산 지도 + 흐름도)** | 📚 ROADMAP | Alpha 버전 |
| **완료된 기능** | 📚 REFERENCE | 구현된 기능 목록 |

---

## 완료된 기능 (master 반영)

<details>
<summary>펼치기</summary>

### 인증
- [x] 로그인 / 로그아웃 / 세션 확인
- [x] ADMIN / USER 역할 분리
- [x] 로그인 브루트포스 방어

### 라이선스 관리
- [x] 라이선스 CRUD, 시트 관리, 중복 검사
- [x] 갱신 상태·일자·이력·담당자 관리
- [x] 라이선스 그룹 + 기본 그룹 자동 할당

### 할당·반납
- [x] 라이선스 할당 (Server Action)
- [x] 반납 / 삭제

### 조직원 관리
- [x] CRUD, 조직 이동, 퇴사 처리(7일 유예)

### 조직 관리
- [x] 회사(OrgCompany) / OrgUnit CRUD + 삭제 프리뷰

### 배치/스케줄러
- [x] OFFBOARDING 자동 삭제 (`POST /api/cron/offboard`)
- [x] 갱신 알림 (`POST /api/cron/renewal-notify`, D-70/30/15/7)

### Admin
- [x] 사용자 CRUD, 삭제, 임시 비밀번호 발급

### 대시보드 / 감사 로그 / CSV
- [x] 대시보드 차트, 감사 로그, CSV 임포트

</details>
