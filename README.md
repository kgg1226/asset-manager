# IT Asset Manager

**사내 정보자산 통합 관리 시스템** | **Enterprise IT Asset Management System**

소프트웨어 라이선스, 클라우드 구독, 하드웨어, 도메인/SSL, 계약 등 조직의 모든 IT 자산을 하나의 플랫폼에서 관리합니다.

Manage all your organization's IT assets — software licenses, cloud subscriptions, hardware, domains/SSL, and contracts — in one unified platform.

---

## 주요 기능 | Features

### 자산 관리 | Asset Management
- **소프트웨어 라이선스** — 시트 배정, 키 관리, 그룹 관리, 사용률 추적
- **클라우드 서비스** — AWS / GCP / Azure / SaaS 구독, 계약 갱신 관리
- **하드웨어** — 서버, 네트워크 장비, PC, 모바일, 감가상각 자동 계산
- **도메인 & SSL** — 만료일 D-day 추적, 등록 대행사 관리
- **계약** — 유지보수, SLA, 외주 계약 관리
- **Software Licenses** — Seat assignment, key management, group management, usage tracking
- **Cloud Services** — AWS / GCP / Azure / SaaS subscriptions, contract & renewal management
- **Hardware** — Servers, network equipment, PCs, mobile devices, automatic depreciation calculation
- **Domains & SSL** — Expiry D-day tracking, registrar management
- **Contracts** — Maintenance, SLA, outsourcing contract management

### 조직 & 인력 | Organization & People
- **조직도** — 부서/팀 트리 구조, 드래그 앤 드롭 편집
- **정보보호 조직도** — CISO/CPO/담당자 체계 시각화 및 데이터 입력
- **구성원 관리** — 자산 배정/회수, 퇴직 처리 시 일괄 회수
- **Org Chart** — Department/team tree structure with drag & drop editing
- **Security Org Chart** — CISO/CPO/officer hierarchy visualization & data input
- **Employee Management** — Asset assignment/retrieval, bulk retrieval on offboarding

### 비용 & 보고서 | Cost & Reports
- **대시보드** — 월별 비용 추이, 자산 유형/상태 분포 차트 (Recharts)
- **월별 보고서** — 자동 생성, Excel/PDF 내보내기, 이메일 발송
- **환율 계산기** — 다중 통화(KRW, USD, EUR, JPY, GBP, CNY) 비용 환산
- **Dashboard** — Monthly cost trends, asset type/status distribution charts (Recharts)
- **Monthly Reports** — Auto-generation, Excel/PDF export, email delivery
- **Currency Calculator** — Multi-currency (KRW, USD, EUR, JPY, GBP, CNY) cost conversion

### 보안 & 알림 | Security & Notifications
- **CIA 보안 등급** — 자산별 기밀성(C) / 무결성(I) / 가용성(A) 평가
- **만료 알림** — Email / Slack 자동 알림 (D-70, D-30, D-15, D-7)
- **감사 로그** — 모든 자산 변경 이력 자동 기록
- **CIA Rating** — Per-asset Confidentiality / Integrity / Availability assessment
- **Expiry Alerts** — Automatic Email / Slack notifications (D-70, D-30, D-15, D-7)
- **Audit Log** — Automatic tracking of all asset changes

### 기타 | Others
- **다국어 지원** — 한국어, English, 日本語, 中文(简体), 中文(繁體), Tiếng Việt
- **인터랙티브 가이드** — 페이지별 투어 가이드로 온보딩 지원
- **CSV 가져오기** — 기존 자산 데이터 일괄 등록
- **역할 기반 접근 제어** — ADMIN / USER 권한 분리
- **Multilingual** — Korean, English, Japanese, Simplified Chinese, Traditional Chinese, Vietnamese
- **Interactive Guide** — Per-page tour guides for user onboarding
- **CSV Import** — Bulk registration of existing asset data
- **Role-based Access Control** — ADMIN / USER permission separation

---

## 기술 스택 | Tech Stack

| 영역 / Area | 기술 / Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes, Server Actions |
| Database | PostgreSQL 16, Prisma 7 ORM |
| Auth | Session Cookie + bcryptjs |
| Charts | Recharts 3 |
| Export | ExcelJS, @react-pdf/renderer |
| Notifications | Nodemailer (SMTP), Slack Webhook |
| Deployment | Docker Compose, AWS EC2 (ARM64) |
| Runtime | Node.js 20.x |

---

## 빠른 시작 | Quick Start

### 사전 요구사항 | Prerequisites

- Node.js 20.x
- Docker & Docker Compose (권장) 또는 PostgreSQL 16+
- Docker & Docker Compose (recommended) or PostgreSQL 16+

### Docker Compose (권장 | Recommended)

```bash
# 1. 저장소 클론 | Clone repository
git clone https://github.com/kgg1226/asset-manager.git
cd asset-manager

# 2. 환경변수 설정 | Configure environment variables
cp examples/.env.example .env
# .env 파일을 열어 필요한 값을 수정하세요
# Open .env and update the values as needed

# 3. 실행 | Start
docker-compose up -d --build

# 4. 접속 | Access
# http://localhost:8080
# 기본 계정 | Default credentials: admin / changeme123
```

### 로컬 개발 | Local Development

```bash
# 1. 의존성 설치 | Install dependencies
npm install

# 2. PostgreSQL 실행 | Start PostgreSQL (via Docker)
docker-compose up -d postgres

# 3. 환경변수 설정 | Configure environment variables
cp examples/.env.example .env
# DATABASE_URL을 localhost로 변경 | Change DATABASE_URL to localhost:
# DATABASE_URL=postgresql://license_manager:license_manager_pass@localhost:5432/license_manager

# 4. DB 스키마 적용 & 시드 | Apply DB schema & seed
npx prisma db push
npx prisma db seed

# 5. 개발 서버 실행 | Start dev server
npm run dev

# http://localhost:3000
```

