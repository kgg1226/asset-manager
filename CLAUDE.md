# Asset Manager

## 프로젝트 개요
사내 **정보자산 통합 관리** 웹 앱 — 소프트웨어 라이선스·클라우드 구독·하드웨어·도메인 등 회사의 모든 자산을 등록·배정·회수하고, 월별 비용 및 자산 추가/변경/삭제 이력 보고서를 내보낸다.
- 스택: Next.js 15 App Router + Prisma 7 + PostgreSQL(자체 호스팅/Docker) + Tailwind CSS 4
- 인증: 자체 구현 (세션 쿠키 + bcryptjs), 역할: ADMIN / USER
- DB: PostgreSQL (Docker 컨테이너 또는 EC2 호스팅), Prisma 클라이언트 출력 경로 → `generated/prisma/`
- 배포: Docker Compose, AWS EC2 (ARM64), 단방향 폐쇄망
- 포트: 호스트 8080 → 컨테이너 3000

## 세션 역할 체제
이 프로젝트는 4개 역할로 분리 운영된다:
- 🎯 기획: `/planning` 으로 진입
- 💻 개발(FE+BE 통합): `/frontend` 또는 `/backend` 으로 진입
- 🔧 DevOps: `/devops` 으로 진입
- 🔒 보안: `/security` 으로 진입

역할 진입 전에는 코드를 수정하지 않는다.
보안 세션이 `tasks/security/guidelines.md`를 업데이트하면, 다른 역할 세션은 작업 전 반드시 확인한다.

---

## 브랜치 전략 (충돌 방지)

### 장기 운영 브랜치 구조
```
master             ← 배포 기준. PR 머지만 허용, 직접 커밋 금지
  ├── role/planning   ← 기획 전담
  ├── role/dev        ← 개발 전담 (FE+BE 통합)
  ├── role/devops     ← DevOps 전담
  └── role/security   ← 보안 전담
```

### 파일 소유권 (엄격 준수 — 충돌 방지 핵심)

| 역할 | 소유 경로 | 절대 수정 금지 |
|---|---|---|
| **기획** | `tasks/` (security/ 제외), `CLAUDE.md` | 코드 파일 일체 |
| **개발** | `app/`, `lib/`, `prisma/schema.prisma`, `prisma.config.ts`, `public/`, `hooks/` | `tasks/` |
| **DevOps** | `dockerfile`, `docker-compose*.yml`, `deploy.ps1`, `deploy.sh`, `.github/` | `tasks/`, 코드 파일 |
| **보안** | `tasks/security/` | 그 외 모든 파일 |

> ⚠️ 경계를 넘으면 반드시 머지 충돌 발생. 경계를 넘어야 할 때는 기획에 먼저 알린다.

### 작업 흐름
```
1. 역할 브랜치 체크아웃     git checkout role/<역할>
2. master 최신 동기화       git merge master  (또는 필요 시 git rebase master)
3. 담당 파일만 수정·커밋
4. PR 생성                  role/<역할> → master
5. 머지 후 동기화           git merge master (다른 역할 브랜치에서)
```

### 절대 금지
- `master`에 직접 커밋 금지
- 다른 역할 소유 파일 수정 금지

### rebase 사용 지침
- 기본: `git merge master` 권장 (히스토리 보존)
- rebase 허용: 커밋 정리·PR 전 히스토리 클린업 목적으로 필요 시 사용
- rebase 후 force push 필요 시: `git push --force-with-lease` 사용 (`--force` 금지)

---

## 세션 시작 절차 (필수)
모든 역할 세션은 작업 전 아래 순서를 반드시 따른다.

### 1단계 — 최신 상태 동기화
```bash
git fetch origin
git checkout role/<내역할>
git merge master   # 또는 필요 시: git rebase master
```

### 2단계 — 필수 문서 확인 (순서대로)
1. `tasks/current-state.md` — **현재 완료 현황, 구현된 API 목록**
2. `tasks/todo.md` — 잔여 작업 목록
3. `tasks/security/guidelines.md` — 보안 규칙
4. 역할별 추가 참조:
   - 개발: `tasks/api-spec.md`, `tasks/db-changes.md`
   - DevOps: `.env.infra` (Git 미추적, 로컬 전용)

