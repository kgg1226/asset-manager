# License Manager

사내 소프트웨어 라이선스 관리 웹 앱.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| ORM | Prisma 7 + better-sqlite3 |
| DB | SQLite (파일 기반) |
| 스타일 | Tailwind CSS 4 |
| 인증 | 세션 쿠키 + bcryptjs |
| 배포 | Docker → AWS EC2 (ARM64, 폐쇄망) |

## 시작하기

```bash
# 의존성 설치
npm install

# Prisma 클라이언트 생성
npx prisma generate

# 개발 서버 실행
npm run dev
```

http://localhost:3000 으로 접속.

## 주요 기능

- 라이선스 등록 / 조회 / 수정 / 삭제
- 직원별 라이선스 할당 관리
- 조직도 계층 구조 (회사 → 조직 → 하위조직)
- CSV 일괄 가져오기 (라이선스, 직원, 할당)
- 라이선스 그룹 관리
- 감사 로그 (AuditLog)
- 갱신 주기 자동 계산 (Phase 1)
- 알림 발송 기록 (Phase 1)
- 문서 관리 - 계약서/견적서 (Phase 2, WIP)
- 월간 보고서 이력 (Phase 3, WIP)

## 프로젝트 구조

```
app/                  # Next.js App Router 페이지 및 API
  api/                # API 라우트
  admin/              # 관리자 페이지
  employees/          # 직원 관리
  licenses/           # 라이선스 관리
  org/                # 조직도
  settings/           # 설정 (가져오기 등)
lib/                  # 서버 사이드 로직
  auth.ts             # 인증/세션 관리
  db.ts               # Prisma 클라이언트
  renewal.ts          # 갱신 주기 계산
  audit.ts            # 감사 로그
prisma/
  schema.prisma       # DB 스키마
  prisma.config.ts    # Prisma 7 설정
  migrations/manual/  # 수동 SQL 마이그레이션
tasks/                # 5세션 분리 체제 작업 문서
  api-spec.md         # API 계약서
  todo.md             # 작업 체크리스트
  security/           # 보안 가이드라인 및 위협 모델
  postmortem/         # 에러 사전
```

## 환경변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | SQLite DB 경로 | `file:./dev.db` |
| `SECURE_COOKIE` | HTTPS 쿠키 사용 여부 | `false` (HTTP 환경) |
| `NODE_ENV` | 실행 환경 | `production` |

## 배포

Docker 기반. 상세 배포 절차는 DevOps 세션(/project:devops) 참조.

```bash
docker compose up -d
```

- 외부 포트: 80 → 컨테이너 포트: 3000
- DB 파일: 호스트 볼륨 마운트

## 5세션 분리 체제

이 프로젝트는 Claude Code를 활용한 5개 역할 분리 체제로 운영됩니다.

| 역할 | 진입 명령 | 담당 |
|------|-----------|------|
| 🎯 기획 | `/project:planning` | 요구사항, API 스펙, DB 변경 명세 |
| 🎨 프론트엔드 | `/project:frontend` | UI/UX, 컴포넌트, 클라이언트 로직 |
| ⚙️ 백엔드 | `/project:backend` | API, 비즈니스 로직, Prisma |
| 🔧 DevOps | `/project:devops` | Docker, 배포, 인프라 |
| 🔒 보안 | `/project:security` | 보안 리뷰, 가이드라인, 위협 모델 |

자세한 규칙은 `CLAUDE.md` 참조.