---

## 환경변수 | Environment Variables

| 변수 / Variable | 필수 / Required | 설명 / Description |
|---|---|---|
| `DATABASE_URL` | O | PostgreSQL 연결 문자열 / PostgreSQL connection string |
| `SECURE_COOKIE` | O | HTTPS: `true`, HTTP: `false` |
| `CRON_SECRET` | O | 배치 스케줄러 인증 시크릿 / Cron job auth secret |
| `SEED_ADMIN_USERNAME` | - | 초기 관리자 ID / Initial admin username (default: `admin`) |
| `SEED_ADMIN_PASSWORD` | - | 초기 관리자 비밀번호 / Initial admin password (default: `changeme123`) |
| `SLACK_WEBHOOK_URL` | - | Slack Incoming Webhook URL |
| `SMTP_HOST` | - | SMTP 서버 / SMTP server host |
| `SMTP_PORT` | - | SMTP 포트 / SMTP port (default: `587`) |
| `SMTP_USER` | - | SMTP 사용자 / SMTP username |
| `SMTP_PASS` | - | SMTP 비밀번호 / SMTP password |
| `SMTP_FROM` | - | 발신자 이메일 / Sender email address |

---

## 프로젝트 구조 | Project Structure

```
app/
  api/                 # API Routes
    admin/             #   User management API
    assets/            #   Asset (cloud/hardware/domain) API
    auth/              #   Authentication API
    contracts/         #   Contract API
    cron/              #   Batch scheduler API
    employees/         #   Employee API
    licenses/          #   License API
    org/               #   Organization & security org chart API
    reports/           #   Report generation API
    history/           #   Audit log API
  dashboard/           # Dashboard with charts
  licenses/            # Software license management
  cloud/               # Cloud service management
  hardware/            # Hardware asset management
  domains/             # Domain & SSL management
  contracts/           # Contract management
  employees/           # Employee management
  org/                 # Organization chart
  reports/             # Monthly reports
  settings/            # Groups, CSV import, notifications, profile
  admin/               # User management (ADMIN only)
  history/             # Audit log
  guide/               # User guide with interactive tours
  _components/         # Shared components (tour guide, CIA badge, etc.)
lib/
  i18n/                # Internationalization (6 languages)
  prisma.ts            # Prisma client singleton
  auth.ts              # Authentication (session + bcryptjs)
  audit-log.ts         # Audit logging
  notification.ts      # Email & Slack notifications
  cost-calculator.ts   # Currency conversion
  cia.ts               # CIA security rating
  assignment-actions.ts # Asset assign/unassign server actions
prisma/
  schema.prisma        # Database schema (PostgreSQL)
  seed.ts              # Database seed
dockerfile             # Multi-stage Docker build (builder + runner)
docker-compose.yml     # PostgreSQL + App services
```

---

## 주요 페이지 | Pages

| 경로 / Path | 설명 / Description |
|---|---|
| `/dashboard` | 대시보드 / Dashboard |
| `/licenses` | 라이선스 관리 / License management |
| `/cloud` | 클라우드 자산 / Cloud assets |
| `/hardware` | 하드웨어 자산 / Hardware assets |
| `/domains` | 도메인 & SSL / Domains & SSL |
| `/contracts` | 계약 관리 / Contract management |
| `/employees` | 구성원 관리 / Employee management |
| `/org` | 조직도 / Organization chart |
| `/reports` | 월별 보고서 / Monthly reports |
| `/history` | 감사 로그 / Audit log |
| `/settings/groups` | 그룹 설정 / Group settings |
| `/settings/import` | CSV 가져오기 / CSV import |
| `/settings/notifications` | 알림 설정 / Notification settings |
| `/settings/profile` | 프로필 설정 / Profile settings |
| `/admin/users` | 사용자 관리 (ADMIN) / User management (ADMIN) |
| `/guide` | 사용 가이드 / User guide |

---

## 배포 | Deployment

### Docker Compose

```bash
# 빌드 & 실행 | Build & start
docker-compose up -d --build

# 로그 확인 | View logs
docker-compose logs -f app

# 중지 | Stop
docker-compose down
```

### AWS EC2 (ARM64)

이 프로젝트는 AWS EC2 t4g.small (ARM64, 2 vCPU, 2GB RAM) 환경에 최적화되어 있습니다.
단방향 폐쇄망(내부→외부 가능, 외부→내부 불가) 환경을 지원합니다.

This project is optimized for AWS EC2 t4g.small (ARM64, 2 vCPU, 2GB RAM).
Supports unidirectional closed network (outbound only, no inbound access).

```bash
# EC2 접속 후 | After connecting to EC2
cd /opt/license-manager
docker-compose up -d --build
```

> **참고**: 저사양 서버(RAM 2GB 이하)에서는 빌드 전 스왑 메모리를 확인하세요 (`free -h`).
>
> **Note**: On low-spec servers (RAM ≤ 2GB), verify swap memory before building (`free -h`).

---

## 주요 명령어 | Commands

```bash
# 개발 서버 | Dev server
npm run dev

# 프로덕션 빌드 | Production build
npm run build

# 프로덕션 실행 | Production start
npm start

# Prisma 클라이언트 생성 | Generate Prisma client
npm run prisma:generate

# DB 스키마 적용 | Push DB schema
npx prisma db push

# DB 시드 | Seed database
npx prisma db seed

# 린트 | Lint
npm run lint
```

---

## 라이선스 | License

[MIT License](LICENSE) - Copyright (c) 2026 Silas.K