### 3단계 — 다른 역할 코드 확인 (필요 시)
```bash
# 개발 브랜치의 특정 파일 확인
git show role/dev:app/api/org/units/route.ts

# 개발 브랜치 변경 파일 목록
git diff master...role/dev --stat
```

---

## 필수 참조 파일
- **최우선**: `tasks/current-state.md` — 실제 완료 현황
- 작업 전: `tasks/todo.md`, `tasks/lessons.md`
- 코드 작성 전: `tasks/security/guidelines.md` 보안 규칙 확인
- **에러 해결 후**: `tasks/lessons.md`에 반드시 기록 (원인 + 해결 + 예방책)
- API 구현/호출: `tasks/api-spec.md` 준수
- DB 변경: `tasks/db-changes.md` 참조
- 인프라 접속 정보: `.env.infra` 참조 (Git 미추적, 로컬 전용)

> ⚠️ **에러 기록 의무**: 빌드 에러, 런타임 에러, 머지 충돌 등 **모든 에러를 해결한 후** 반드시 `tasks/lessons.md`에 날짜·원인·해결책을 기록한다. 역할 무관, 모든 세션이 준수해야 한다.

## 데이터베이스 연결 설정

### Docker Compose 사용 (권장)
```bash
# 로컬 개발 또는 EC2 배포
docker-compose up -d

# PostgreSQL + app이 동시에 시작되고, 자동으로 연결됨
# DATABASE_URL: postgresql://asset_manager:asset_manager_pass@postgres:5432/asset_manager
```

### 환경변수 (DATABASE_URL)
**docker-compose 사용 시:** 자동으로 `postgres` 서비스명으로 연결
```
DATABASE_URL=postgresql://asset_manager:asset_manager_pass@postgres:5432/asset_manager
```

**EC2 호스트에서 직접 실행 시:** 호스트 IP 사용
```
DATABASE_URL=postgresql://asset_manager:asset_manager_pass@172.17.0.1:5432/asset_manager
```

**로컬 localhost 테스트:**
```
DATABASE_URL=postgresql://asset_manager:asset_manager_pass@localhost:5432/asset_manager
```

### Prisma 스키마
- provider: `postgresql` (schema.prisma 라인 11)
- url: `env("DATABASE_URL")` 환경변수에서 자동 읽음
- 마이그레이션: `npx prisma db push`
- Seed: `npx prisma db seed`

## 프로덕션 배포 고려사항
- 배포 환경: AWS EC2 t4g.small (ARM64, vCPU 2, RAM 2GB), ap-northeast-2
- 단방향 폐쇄망 (내부→외부 접근 가능, 외부→내부 접근 불가)
- 배포 방식: `deploy.ps1` 실행 → **[1/2] git push** + **[2/2] S3 업로드**까지 자동, EC2 배포는 출력된 명령어를 수동 실행
  - S3에 zip 업로드 후 EC2에서 `deploy-remote.sh <S3_URL>` 실행
  - 접속 정보: `.env.infra` 참조 (Git 미추적)
- 포트: 로컬 dev `3000` / 컨테이너 `3000` / 호스트 `8080`
- ⚠️ 배포 전 반드시 master 클린 상태 확인 (`deploy.ps1`은 master 브랜치에서만 실행 가능)
- 프로덕션 컨테이너에서 `prisma CLI` 실행 금지
- DB 스키마 변경: `npx prisma db push` 사용 (PostgreSQL용)
- `prisma generate` 결과물은 `generated/prisma/`에 위치 (`lib/prisma.ts`에서 import)

---

