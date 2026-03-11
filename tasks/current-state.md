# 📍 현재 프로젝트 상태

> 🎯 **Planning Role**이 관리합니다. 다른 모든 Role은 **작업 시작 전 반드시 읽으세요.**
>
> **📚 먼저 읽어야 할 문서**: [`tasks/README.md`](README.md) → [`tasks/VISION.md`](VISION.md) → [`tasks/TICKETS.md`](TICKETS.md)
>
> 최종 업데이트: 2026-03-11 🚀

---

## 브랜치 현황

| 브랜치 | 상태 | 내용 |
|---|---|---|
| `master` | 기준 브랜치 | PR #40까지 머지 완료 |
| `role/planning` | 운영 중 | 기획 문서 전담 |
| `role/backend` | 운영 중 | 백엔드 코드 전담 |
| `role/frontend` | 운영 중 | 프론트엔드 코드 전담 |
| `role/devops` | 운영 중 | 배포/인프라 전담 |
| `role/security` | 운영 중 | 보안 문서 전담 |

> ⚠️ 로컬 master가 origin/master보다 뒤처진 경우: `git pull origin master` 실행 필수

---

## 🎯 현재 상태 요약

| Phase | 상태 | 비고 |
|---|---|---|
| **Phase 1** — 라이선스 관리 | ✅ 완료 | |
| **Phase 2** — PostgreSQL 전환 + 자산 확장 | ✅ 완료 | PR #31~35 머지 |
| **Phase 3-1 BE** — 라이선스 계층 (BE-040) | ✅ 완료 | PR #34 머지 |
| **Phase 3 BE** — 월별 보고서 API (BE-030~034) | ✅ 완료 | PR #36 머지 |
| **DevOps 보안 강화** | ✅ 완료 | PR #38~40 머지 |
| **공개 열람 모드 BE** — BE-050 | 🟡 PR #42 리뷰 대기 | GET API 인증 제거 |
| **Phase 3-1 FE** — FE-040 라이선스 계층 UI | 🟡 PR #41 리뷰 대기 | #41에 포함 |
| **Phase 3 FE** — 보고서 UI (FE-020~022) | 🟡 PR #41 리뷰 대기 | #41에 같이 포함 |
| **공개 열람 모드 FE** — FE-050 | 🟡 PR #43 리뷰 대기 | 로그인 없이 조회 가능 |
| **EC2 배포** | ⏳ PR 머지 후 진행 | **사람이 직접 실행** |

---

## 🔴 지금 당장 해야 할 일

### 1순위 — PR 3개 머지 (사람이 직접)

> PR 의존 관계: **#42 (BE-050) → #43 (FE-050)** 순서로 머지 권장
> PR #41은 독립적으로 머지 가능

| PR | 제목 | 브랜치 | 액션 |
|---|---|---|---|
| **#42** | BE-050: GET API 공개 접근 | `claude/ecstatic-sanderson` | 👉 먼저 머지 |
| **#43** | FE-050: 공개 열람 모드 | `claude/gracious-williamson` | 👉 #42 이후 머지 |
| **#41** | FE-040 + FE-020~022 UI | `frontend/FE-040-reports` | 👉 병행 머지 가능 |

```bash
# GitHub에서 PR 머지 후 로컬 동기화
git checkout master
git pull origin master
```

### 2순위 — EC2 재배포 (PR 머지 완료 후)

```powershell
# [1단계] 로컬 Windows에서 실행
.\deploy.ps1   # git push + S3 업로드 자동
```

```bash
# [2단계] EC2 SSM 접속 후 실행
aws ssm start-session --target i-0aeda7845a9634718 --region ap-northeast-2 --profile hyeongunk

cd /home/ssm-user/app
aws s3 cp s3://triplecomma-releases/triplecomma-backoffice/license-manager.zip .
sudo rm -rf license-manager
sudo mkdir -p license-manager && sudo chown -R ssm-user:ssm-user license-manager
unzip -q license-manager.zip -d license-manager && rm license-manager.zip
cd license-manager

# 디스크 공간 먼저 확보 (30GB 꽉 찬 경우)
sudo docker system prune -a -f   # ⚠️ 볼륨(DB)은 보존됨, 이미지·캐시만 삭제

# 재배포
sudo docker compose down 2>/dev/null || true
sudo docker image prune -a -f
sudo docker builder prune -f
sudo docker compose build
sudo docker compose up -d
```

```bash
# [3단계] 배포 확인
sudo docker compose ps
sudo docker compose logs -f app
```

---

## master에 반영된 기능 (구현 완료)

### 인증
- 로그인 / 로그아웃 (세션 쿠키 기반)
- 역할 기반 접근 제어 (ADMIN / USER)
- 로그인 브루트포스 방어 (`lib/rate-limit.ts`)
- `mustChangePassword` 강제 비밀번호 변경 UI

