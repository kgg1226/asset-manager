# IT Asset Manager

**사내 정보자산 통합 관리 시스템** | **Enterprise IT Asset Management System**

소프트웨어 라이선스, 클라우드 구독, 하드웨어, 도메인/SSL, 계약 등 조직의 모든 IT 자산을 하나의 플랫폼에서 관리합니다.

Manage all your organization's IT assets — software licenses, cloud subscriptions, hardware, domains/SSL, and contracts — in one unified platform.

---

## 주요 기능 | Features

### 자산 관리 | Asset Management
- **소프트웨어 라이선스** — 시트 배정, 키 관리, 그룹 관리, 사용률 추적, 비용 계산(다중 통화)
- **클라우드 서비스** — AWS / GCP / Azure / SaaS 구독, 계정/리전/리소스 상세 관리
- **하드웨어** — 서버, 네트워크 장비, PC, 모바일, 유형별 동적 필드, CIA 보안 등급
- **도메인 & SSL** — 만료일 D-day 추적, 등록 대행사, 인증서 유형/발급기관 관리
- **계약** — 유지보수, SLA, 외주 계약, 견적서/계약서 파일 관리
- **Software Licenses** — Seat assignment, key management, group management, usage tracking, cost calculation (multi-currency)
- **Cloud Services** — AWS / GCP / Azure / SaaS subscriptions, account/region/resource detail management
- **Hardware** — Servers, network equipment, PCs, mobile devices, dynamic fields by type, CIA security rating
- **Domains & SSL** — Expiry D-day tracking, registrar, certificate type/issuer management
- **Contracts** — Maintenance, SLA, outsourcing contracts, quotation/contract file management

### 자산 지도 [Alpha] | Asset Map [Alpha]
- **인터랙티브 노드 그래프** — 자산 간 연결 관계를 시각적으로 매핑 (ReactFlow 기반)
- **8지점 핸들** — 상/하/좌/우 + 대각선 4개, 자유 방향 연결
- **연결 유형** — 데이터 흐름, 네트워크, 의존성, 인증 + 단방향/양방향/역방향/조건부
- **섹션 영역** — 노드 그룹핑, 드래그 편입/해제, 리사이즈
- **자산 팔레트** — 검색/필터로 필요한 자산만 캔버스에 추가
- **PII 흐름도** — 개인정보 생명주기별 자동 분류 (수집→저장→이용→파기)
- **뷰 전환** — 전체 / PII 흐름 / 네트워크 / 데이터 흐름
- **Interactive Node Graph** — Visually map asset relationships (ReactFlow-based)
- **8-Point Handles** — Top/bottom/left/right + 4 diagonals, free-direction connections
- **Connection Types** — Data flow, network, dependency, auth + uni/bi/reverse/conditional
- **Section Zones** — Node grouping, drag-in/out, resizable
- **Asset Palette** — Search/filter to add only needed assets to canvas
- **PII Flow Diagram** — Auto-classify by PII lifecycle (collection → storage → usage → destruction)
- **View Switching** — All / PII flow / Network / Data flow

### 조직 & 인력 | Organization & People
- **조직도** — 부서/팀 트리 구조, 드래그 앤 드롭 편집
- **정보보호 조직도** — CISO/CPO/담당자 체계 시각화 및 데이터 입력
- **구성원 관리** — 자산 배정/회수, 퇴직 처리 시 일괄 회수
- **직책별 CIA 자동매핑** — 업무명(직책) 기반 하드웨어 CIA 등급 자동 설정
- **Org Chart** — Department/team tree structure with drag & drop editing
- **Security Org Chart** — CISO/CPO/officer hierarchy visualization & data input
- **Employee Management** — Asset assignment/retrieval, bulk retrieval on offboarding
- **Title-CIA Auto Mapping** — Automatic hardware CIA rating based on employee position

### 비용 & 보고서 | Cost & Reports
- **대시보드** — 월별 비용 추이, 자산 유형/상태 분포 차트 (Recharts)
- **월별 보고서** — 자동 생성, Excel/PDF 내보내기, 이메일 발송
- **환율 계산기** — 다중 통화(KRW, USD, EUR, JPY, GBP, CNY) 비용 환산
- **Dashboard** — Monthly cost trends, asset type/status distribution charts (Recharts)
- **Monthly Reports** — Auto-generation, Excel/PDF export, email delivery
- **Currency Calculator** — Multi-currency (KRW, USD, EUR, JPY, GBP, CNY) cost conversion