## 실제 디렉토리 구조
```
app/
  api/               ← API Route (개발 전담)
    admin/           ← 사용자 관리 API
    assets/          ← 자산(클라우드/하드웨어/도메인) API
    assignments/     ← 할당 API
    auth/            ← 인증 API
    contracts/       ← 계약 API
    cron/            ← 배치/스케줄러 API
    employees/       ← 구성원 API
    groups/          ← 그룹 API
    history/         ← 감사 로그 API
    licenses/        ← 라이선스 API
    org/             ← 조직 API
    seats/           ← 시트 API
  _components/       ← 공통 컴포넌트
  admin/             ← 사용자 관리 페이지
  cloud/             ← 클라우드 자산 페이지
  contracts/         ← 계약 관리 페이지
  dashboard/         ← 대시보드
  domains/           ← 도메인·SSL 페이지
  employees/         ← 조직원 페이지
  hardware/          ← 하드웨어 자산 페이지
  history/           ← 감사 로그 페이지
  licenses/          ← 라이선스 페이지
  login/             ← 로그인
  org/               ← 조직도
  reports/           ← 보고서
  settings/          ← 설정 (그룹/CSV가져오기/알림/프로필)
  layout.tsx
  page.tsx           ← / → /licenses 리다이렉트
lib/
  auth.ts            ← 인증 (세션/bcrypt)
  prisma.ts          ← Prisma 클라이언트 singleton
  audit-log.ts       ← 감사 로그 기록
  i18n/              ← 다국어 지원 (KO/EN/JA/ZH/VI/ZH-TW)
  cia.ts             ← CIA 보안 등급
  assignment-actions.ts
  cost-calculator.ts
  csv-import.ts
  license-seats.ts
  notification.ts    ← Slack/Email 발송 (nodemailer)
  rate-limit.ts      ← 로그인 브루트포스 방어
prisma/
  schema.prisma      ← DB 스키마 정의 (PostgreSQL)
  seed.ts
prisma.config.ts     ← Prisma 설정 (루트)
generated/
  prisma/            ← Prisma 클라이언트 (자동 생성, 수정 금지)
dockerfile
docker-compose.yml   ← PostgreSQL + app 정의
deploy.ps1           ← EC2 배포 스크립트 (Windows PowerShell)
.github/
  workflows/         ← CI/CD
tasks/               ← 기획/보안/운영 문서 전체
examples/
  .env.example       ← 환경변수 템플릿
  .env.infra.example ← 인프라 접속 정보 템플릿
  deploy.ps1.example ← 배포 스크립트 예시
```

## 주요 페이지 경로
| 경로 | 설명 |
|---|---|
| `/` | `/licenses`로 리다이렉트 |
| `/login` | 로그인 |
| `/dashboard` | 대시보드 |
| `/licenses` | 라이선스 목록 |
| `/licenses/new` | 라이선스 등록 |
| `/licenses/[id]` | 라이선스 상세 |
| `/licenses/[id]/edit` | 라이선스 수정 |
| `/cloud` | 클라우드 자산 목록 |
| `/cloud/new` | 클라우드 자산 등록 |
| `/cloud/[id]` | 클라우드 자산 상세 |
| `/cloud/[id]/edit` | 클라우드 자산 수정 |
| `/hardware` | 하드웨어 자산 목록 |
| `/hardware/new` | 하드웨어 자산 등록 |
| `/hardware/[id]` | 하드웨어 자산 상세 |
| `/hardware/[id]/edit` | 하드웨어 자산 수정 |
| `/domains` | 도메인·SSL 목록 |
| `/domains/new` | 도메인·SSL 등록 |
| `/domains/[id]` | 도메인·SSL 상세 |
| `/domains/[id]/edit` | 도메인·SSL 수정 |
| `/contracts` | 계약 목록 |
| `/contracts/new` | 계약 등록 |
| `/contracts/[id]` | 계약 상세 |
| `/contracts/[id]/edit` | 계약 수정 |
| `/employees` | 조직원 목록 |
| `/employees/new` | 조직원 등록 |
| `/employees/[id]` | 조직원 상세 |
| `/reports` | 월별 보고서 |
| `/reports/[yearMonth]` | 보고서 상세 |
| `/settings/groups` | 그룹 목록 |
| `/settings/import` | CSV 가져오기 |
| `/settings/notifications` | 알림 설정 |
| `/settings/profile` | 프로필 설정 |
| `/org` | 조직도 |
| `/history` | 감사 로그 |
| `/admin/users` | 사용자 관리 (ADMIN 전용) |
| `/guide` | 사용 가이드 |