### 라이선스 관리 (Phase 1)
- 라이선스 CRUD (KEY_BASED / VOLUME / NO_KEY)
- 시트(개별 키) 등록·수정, 중복 검사
- 할당 / 반납 / 삭제
- 라이선스 그룹 (기본 그룹 자동 할당)
- **갱신 상태 관리**: `PUT /api/licenses/[id]/renewal-status`
- **갱신 이력**: `GET /api/licenses/[id]/renewal-history`
- **갱신일 수동 설정**: `PUT /api/licenses/[id]/renewal-date`
- **담당자 관리**: `GET|POST|DELETE /api/licenses/[id]/owners`
- **계층 구조 (parentId)**: `GET /api/licenses?includeChildren=true` (PR #34, BE-040)

### 자산 관리 (Phase 2)
- `GET|POST /api/assets`
- `GET|PUT|DELETE /api/assets/[id]`
- `PATCH /api/assets/[id]/status`
- `GET /api/assets/expiring`
- `/assets` 목록 / `/assets/new` 등록 / `/assets/[id]` 상세 UI

### 조직원 관리
- 조직원 CRUD
- **조직 이동**: `PATCH /api/employees/[id]`
- **퇴사 처리**: `POST /api/employees/[id]/offboard` (7일 유예)

### 조직 관리
- `GET|POST /api/org/units` — 트리 조회 / 생성
- `PUT|DELETE /api/org/units/[id]` — 수정 / 삭제
- `GET /api/org/units/[id]/delete-preview` — 삭제 영향 범위 미리보기
- `PUT|DELETE /api/org/companies/[id]` — 회사 수정·삭제

### 배치/스케줄러
- `POST /api/cron/offboard` — OFFBOARDING 자동 삭제
- `POST /api/cron/renewal-notify` — 갱신 알림 (D-70/30/15/7, Slack + Email) + Asset 만료 통합

### Admin
- `DELETE /api/admin/users/[id]` — 사용자 삭제
- `POST /api/admin/users/[id]/reset-password` — 임시 비밀번호 발급

### 월별 보고서 API (Phase 3 BE, PR #36)
- `GET /api/reports/monthly/[yearMonth]/data` — 집계 데이터
- `GET /api/reports/monthly/[yearMonth]/excel` — Excel 다운로드
- `GET /api/reports/monthly/[yearMonth]/pdf` — PDF 다운로드
- `POST /api/cron/monthly-report` — 자동 생성 배치
- `POST /api/reports/monthly/[yearMonth]/email` — 이메일 발송

### 대시보드 / 감사 로그 / CSV 임포트
- 대시보드 차트 (비용 추이, 유형 분포, 누적 성장)
- 감사 로그 조회 `/history`
- CSV 임포트 (라이선스, 조직원, 그룹, 배정)

---

## 오픈 PR 기능 (머지 후 master 반영 예정)

### PR #41 — FE-040 + FE-020~022
- `/licenses` 목록: 계층 구조 트리 표시 (└─ 들여쓰기)
- `/licenses/[id]/edit`: 상위 라이선스 드롭다운
- `/licenses/[id]`: 하위 라이선스 섹션
- `/reports`, `/reports/[id]`, `/settings/reports`: 월별 보고서 UI

### PR #42 — BE-050 GET API 공개화
- 모든 GET API에서 `getCurrentUser()` 인증 체크 제거 (약 20개 라우트)
- `/api/admin/*` GET은 인증 유지
- POST/PUT/PATCH/DELETE는 기존대로 인증 필요

### PR #43 — FE-050 공개 열람 모드
- `proxy.ts`: 페이지 redirect 제거, API 뮤테이션만 401
- `layout.tsx`: 미인증 시 로그인 버튼 표시
- 모든 목록/상세 페이지: 인증 없이 조회 가능
- 등록/수정/삭제 버튼: 로그인 시만 표시
- 쓰기 전용 페이지: 비인증 시 `/login` redirect

---

## DB 스키마 (master 기준)

| 테이블 | 주요 컬럼 |
|---|---|
| `OrgUnit` | `sortOrder`, `updatedAt` / `UNIQUE(name, companyId)` |
| `Employee` | `orgUnitId`, `status(ACTIVE/OFFBOARDING/DELETED)`, `offboardingUntil` |
| `User` | `mustChangePassword` |
| `License` | `renewalDate`, `renewalDateManual`, `renewalStatus`, **`parentId`** (계층 구조) |
| `LicenseRenewalHistory` | 갱신 상태 변경 이력 |
| `LicenseOwner` | 라이선스 담당자 (userId 또는 orgUnitId) |
| `Asset` | `type(SOFTWARE/CLOUD/HARDWARE/DOMAIN_SSL/OTHER)`, `status`, `expiryDate` |
| `NotificationLog` | 알림 발송 이력 (SLACK / EMAIL) |
| `AuditLog` | `actorType`, `actorId` 추가 |

---

## 📚 문서 가이드

| Role | 참고 문서 |
|---|---|
| **Planning** | `tasks/VISION.md`, `tasks/TICKETS.md` |
| **Backend** | `tasks/TICKETS.md`, `tasks/PHASE3-TICKETS.md`, `tasks/api-spec.md` |
| **Frontend** | `tasks/TICKETS.md`, `tasks/PHASE3-TICKETS.md` |
| **DevOps** | `CLAUDE.md`, `tasks/troubleshooting.md` |
| **Security** | `tasks/security/guidelines.md` |

---

## 파일 조회 명령어

```bash
# role 브랜치의 특정 파일 확인
git show role/backend:app/api/org/units/route.ts

# 브랜치 변경 파일 목록
git diff master...role/frontend --stat

# origin/master 최신 파일 확인
git show origin/master:docker-compose.yml
```
