# 📍 현재 프로젝트 상태

> 🎯 **Planning Role**이 관리합니다. 다른 모든 Role은 **작업 시작 전 반드시 읽으세요.**
>
> **📚 먼저 읽어야 할 문서**: [`tasks/README.md`](README.md) → [`tasks/VISION.md`](VISION.md) → [`tasks/TICKETS.md`](TICKETS.md)
>
> 최종 업데이트: 2026-03-15 (역할 체계 개편: FE+BE 통합 → Dev)

---

## 역할 체계 (4역할)

| 역할 | 브랜치 | 소유 파일 |
|---|---|---|
| 🎯 기획 | `role/planning` | `tasks/`, `CLAUDE.md` |
| 💻 개발 (FE+BE 통합) | `role/dev` | `app/`, `lib/`, `prisma/`, `hooks/`, `public/` |
| 🔧 DevOps | `role/devops` | `dockerfile`, `docker-compose*`, `deploy.*`, `.github/` |
| 🔒 보안 | `role/security` | `tasks/security/` |

## 브랜치 현황

| 브랜치 | 상태 | 내용 |
|---|---|---|
| `master` | 기준 브랜치 | Phase 1~5 + i18n + 하드웨어 확장 (PR #59까지 머지) |
| `role/planning` | 운영 중 | 기획 문서 전담 |
| `role/dev` | 신설 예정 | 개발 전담 (FE+BE 통합) |
| `role/devops` | 운영 중 | 배포/인프라 전담 |
| `role/security` | 운영 중 | 보안 문서 전담 |

> 오픈 PR: **0개**

---

## 🎯 현재 상태 요약

### 달성률: **97%** (Phase 1~5 기준)

| Phase | 상태 | 비고 |
|---|---|---|
| **Phase 1** — 라이선스 관리 | ✅ 완료 | |
| **Phase 2** — PostgreSQL 전환 + 자산 확장 | ✅ 완료 | |
| **Phase 3** — 보고서 API + UI + 계층 구조 | ✅ 완료 | |
| **Phase 4** — 증적/환율/자산카테고리 | ✅ 완료 | |
| **Phase 5** — UX 개선 + 자산 고도화 | ✅ 완료 | |
| **i18n** — 6개 언어 다국어 지원 | ✅ 완료 | KO/EN/JA/ZH/VI/ZH-TW |
| **자산 분류** — 정보자산 분류기준 적용 | ✅ 완료 | 하드웨어 14개 장비 유형 |
| **CIA 등급** — 기밀성/무결성/가용성 | ✅ 완료 | 자산별 CIA 점수 |
| **공개 열람** — 비인증 읽기 모드 | ✅ 완료 | |
| **EC2 배포** | ⏳ 대기 | 사람이 직접 실행 |

### 🔴 미완료 항목 (잔여 3%)

| 항목 | 유형 | 상세 |
|---|---|---|
| Google Drive OAuth | 인프라 | 코드 완료, 환경변수 미설정 |
| EC2 배포 | 인프라 | Docker 설정 완료, 수동 실행 대기 |
| 목록 API 페이지네이션 | Dev | `/api/licenses`, `/api/assignments` 등 |

---

## master에 반영된 기능 (구현 완료)

### 인증 & 공개 열람
- 로그인 / 로그아웃 (세션 쿠키 기반)
- 역할 기반 접근 제어 (ADMIN / USER)
- **공개 열람 모드**: 비인증 사용자도 모든 페이지 읽기 가능, 쓰기만 인증 요구
- `useAuth()` hook — 클라이언트 컴포넌트 인증 상태 확인
- `mustChangePassword` 강제 비밀번호 변경 UI
- 로그인 브루트포스 방어

### 라이선스 관리 (Phase 1)
- 라이선스 CRUD (KEY_BASED / VOLUME / NO_KEY)
- 시트(개별 키) 등록·수정, 중복 검사
- 할당 / 반납 / 삭제
- 라이선스 그룹 (기본 그룹 자동 할당)
- 갱신 상태/이력/날짜 관리
- 담당자(Owner) 관리
- **계층 구조 (parentId)**: 부모-자식 관계 + UI 트리 표시

### 자산 관리 (Phase 2 + 5)
- 클라우드: `/cloud` (목록/등록/상세/수정)
- 하드웨어: `/hardware` (14개 장비 유형, 하위분류, 감가상각)
- 도메인·SSL: `/domains` (목록/등록/상세/수정)
- 계약: `/contracts` (목록/등록/상세/수정)
- CIA 보안 등급 (기밀성/무결성/가용성)

### 다국어 지원 (i18n)
- 6개 언어: 한국어, English, 日本語, 中文, Tiếng Việt, 繁體中文
- React Context 기반, lazy-load 번역
- 모든 페이지 + 사이드바 + 헤더 적용

### 하드웨어 장비 분류 (정보자산 분류기준)
- 14개 장비 유형: Laptop, Desktop, Server, Network, Mobile, Monitor, Peripheral, SecurityDevice, Storage, Backup, Rack, Component, Facility, Other
- SecurityDevice 하위: Firewall, IDS, IPS, VPN, WAF, Antivirus, NAC, DLP
- Storage 하위: SAN, NAS, StorageDevice
- 보증/구매/네트워크 인프라 상세 필드

### 조직 관리
- 부서(OrgUnit) CRUD + 트리 구조
- **회사(Company) CRUD**
- 조직도 UI

### 보고서 (Phase 3)
- 월별 보고서 API: 데이터 집계, Excel, PDF, Email 발송
- 보고서 UI: `/reports`, `/reports/[yearMonth]`, `/reports/settings`

### 증적/환율/자산카테고리 (Phase 4)
- 증적(Archive) CRUD + Export + Google Drive 업로드
- 환율(ExchangeRate) CRUD + 자동 동기화
- 자산카테고리(AssetCategory) CRUD
- ADMIN 전용 UI: `/admin/archives`, `/admin/exchange-rates`, `/admin/asset-categories`

### 기타
- 대시보드 차트 (비용 추이, 유형 분포, 누적 성장, 만료 임박 위젯)
- 감사 로그 조회 `/history`
- CSV 임포트 (라이선스, 조직원, 그룹, 배정)
- 조직원 CRUD + 퇴사 처리 (7일 유예)
- 사용 가이드 `/guide`
- 프로필 설정 `/settings/profile`
- 알림 설정 `/settings/notifications`

---

## 📊 구현 현황 수치 (2026-03-15 기준)

| 항목 | 수치 |
|---|---|
| API 라우트 | 62개+ |
| DB 모델 | 15개+ |
| 페이지 | 35개+ |
| 지원 언어 | 6개 |
| 배치 작업 | 6개 |

---

## 📚 문서 가이드

| Role | 참고 문서 |
|---|---|
| **Planning** | `tasks/VISION.md`, `tasks/TICKETS.md` |
| **Dev** | `tasks/TICKETS.md`, `tasks/api-spec.md`, `hooks/useAuth.ts` |
| **DevOps** | `CLAUDE.md`, `tasks/troubleshooting.md` |
| **Security** | `tasks/security/guidelines.md` |