### 보안 & 알림 | Security & Notifications
- **CIA 보안 등급** — 자산별 기밀성(C) / 무결성(I) / 가용성(A) 점수 평가
- **만료 알림** — Email / Slack 자동 알림 (D-70, D-30, D-15, D-7)
- **감사 로그** — 모든 자산 변경 이력 자동 기록
- **증적 관리** — Google Drive 연동, 월별 자산 스냅샷 자동 업로드
- **CIA Rating** — Per-asset Confidentiality / Integrity / Availability score assessment
- **Expiry Alerts** — Automatic Email / Slack notifications (D-70, D-30, D-15, D-7)
- **Audit Log** — Automatic tracking of all asset changes
- **Evidence Management** — Google Drive integration, automatic monthly asset snapshot upload

### 대량 등록 | Bulk Import
- **8종 CSV 임포트** — 라이선스, 조직원, 그룹, 할당, 시트, 클라우드, 도메인, 하드웨어
- **템플릿 다운로드** — 유형별 CSV 템플릿 제공 (한국어 Excel 호환 BOM)
- **검증 & 에러 리포트** — 행 번호 기반 에러 메시지, 사전 검증 후 트랜잭션 실행
- **8-Type CSV Import** — Licenses, employees, groups, assignments, seats, cloud, domains, hardware
- **Template Download** — Per-type CSV templates (Korean Excel compatible BOM)
- **Validation & Error Report** — Row-number based error messages, pre-validation before transaction

### 기타 | Others
- **다국어 지원** — 한국어, English, 日本語, 中文(简体), 中文(繁體), Tiếng Việt
- **인터랙티브 가이드** — 페이지별 투어 가이드로 온보딩 지원 (버튼 클릭 시 시작)
- **역할 기반 접근 제어** — ADMIN / USER 권한 분리
- **Google Drive 설정** — UI에서 서비스 계정 설정 (env 파일 불필요)
- **Multilingual** — Korean, English, Japanese, Simplified Chinese, Traditional Chinese, Vietnamese
- **Interactive Guide** — Per-page tour guides for user onboarding (starts on button click)
- **Role-based Access Control** — ADMIN / USER permission separation
- **Google Drive Config** — Service account setup via UI (no env file needed)

---

## 기술 스택 | Tech Stack

| 영역 / Area | 기술 / Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes, Server Actions |
| Database | PostgreSQL 16, Prisma 7 ORM |
| Auth | Session Cookie + bcryptjs |
| Charts | Recharts 3 |
| Asset Map | @xyflow/react (ReactFlow v12), dagre |
| Export | ExcelJS, @react-pdf/renderer |
| Notifications | Nodemailer (SMTP), Slack Webhook |
| Deployment | Docker Compose, AWS EC2 (ARM64) |
| Runtime | Node.js 20.x |

---

## 로컬 설치 가이드 | Local Installation Guide

> 아래 가이드는 **개발 환경 또는 사내 테스트 서버**에서 직접 실행하는 방법입니다.
> Docker를 사용하면 OS에 관계없이 동일하게 실행할 수 있습니다.

### 사전 요구사항 | Prerequisites

| 소프트웨어 | 버전 | 용도 |
|---|---|---|
| **Node.js** | 20.x | 앱 런타임 |
| **Docker** + **Docker Compose** | Docker 24+, Compose v2+ | PostgreSQL + 앱 컨테이너 |
| **Git** | 2.x | 소스코드 관리 |

---

### Windows 설치

#### 1단계: 필수 프로그램 설치

```powershell
# (A) Node.js 20 설치 — https://nodejs.org 에서 LTS 다운로드 후 설치
# 또는 winget으로 설치:
winget install OpenJS.NodeJS.LTS

# (B) Docker Desktop 설치 — https://www.docker.com/products/docker-desktop 에서 다운로드
# 설치 후 Docker Desktop을 실행하고, 시스템 트레이에 🐳 아이콘이 나타날 때까지 대기

# (C) Git 설치 (이미 있다면 건너뛰기)
winget install Git.Git
```

