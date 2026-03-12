# 📍 현재 프로젝트 상태

> 🎯 **Planning Role**이 관리합니다. 다른 모든 Role은 **작업 시작 전 반드시 읽으세요.**
>
> **📚 먼저 읽어야 할 문서**: [`tasks/README.md`](README.md) → [`tasks/VISION.md`](VISION.md) → [`tasks/TICKETS.md`](TICKETS.md)
>
> 최종 업데이트: 2026-03-11 (PR #42~44 머지 완료)

---

## 브랜치 현황

| 브랜치 | 상태 | 내용 |
|---|---|---|
| `master` | 기준 브랜치 | Phase 1~4 + 공개 열람 모드 (PR #44까지 머지) |
| `role/planning` | 운영 중 | 기획 문서 전담 |
| `role/backend` | 운영 중 | 백엔드 코드 전담 |
| `role/frontend` | 운영 중 | 프론트엔드 코드 전담 |
| `role/devops` | 운영 중 | 배포/인프라 전담 |
| `role/security` | 운영 중 | 보안 문서 전담 |

> 오픈 PR: **0개** (모든 PR 정리 완료)

---

## 🎯 현재 상태 요약

| Phase | 상태 | 비고 |
|---|---|---|
| **Phase 1** — 라이선스 관리 | ✅ 완료 | |
| **Phase 2** — PostgreSQL 전환 + 자산 확장 | ✅ 완료 | |
| **Phase 3 BE** — 월별 보고서 API (BE-030~034) | ✅ 완료 | |
| **Phase 3-1** — 라이선스 계층 구조 (BE-040 + FE-040) | ✅ 완료 | |
| **Phase 3 FE** — 보고서 UI (FE-020~022) | ✅ 완료 | |
| **Phase 4 BE** — 증적 DB + API + 배치 | ✅ 완료 | 증적/환율/자산카테고리 |
| **Phase 4 FE** — 증적·환율·자산카테고리 관리 UI | ✅ 완료 | /admin/* 페이지 |
| **BE-050** — GET API 공개 접근 | ✅ 완료 | PR #42 |
| **FE-050** — 공개 열람 모드 (비인증 읽기) | ✅ 완료 | PR #43 |
| **FE-ORG-001** — Company CRUD UI | ✅ 완료 | |
| **FE-001** — 비밀번호 변경 API + UI | ✅ 완료 | |
| **자산 페이지** — Mock → 실제 API | ✅ 완료 | |
| **Phase 4** — Google Drive 연동 | 🔴 미완성 | 외부 OAuth 환경변수 필요 |
| **EC2 배포** | ⏳ 대기 | 사람이 직접 실행 |

---

## master에 반영된 기능 (구현 완료)

### 인증 & 공개 열람
- 로그인 / 로그아웃 (세션 쿠키 기반)
- 역할 기반 접근 제어 (ADMIN / USER)
- **공개 열람 모드**: 비인증 사용자도 모든 페이지 읽기 가능, 쓰기만 인증 요구
- `useAuth()` hook (`hooks/useAuth.ts`) — 클라이언트 컴포넌트 인증 상태 확인
- `proxy.ts`: 공개 경로 허용, API POST/PUT/DELETE만 인증 체크
- `mustChangePassword` 강제 비밀번호 변경 UI
- 로그인 브루트포스 방어 (`lib/rate-limit.ts`)

### 라이선스 관리 (Phase 1)
- 라이선스 CRUD (KEY_BASED / VOLUME / NO_KEY)
- 시트(개별 키) 등록·수정, 중복 검사
- 할당 / 반납 / 삭제
- 라이선스 그룹 (기본 그룹 자동 할당)
- 갱신 상태/이력/날짜 관리
- 담당자(Owner) 관리
- **계층 구조 (parentId)**: 부모-자식 관계 + UI 트리 표시

### 자산 관리 (Phase 2)
- `GET|POST /api/assets`, `GET|PUT|DELETE /api/assets/[id]`
- `PATCH /api/assets/[id]/status`, `GET /api/assets/expiring`
- 자산 목록/등록/상세/수정 UI (실제 API 연결)

### 조직 관리
- 부서(OrgUnit) CRUD + 트리 구조
- **회사(Company) CRUD**: `/api/org/companies/[id]`
- 조직도 UI: 회사 생성/수정/삭제 + 부서 트리 편집

### 보고서 (Phase 3)
- 월별 보고서 API: 데이터 집계, Excel, PDF, Email 발송
- 보고서 UI: `/reports`, `/reports/[yearMonth]`, `/reports/settings`

### 증적/환율/자산카테고리 (Phase 4)
- 증적(Archive) CRUD + Export + Google Drive 업로드
- 환율(ExchangeRate) CRUD + 자동 동기화 (외부 API)
- 자산카테고리(AssetCategory) CRUD
- 월별 자동 증적 배치 (`/api/cron/monthly-archive`)
- ADMIN 전용 UI: `/admin/archives`, `/admin/exchange-rates`, `/admin/asset-categories`

### 기타
- 대시보드 차트 (비용 추이, 유형 분포, 누적 성장)
- 감사 로그 조회 `/history`
- CSV 임포트 (라이선스, 조직원, 그룹, 배정)
- 조직원 CRUD + 퇴사 처리 (7일 유예)

---

## DB 스키마 (master 기준)

| 테이블 | 주요 특징 |
|---|---|
| `License` | `parentId` (계층), 갱신 상태/이력/날짜 |
| `Asset` | SW/Cloud/HW/Domain/Other, 만료일 관리 |
| `Employee` | 조직 이동, 퇴사 유예 |
| `User` | `mustChangePassword` |
| `ExchangeRate` | 일별 환율 (USD/EUR/JPY/GBP/CNY) |
| `AssetCategory` | Google Drive 폴더 연동 |
| `Archive` + `ArchiveLog` + `ArchiveData` | 월별 증적 스냅샷 |
| `AuditLog` | `actorType`, `actorId` |

---

## 🔴 다음 작업

### 1. EC2 배포 (사람이 직접 실행)

```powershell
# [1단계] 로컬 Windows에서 실행
.\deploy.ps1   # git push + S3 업로드 자동
```

```bash
# [2단계] EC2 SSM 접속 후 실행
aws ssm start-session --target i-03b9c1979ef4a2142 --region ap-northeast-2 --profile hyeongunk

cd /home/ssm-user/app
aws s3 cp s3://triplecomma-releases/triplecomma-backoffice/license-manager.zip .
sudo rm -rf license-manager
sudo mkdir -p license-manager && sudo chown -R ssm-user:ssm-user license-manager
unzip -q license-manager.zip -d license-manager && rm license-manager.zip
cd license-manager

# 디스크 공간 확보
sudo docker system prune -a -f

sudo docker-compose down 2>/dev/null || true
sudo docker-compose build
sudo docker-compose up -d

# DB 스키마 동기화 (새 테이블 추가됨)
sudo docker exec license-app sh -c "npx prisma db push"
```

### 2. Google Drive 연동 완성
- 환경변수 설정 필요: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`
- 설정 후 증적 Export 기능 자동 활성화

---

## 📚 문서 가이드

| Role | 참고 문서 |
|---|---|
| **Planning** | `tasks/VISION.md`, `tasks/TICKETS.md` |
| **Backend** | `tasks/TICKETS.md`, `tasks/api-spec.md` |
| **Frontend** | `tasks/TICKETS.md`, `hooks/useAuth.ts` |
| **DevOps** | `CLAUDE.md`, `tasks/troubleshooting.md` |
| **Security** | `tasks/security/guidelines.md` |
