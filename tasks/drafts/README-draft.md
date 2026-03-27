<p align="center">
  <h1 align="center">Asset Manager</h1>
  <p align="center">
    회사의 모든 IT 자산을 한 곳에서 관리하세요.<br/>
    라이선스 · 클라우드 · 하드웨어 · 도메인 · 계약 — 하나의 대시보드.
  </p>
  <p align="center">
    <a href="#-5분-설치-가이드">5분 설치</a> ·
    <a href="#-주요-기능">주요 기능</a> ·
    <a href="#-스크린샷">스크린샷</a> ·
    <a href="#-기술-스택">기술 스택</a>
  </p>
</p>

---

## 이런 분들을 위해 만들었습니다

- 엑셀로 IT 자산을 관리하다가 한계를 느끼신 분
- ISMS-P 감사 때마다 자산 현황 정리에 야근하시는 분
- 유료 솔루션은 비싸고, 무료 대안을 찾고 계신 분
- 우리 회사 인프라 구조를 한눈에 보고 싶은 분

---

## 🚀 5분 설치 가이드

### 필요한 것

**Docker Desktop** 하나만 설치하면 됩니다. 다른 건 아무것도 필요 없습니다.

| 운영체제 | 다운로드 |
|---|---|
| Windows | [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) |
| Mac | [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/) |
| Linux | [Docker Engine 설치](https://docs.docker.com/engine/install/) |

> Docker가 뭔지 모르시나요? 걱정 마세요. 위 링크에서 설치 파일을 다운받아 실행하면 됩니다. "다음 → 다음 → 설치 완료" 수준입니다.

---

### 1단계: 프로젝트 다운로드

터미널(또는 명령 프롬프트)을 열고 아래를 복사해서 붙여넣기 하세요:

```bash
git clone https://github.com/YOUR_USERNAME/asset-manager.git
cd asset-manager
```

> **터미널 여는 법**
> - **Windows**: 시작 메뉴에서 "PowerShell" 검색 → 클릭
> - **Mac**: Spotlight(⌘+Space)에서 "터미널" 검색 → 클릭

> **git이 없다면?** [git-scm.com](https://git-scm.com)에서 설치하거나, GitHub에서 "Code → Download ZIP"으로 다운받아 압축을 푸세요.

---

### 2단계: 환경 설정

```bash
cp examples/.env.example .env
```

이 명령어는 설정 파일 템플릿을 복사합니다. **수정할 필요 없습니다** — 기본값으로 바로 실행됩니다.

---

### 3단계: 실행

```bash
docker-compose up -d
```

끝입니다. 이 한 줄이면 됩니다.

처음 실행하면 이미지를 다운받느라 2~3분 정도 걸릴 수 있습니다. 기다리세요.

---

### 4단계: 접속

브라우저를 열고 아래 주소로 이동하세요:

```
http://localhost:8080
```

로그인 화면이 나타나면 성공입니다!

| 항목 | 값 |
|---|---|
| 아이디 | `admin` |
| 비밀번호 | `.env` 파일의 `SEED_ADMIN_PASSWORD` 값 (기본: `changeme123`) |

> 첫 로그인 후 비밀번호를 변경하세요.

---

### 종료 & 재시작

```bash
# 종료
docker-compose down

# 다시 시작
docker-compose up -d
```

데이터는 Docker 볼륨에 저장되므로 종료해도 사라지지 않습니다.

---

### 문제가 생겼나요?

| 증상 | 해결 |
|---|---|
| `localhost:8080` 접속 안 됨 | Docker Desktop이 실행 중인지 확인하세요 (트레이 아이콘). `docker-compose logs`로 에러를 확인하세요. |
| `port 8080 already in use` | 다른 프로그램이 8080 포트를 사용 중입니다. `docker-compose.yml`에서 `8080:3000`을 `9090:3000`으로 바꾸고 `localhost:9090`으로 접속하세요. |
| 로그인 안 됨 | `docker-compose exec app npx prisma db seed`를 실행해서 관리자 계정을 다시 생성하세요. |

---

## 📋 주요 기능

### 자산 통합 관리

| 자산 유형 | 관리 항목 |
|---|---|
| **라이선스** | 키 관리, 시트 할당/반납, 갱신 추적, 비용 계산 |
| **클라우드** | AWS/GCP/Azure, 플랫폼·리전·사양, 구독 관리 |
| **하드웨어** | 14개 장비 유형, 시리얼·사양·IP, 감가상각·수명 게이지 |
| **도메인·SSL** | 도메인 등록, SSL 인증서, 자동 갱신 |
| **계약** | 유지보수·SLA·외주 계약, 만료 알림 |

### 자산 지도

인프라 구조를 시각적으로 관리합니다.
- **드래그 앤 드롭**으로 자산 배치
- **연결선**으로 자산 간 관계 표현 (데이터 흐름, 네트워크, 의존성)
- **섹션**으로 그룹화 (클라우드 인프라, 물리 장비, 사용자 장비 등)
- **개인정보 흐름** 뷰: 수집 → 저장 → 이용·제공 → 파기 추적
- PDF 내보내기

### ISMS-P 대응

- **CIA 보안 등급**: 자산별 기밀성/무결성/가용성 점수
- **정보자산 분류체계**: 대분류·소분류 체계
- **감사 로그**: 모든 변경 사항 자동 기록
- **월별 보고서**: Excel/PDF 자동 생성, 이메일 발송

### 6개 국어 지원

한국어 · English · 日本語 · 中文 · Tiếng Việt · 繁體中文

헤더의 언어 버튼 하나로 전체 UI가 전환됩니다.

### 그 외

- **대시보드**: 비용 추이, 유형 분포, 만료 임박 위젯
- **조직 관리**: 회사·부서 계층 구조, 조직도
- **CSV 대량 임포트**: 라이선스, 조직원, 하드웨어 등 8개 유형
- **공개 열람 모드**: 비인증 사용자도 읽기 가능 (쓰기만 인증 요구)

---

## 📸 스크린샷

> TODO: 실제 스크린샷 추가

| 화면 | 설명 |
|---|---|
| 대시보드 | 비용 추이 차트, 자산 요약, 만료 임박 알림 |
| 자산 지도 | 인프라 시각화, 섹션별 그룹화, 연결선 |
| 하드웨어 목록 | 수명 게이지, 상태 필터, CIA 등급 |
| 개인정보 흐름 | 수집→저장→이용·제공→파기 흐름도 |
| 6개 국어 | 언어 전환 데모 |

---

## 🛠 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) |
| ORM | Prisma 7 |
| 데이터베이스 | PostgreSQL 16 |
| 스타일링 | Tailwind CSS 4 |
| 인프라 시각화 | React Flow |
| 차트 | Recharts |
| 인증 | 세션 쿠키 + bcrypt (자체 구현) |
| 배포 | Docker Compose |
| 다국어 | React Context (6개 국어) |

---

## 📊 프로젝트 규모

| 항목 | 수치 |
|---|---|
| API 엔드포인트 | 62개+ |
| 페이지 | 35개+ |
| DB 모델 | 30개+ |
| 지원 언어 | 6개 |
| 배치 작업 | 6개 |

---

## 🔒 보안

- 세션 기반 인증 (bcrypt 해싱)
- 역할 기반 접근 제어 (ADMIN / USER)
- 로그인 브루트포스 방어
- API Rate Limiting
- 모든 변경 감사 로그 기록
- 폐쇄망 지원 (외부 CDN 의존 없음)

---

## 🤝 기여하기

이슈, 버그 리포트, 기능 제안, PR 모두 환영합니다.

1. 이 저장소를 Fork 합니다
2. 기능 브랜치를 만듭니다 (`git checkout -b feature/my-feature`)
3. 변경 사항을 커밋합니다 (`git commit -m 'Add my feature'`)
4. 브랜치에 Push 합니다 (`git push origin feature/my-feature`)
5. Pull Request를 생성합니다

---

## 📄 라이선스

[MIT License](LICENSE) — 자유롭게 사용, 수정, 배포할 수 있습니다.