> **확인**: 새 터미널(PowerShell)을 열고 아래 명령으로 설치를 확인합니다.
> ```powershell
> node -v    # v20.x.x
> docker -v  # Docker version 24.x+
> git -v     # git version 2.x+
> ```

#### 2단계: 프로젝트 실행

```powershell
# 소스코드 다운로드
git clone https://github.com/kgg1226/asset-manager.git
cd asset-manager

# 환경변수 파일 생성
copy examples\.env.example .env
# .env 파일을 메모장으로 열어 필요 시 수정 (기본값으로도 동작)

# Docker로 실행 (PostgreSQL + 앱이 함께 시작됨)
docker-compose up -d --build

# 약 1~2분 후 접속
# http://localhost:8080
# 기본 계정: admin / changeme123
```

#### (선택) 로컬 개발 모드 (코드 수정 시)

```powershell
# PostgreSQL만 Docker로 실행
docker-compose up -d postgres

# 환경변수 수정: .env 파일에서 DATABASE_URL을 아래로 변경
# DATABASE_URL=postgresql://asset_manager:asset_manager_pass@localhost:5432/asset_manager

# 의존성 설치 → DB 초기화 → 개발 서버 시작
npm install
npx prisma db push
npx prisma db seed
npm run dev

# http://localhost:3000
```

---

### macOS 설치

#### 1단계: 필수 프로그램 설치

```bash
# (A) Homebrew가 없다면 먼저 설치
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# (B) Node.js 20 설치
brew install node@20
# PATH에 추가 (zsh 기준)
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# (C) Docker Desktop 설치 — https://www.docker.com/products/docker-desktop 에서 다운로드
# 또는 Homebrew로:
brew install --cask docker
# 설치 후 Docker Desktop 앱을 실행하고 🐳 아이콘이 메뉴바에 나타날 때까지 대기

# (D) Git (macOS에 기본 포함, 없으면)
brew install git
```

> **확인**:
> ```bash
> node -v    # v20.x.x
> docker -v  # Docker version 24.x+
> git -v     # git version 2.x+
> ```

#### 2단계: 프로젝트 실행

```bash
# 소스코드 다운로드
git clone https://github.com/kgg1226/asset-manager.git
cd asset-manager

# 환경변수 파일 생성
cp examples/.env.example .env
# 필요 시 .env 파일 수정 (기본값으로도 동작)

# Docker로 실행
docker-compose up -d --build

# 약 1~2분 후 접속
# http://localhost:8080
# 기본 계정: admin / changeme123
```

#### (선택) 로컬 개발 모드

```bash
docker-compose up -d postgres

# .env에서 DATABASE_URL 변경:
# DATABASE_URL=postgresql://asset_manager:asset_manager_pass@localhost:5432/asset_manager

npm install
npx prisma db push
npx prisma db seed
npm run dev

# http://localhost:3000
```

---

### Linux (Ubuntu/Debian) 설치

#### 1단계: 필수 프로그램 설치

```bash
# (A) Node.js 20 설치 (NodeSource 저장소 사용)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# (B) Docker + Docker Compose 설치
# Docker 공식 저장소 추가
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 현재 사용자를 docker 그룹에 추가 (sudo 없이 docker 실행 가능)
sudo usermod -aG docker $USER
# ⚠️ 터미널을 닫고 다시 열어야 그룹이 적용됩니다

# (C) Git
sudo apt-get install -y git
```

> **확인** (터미널 재시작 후):
> ```bash
> node -v     # v20.x.x
> docker -v   # Docker version 24.x+
> docker compose version  # Docker Compose version v2.x+
> git -v      # git version 2.x+
> ```

#### 2단계: 프로젝트 실행

```bash
git clone https://github.com/kgg1226/asset-manager.git
cd asset-manager

cp examples/.env.example .env
# 필요 시 .env 파일 수정

# docker compose (v2 명령어)
docker compose up -d --build

# http://localhost:8080
# 기본 계정: admin / changeme123
```

#### (선택) 로컬 개발 모드