## 폐쇄망 제약
- 런타임에 외부 URL 호출 금지
- 외부 CDN 의존 금지 (Google Fonts 등 포함)
- 모든 라이브러리는 `npm install`로 번들에 포함

## 빌드 주의사항
- EC2 ARM64, RAM 제한 환경 — 빌드 전 스왑 확인 필수 (`free -h`)
- 프로덕션 컨테이너에서 `prisma CLI` 실행 금지
- DB 스키마 변경: `npx prisma db push` 사용
- `prisma generate` 결과물은 `generated/prisma/`에 위치 (`lib/prisma.ts`에서 import)

---

## UX/개발 개선 원칙 (자동 적용)

코드 작성·수정 시 아래 원칙을 **매번 자동으로 점검**한다. 사용자가 개별 지시하지 않아도 해당 사항이 발견되면 자체 적용한다.

### 1. 명확한 의도
- 버튼·아이콘·라벨은 **클릭하면 무엇이 일어나는지** 즉시 이해 가능해야 한다
- 같은 기능인데 다른 아이콘/이름을 쓰지 않는다 (예: 폴더 아이콘 vs 페이지 아이콘 혼용 금지)
- 시스템 내부 용어(model명, API명)를 UI에 노출하지 않는다

### 2. 용어 일관성
- 한번 정한 용어는 UI·코드·문서 전체에서 통일한다
- 새 기능 추가 시 기존 용어와 충돌하는지 확인한다
- i18n 키 이름과 표시 텍스트가 괴리되지 않게 한다

### 3. 빈 상태 처리
- 새로 생성된 항목은 **빈 상태(blank slate)**로 시작한다 — 불필요한 기본 데이터 자동 삽입 금지
- 빈 상태에서는 **무엇을 해야 하는지** 안내 텍스트 또는 온보딩을 제공한다
- 온보딩/예시 데이터는 사용자 선택에 의해서만 생성하고, 업데이트 시 기존 데이터에 영향 없어야 한다

### 4. 날짜·범위 명시
- "날짜" 단독 라벨 금지 → "시작일" / "종료일" / "만료일" 등 의미를 명시한다
- 날짜 범위 필터는 두 필드를 구분 라벨로 표시한다
- 날짜 관련 필드는 6개 언어 i18n을 반드시 포함한다

### 5. 수명 시각화
- 구매일·만료일이 있는 모든 자산에 **수명 게이지**를 표시한다
- 목록 페이지: 인라인 게이지 (`LifecycleGaugeInline`)
- 상세 페이지: 풀 게이지 (`LifecycleGauge`, 날짜·임계치 포함)
- 새 자산 유형 추가 시 게이지 적용을 함께 한다

### 6. 자동 계산
- 사용자 입력으로 파생 가능한 값은 자동 계산한다 (예: 구매일 + 내용연수 → 만료일)
- 자동 계산 결과는 즉시 UI에 미리보기로 반영한다
- 사용자가 수동 오버라이드할 수 있게 한다

### 7. i18n 완전성
- 새 UI 텍스트 추가 시 **6개 언어(KO/EN/JA/ZH/ZH-TW/VI) + types.ts**를 반드시 동시에 수정한다
- 하드코딩된 한국어 문자열을 발견하면 i18n 키로 전환한다

### 8. 작업 공간 넓히기
- 도면·편집기 등 **작업 영역을 좁히는 패널**은 기본 숨김으로 설정한다
- 토글 버튼으로 열고 닫을 수 있게 한다
- 작업 영역이 전체 폭을 차지하는 것이 기본 상태다

### 9. 미래 확장성
- 당장 구현하지 않는 기능이라도 **DB 필드·API 스텁**을 미리 준비해둔다
- 스텁 API는 501 상태 + 향후 구현 방향을 주석으로 남긴다
- 확장 가능한 구조(enum 대신 string, JSON 필드 등)를 선택한다

### 10. 알림·모니터링
- 날짜 기반 자산에는 **수명 임계치 알림(50%/80%/95%)**을 자동 적용한다
- 기존 D-day 알림(D-70/30/15/7)과 임계치 알림은 **중복 발송하지 않는다**
- 새 자산 유형 추가 시 크론 알림 대상에 자동 포함되는지 확인한다