```bash
docker compose up -d postgres

# .env에서 DATABASE_URL 변경:
# DATABASE_URL=postgresql://asset_manager:asset_manager_pass@localhost:5432/asset_manager

npm install
npx prisma db push
npx prisma db seed
npm run dev

# http://localhost:3000
```

---

### 실행 확인 & 문제 해결 | Troubleshooting

```bash
# 컨테이너 상태 확인
docker-compose ps

# 앱 로그 확인 (에러가 나면 여기서 원인 확인)
docker-compose logs -f app

# PostgreSQL 로그 확인
docker-compose logs -f postgres

# 전체 중지 후 재시작
docker-compose down
docker-compose up -d --build

# DB 초기화 (데이터 완전 삭제 후 재시작)
docker-compose down -v   # ⚠️ 모든 데이터 삭제
docker-compose up -d --build
```

| 증상 | 원인 & 해결 |
|---|---|
| `port 8080 already in use` | 다른 프로그램이 8080을 사용 중. `docker-compose.yml`에서 `8080:3000`의 `8080`을 다른 포트(예: `9090`)로 변경 |
| `Cannot connect to the Docker daemon` | Docker Desktop이 실행 중이 아님. Docker Desktop을 시작하세요 |
| `ECONNREFUSED ...postgres:5432` | PostgreSQL 컨테이너가 아직 시작 중. 30초 후 재시도 또는 `docker-compose logs postgres`로 확인 |
| 빌드 중 메모리 부족 (OOM) | RAM 4GB 이상 권장. Docker Desktop 설정에서 메모리 할당 늘리기 |

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

> SMTP/Slack/Google Drive 설정은 UI의 **설정 > 알림 설정** 또는 **증적 > 설정**에서도 가능합니다.
>
> SMTP/Slack/Google Drive can also be configured via **Settings > Notifications** or **Archives > Settings** in the UI.

### Google Drive 연동 (Service Account) | Google Drive Integration

월별 보고서(PDF/Excel)를 Google Drive에 자동 업로드하려면 Service Account가 필요합니다.

A Service Account is required to auto-upload monthly reports (PDF/Excel) to Google Drive.

**1단계 — Service Account 생성 | Step 1 — Create Service Account**

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **IAM & Admin > Service Accounts** 이동
4. **+ Create Service Account** 클릭
5. 이름 입력 (예: `asset-manager-gdrive`), 만들기
6. 역할은 건너뛰기 (Drive API만 사용)

**2단계 — 키 생성 | Step 2 — Generate Key**

1. 생성된 Service Account 클릭 → **Keys** 탭
2. **Add Key > Create new key > JSON** 선택
3. 다운로드된 JSON에서 `client_email`과 `private_key` 값 확인

**3단계 — Drive API 활성화 | Step 3 — Enable Drive API**

1. **APIs & Services > Library** 이동
2. "Google Drive API" 검색 → **Enable** 클릭

**4단계 — 공유 폴더 설정 | Step 4 — Share Folder**

1. Google Drive에서 보고서를 저장할 폴더 생성 (예: `AssetManager Reports`)
2. 해당 폴더를 **Service Account 이메일**과 공유 (편집자 권한)
   - `example@project.iam.gserviceaccount.com` → 편집자
3. 폴더 URL에서 **폴더 ID** 추출:
   - `https://drive.google.com/drive/folders/XXXXXX` → `XXXXXX`이 폴더 ID

**5단계 — 앱 설정 | Step 5 — Configure App**

방법 A: **UI 설정** (권장)
- **증적 관리 > Google Drive 설정** 페이지에서 입력:
  - Service Account Email: `client_email` 값
  - Private Key: JSON의 `private_key` 값 (BEGIN~END 전체)
  - Root Folder ID: 4단계에서 추출한 폴더 ID

방법 B: **환경변수**
```env
GOOGLE_CLIENT_EMAIL=example@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT=폴더_ID
```

> DB에 저장된 값이 환경변수보다 우선 적용됩니다. | DB values take precedence over environment variables.

> Private Key는 AES-256으로 암호화되어 DB에 저장됩니다. | Private Keys are stored encrypted (AES-256) in the database.

---

## 프로젝트 구조 | Project Structure

```
app/
  api/                 # API Routes
    admin/             #   User management, title-CIA mapping, archives, GDrive config
    assets/            #   Asset (cloud/hardware/domain) CRUD + assign/unassign
    asset-links/       #   Asset connection (AssetLink) CRUD
    asset-map/         #   Asset map graph data + views
    auth/              #   Authentication
    contracts/         #   Contract API
    cron/              #   Batch scheduler (renewal notify, offboarding, exchange rates)
    employees/         #   Employee API
    licenses/          #   License API
    org/               #   Organization & security org chart API
    reports/           #   Report generation API
    history/           #   Audit log API
  asset-map/           # Asset Map [Alpha] — interactive node graph
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
  admin/               # User management, title-CIA, archives, asset categories (ADMIN only)
  history/             # Audit log
  guide/               # User guide with interactive tours
  _components/         # Shared components (tour guide, CIA badge, top header, etc.)
lib/
  i18n/                # Internationalization (6 languages)
  prisma.ts            # Prisma client singleton
  auth.ts              # Authentication (session + bcryptjs)
  audit-log.ts         # Audit logging
  notification.ts      # Email & Slack notifications
  system-config.ts     # DB-backed encrypted config (SMTP, Slack, Google Drive)
  google-drive.ts      # Google Drive upload (service account)
  cost-calculator.ts   # Currency conversion & cost calculation
  csv-import.ts        # CSV import utilities
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
| `/history` | 변경 이력 / Change history |
| `/asset-map` | 자산 지도 [Alpha] / Asset Map [Alpha] |
| `/settings/groups` | 그룹 설정 / Group settings |
| `/settings/import` | CSV 가져오기 / CSV import |
| `/settings/notifications` | 알림 설정 / Notification settings |
| `/settings/profile` | 프로필 설정 / Profile settings |
| `/admin/users` | 사용자 관리 (ADMIN) / User management (ADMIN) |
| `/admin/title-cia` | 직책별 CIA 매핑 / Title-CIA mapping |
| `/admin/archives` | 증적 관리 / Evidence archives |
| `/guide` | 사용 가이드 / User guide |

---

## 배포 | Deployment

### Docker Compose (로컬/사내 서버)

```bash
# 빌드 & 실행 | Build & start
docker-compose up -d --build

# 로그 확인 | View logs
docker-compose logs -f app

# 중지 | Stop
docker-compose down
```

---

### AWS EC2 배포 가이드 (Step-by-Step)

> 이 가이드는 AWS를 처음 사용하는 분도 따라할 수 있도록 작성되었습니다.
> 전체 과정: **AWS 계정 설정 → EC2 생성 → S3 버킷 생성 → 배포 실행**

#### 전체 구조도

```
[내 PC]                        [AWS 클라우드]
   │                               │
   │  1. zip 업로드                 │
   ├──────────────────────────► [S3 버킷]
   │                               │
   │  2. SSM 세션 연결              │  3. zip 다운로드
   ├──────────────────────────► [EC2 서버] ◄────────┘
   │                               │
   │                               │  4. Docker 빌드 & 실행
   │                               │
   │  5. 브라우저 접속              │
   ├──────────────────────────► [http://EC2_IP:8080]
```

---

#### STEP 0: 내 PC에 필요한 프로그램 설치

| 프로그램 | 설치 방법 | 용도 |
|---|---|---|
| **AWS CLI v2** | [공식 다운로드](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) | AWS 서비스 조작 |
| **Session Manager Plugin** | [공식 다운로드](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) | EC2 원격 접속 (SSH 대체) |
| **Git** | [공식 다운로드](https://git-scm.com) | 소스코드 관리 |

설치 후 터미널에서 확인:
```bash
aws --version          # aws-cli/2.x.x
session-manager-plugin # Session Manager Plugin 설치 확인
git --version          # git version 2.x+
```

---

#### STEP 1: AWS CLI에 내 계정 연결하기

> AWS 콘솔(웹)에서 **IAM 사용자**를 만들고, **Access Key**를 발급받아야 합니다.

```bash
# AWS CLI에 프로필 등록
aws configure --profile my-asset-manager
# 아래 4가지를 차례로 입력:
#   AWS Access Key ID:     AKIA...  (IAM에서 발급받은 키)
#   AWS Secret Access Key: wJal...  (IAM에서 발급받은 시크릿)
#   Default region name:   ap-northeast-2  (서울 리전)
#   Default output format: json
```

> **IAM 사용자에게 필요한 권한** (AWS 콘솔 > IAM > 사용자 > 권한):
> - `AmazonEC2FullAccess` — EC2 관리
> - `AmazonS3FullAccess` — S3 파일 업로드/다운로드
> - `AmazonSSMFullAccess` — Session Manager로 EC2 접속

---

#### STEP 2: S3 버킷 만들기 (파일 저장소)

> S3 버킷은 배포 zip 파일을 임시로 보관하는 장소입니다.

1. [AWS 콘솔](https://console.aws.amazon.com) 로그인
2. 상단 검색창에 **S3** 입력 → S3 서비스로 이동
3. **버킷 만들기** 클릭
4. 설정:
   - **버킷 이름**: `my-company-deploy` (전세계에서 고유해야 함, 원하는 이름 사용)
   - **리전**: `아시아 태평양(서울) ap-northeast-2`
   - 나머지 설정은 기본값 그대로
5. **버킷 만들기** 클릭

```bash
# 터미널에서 확인
aws s3 ls --profile my-asset-manager
# 방금 만든 버킷이 보이면 성공
```

---

#### STEP 3: EC2 인스턴스 만들기 (서버)

1. AWS 콘솔 > 상단 검색 > **EC2** → EC2 대시보드
2. **인스턴스 시작** 클릭
3. 설정:

| 항목 | 값 | 설명 |
|---|---|---|
| 이름 | `asset-manager` | 서버 식별용 이름 |
| AMI | **Amazon Linux 2023** (ARM) | 운영체제 |
| 아키텍처 | **64비트 (Arm)** | ARM64 선택 |
| 인스턴스 유형 | **t4g.small** | vCPU 2개, RAM 2GB |
| 키 페어 | **키 페어 없이 진행** | SSM으로 접속하므로 불필요 |
| 네트워크 설정 | 보안 그룹에서 **8080 포트** 인바운드 허용 추가 | 웹 접속용 |
| 스토리지 | **20 GiB** gp3 | 기본 8GB는 부족, 20GB 권장 |
| IAM 인스턴스 프로파일 | `AmazonSSMManagedInstanceCore` 역할 연결 | SSM 접속 + S3 접근 |

4. **인스턴스 시작** 클릭
5. 인스턴스 목록에서 **인스턴스 ID** (예: `i-0abc1234def56789`) 를 메모

> **보안 그룹 설정** (인바운드 규칙 추가):
> | 유형 | 포트 | 소스 | 설명 |
> |---|---|---|---|
> | 사용자 지정 TCP | 8080 | 내 IP (또는 회사 IP 대역) | 앱 접속 |

---

#### STEP 4: EC2에 Docker 설치하기

```bash
# SSM으로 EC2에 접속
aws ssm start-session \
  --target i-0abc1234def56789 \
  --profile my-asset-manager \
  --region ap-northeast-2
```

EC2 터미널이 열리면:

```bash
# Docker 설치
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 설치 확인
docker --version
docker-compose --version

# 작업 디렉토리 생성
sudo mkdir -p /home/ssm-user/app
sudo chown -R ssm-user:ssm-user /home/ssm-user/app

# 스왑 메모리 설정 (RAM 2GB → 빌드 시 필요)
sudo dd if=/dev/zero of=/swapfile bs=128M count=16
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# 재부팅 후에도 유지
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# EC2 접속 종료
exit
```

---

#### STEP 5: 배포 설정 파일 만들기 (내 PC에서)

```bash
cd asset-manager

# deploy.ps1 설정 파일 복사
cp examples/deploy.ps1.example deploy.ps1

# 인프라 접속 정보 파일 복사
cp examples/.env.infra.example .env.infra
```

`deploy.ps1`을 편집기로 열어서 상단 설정 값을 수정:

```powershell
$PROFILE_NAME = "my-asset-manager"              # STEP 1에서 만든 프로필명
$REGION = "ap-northeast-2"                       # 서울 리전
$S3_BUCKET = "s3://my-company-deploy/asset-mgr"  # STEP 2에서 만든 버킷/경로
$EC2_ID = "i-0abc1234def56789"                   # STEP 3에서 메모한 인스턴스 ID
$REMOTE_DIR = "/home/ssm-user/app"               # EC2 내 배포 경로 (변경 불필요)
```

---

#### STEP 6: 배포 실행하기

##### 방법 A: 자동 배포 스크립트 (Windows PowerShell)

```powershell
# 프로젝트 루트에서 실행
.\deploy.ps1

# 스크립트가 자동으로:
#   [1/3] Git 커밋 & 푸시
#   [2/3] zip 생성 → S3 업로드
#   [3/3] SSM 세션 열기 + 배포 명령어 클립보드 복사
#
# SSM 세션이 열리면 Ctrl+V로 붙여넣기 → Enter
```

##### 방법 B: 수동 배포 (macOS/Linux)

```bash
# 1. 소스코드를 zip으로 압축
git archive --format=zip HEAD -o /tmp/asset-manager.zip

# 2. S3에 업로드
aws s3 cp /tmp/asset-manager.zip s3://my-company-deploy/asset-mgr/asset-manager.zip \
  --profile my-asset-manager --region ap-northeast-2

# 3. deploy-remote.sh도 S3에 업로드
aws s3 cp deploy-remote.sh s3://my-company-deploy/asset-mgr/deploy-remote.sh \
  --profile my-asset-manager --region ap-northeast-2

# 4. EC2에 접속
aws ssm start-session \
  --target i-0abc1234def56789 \
  --profile my-asset-manager \
  --region ap-northeast-2

# 5. EC2 터미널에서 배포 실행
cd /home/ssm-user/app
aws s3 cp s3://my-company-deploy/asset-mgr/deploy-remote.sh .
chmod +x deploy-remote.sh
bash deploy-remote.sh s3://my-company-deploy/asset-mgr/asset-manager.zip
```

---

#### STEP 7: 배포 확인

```bash
# EC2 터미널에서 확인
cd /home/ssm-user/app/asset-manager
sudo docker-compose ps         # 컨테이너 상태 (Up 확인)
sudo docker-compose logs -f app  # 앱 로그 확인
```

브라우저에서 접속:
```
http://<EC2의 퍼블릭 IP>:8080
```

> **EC2 퍼블릭 IP 확인**: AWS 콘솔 > EC2 > 인스턴스 > 해당 인스턴스 클릭 > **퍼블릭 IPv4 주소**

기본 로그인: `admin` / `changeme123`

---

#### 배포 후 운영 명령어 모음

```bash
# EC2에 접속
aws ssm start-session --target <인스턴스ID> --profile <프로필명> --region ap-northeast-2

# 앱 상태 확인
cd /home/ssm-user/app/asset-manager
sudo docker-compose ps

# 로그 보기 (실시간)
sudo docker-compose logs -f app

# 앱 재시작
sudo docker-compose restart app

# 전체 중지 후 재시작
sudo docker-compose down
sudo docker-compose up -d

# 재빌드 (코드 변경 후)
sudo docker-compose up -d --build
```

#### 배포 트러블슈팅

| 증상 | 원인 & 해결 |
|---|---|
| SSM 세션 연결 실패 | EC2에 `AmazonSSMManagedInstanceCore` IAM 역할이 연결되어 있는지 확인 |
| S3 업로드 실패 | AWS CLI 프로필 설정 확인 (`aws configure list --profile <프로필명>`) |
| 빌드 중 OOM (메모리 부족) | 스왑 설정 확인 (`free -h`). 스왑이 없으면 STEP 4의 스왑 설정 참고 |
| `port 8080 already in use` | 기존 컨테이너가 남아있음. `sudo docker-compose down` 후 재시작 |
| DB 연결 실패 | `sudo docker-compose logs postgres`로 PostgreSQL 상태 확인 |
| 브라우저 접속 불가 | EC2 보안 그룹에서 8080 포트 인바운드가 열려있는지 확인 |

> **참고**: 저사양 서버(RAM 2GB 이하)에서는 빌드 전 스왑 메모리를 확인하세요 (`free -h`).

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
