# Security Report — 2026-06-02 (dev-025)

## [STATUS] PASSED (순보안 개선)

내용연수·감가상각 노출 정책(dev-022)을 서버 페이로드에서 강제. 화면 게이팅만 있던 잔여 갭을 닫음.

## 스캔 항목

### 1. 의존성 취약점 (npm audit --audit-level=high)
- 13건 (high 3 / moderate 10) — **기존 베이스라인과 동일, 본 티켓 의존성 미변경**. 범위 외.

### 2. 하드코딩 시크릿 (app/ lib/)
- 결과: 없음 ✅

### 3. 변경 라우트 인증/노출
- GET /api/assets, GET /api/assets/[id]: `getCurrentUser()` + `isLifecycleVisible()` 로 라이프사이클 필드
  마스킹 추가. 미인증/비권한은 **fail-closed**(usefulLifeYears·감가상각 monthlyCost = null).
- PUT /api/assets/[id]: 비권한 ADMIN 이 마스킹된 값으로 내용연수를 덮어쓰지 못하게 **데이터 손실 방지 가드** 추가.
- feature-flags: 판정 로직을 헬퍼로 단일화(동작 동일).

## 변경으로 닫은 갭
- 비-SUPER_ADMIN(+flag off) 가 네트워크 탭/직접 호출로 raw 응답의 내용연수·감가상각을 열람하던 경로 차단.

## 발견 사항 (기존·범위 외 — 후속 권고)
- 🟡 **활성 미들웨어 없음** (`middleware-manifest.json` 비어 있음). GET /api/assets·[id] 에 401 게이트가
  없어 라우트 단독으로는 인증 비강제(자산명/시리얼/IP 등 노출 가능). 단, 사내망·EC2 보안그룹(IP 제한)으로
  네트워크 계층 완화 추정. **dev-026 후속에서 GET 인증 게이트 도입 검토 권고.** (본 변경으로 라이프사이클
  필드만큼은 미인증 시에도 fail-closed 처리됨.)
- 🟡 npm audit high 3건(기존 transitive deps) — 의존성 정리 별도 티켓 권고.

---

# Security Report — 2026-04-27 (dev-007)

## [STATUS] PASSED

## 스캔 항목

### 1. 의존성 취약점 (npm audit --audit-level=high)

- high+ 심각도: 없음
- moderate: 9건 (이전 베이스라인과 동일, dev-only deps — 본 티켓에서 의존성 미변경)

### 2. 하드코딩 시크릿 (변경 코드)

- `app/hardware/page.tsx`: 없음 ✅
- 디자인 레퍼런스 (`preview/`, `ui_kits/`): Next.js 빌드/번들 미포함 — 런타임 미영향
- `ui_kits/asset-manager/index.html` 데모 스크립트에 `admin / changeme123` 더미 자격 증명 존재
  → 정적 HTML 데모 파일 (브라우저에서 단독 오픈)이며 실제 인증 시스템과 분리되어 위험 없음
  → 추후 데모 파일 외부 공개 시 자격증명 제거 필요 (dev-008에서 제거 완료)

### 3. API 인증 커버리지

본 티켓에서 API 라우트 변경 없음 — 이전 SEC-010(dev-006)에서 확보된 커버리지 유지.

## 결론

신규 변경(`app/hardware/page.tsx` UI 반응형 + 디자인 레퍼런스 디렉토리 추가)은 보안 표면을
확장하지 않음. UI 변경은 number 포매팅·CSS 클래스 한정. 디자인 레퍼런스는 정적 HTML/CSS
이며 Next.js 라우트/번들과 격리됨.

---

# Security Report — 2026-04-21 (dev-006 / SEC-010)

## [STATUS] PASSED (after fix)

## 스캔 항목

### 1. 의존성 취약점 (npm audit --audit-level=high)

- high+ 심각도: 없음
- moderate: 3건 (@hono/node-server via @prisma/dev — dev-only, 프로덕션 영향 없음)

### 2. 하드코딩 시크릿

- 결과: 없음 ✅
- 패턴: `API_KEY|SECRET|PASSWORD|TOKEN\s*=\s*['"][^$\{]` across *.ts,tsx,js

### 3. API 인증 커버리지

**발견**: 9개 라우트가 getCurrentUser/requireAdmin/CRON_SECRET 미사용

- `app/api/health/route.ts` — 의도적 public (헬스체크) ✅
- `app/api/dashboard/route.ts` — 수정 🔴→✅
- `app/api/assignments/route.ts` — 수정 🔴→✅
- `app/api/licenses/[id]/renewal-history/route.ts` — 수정 🔴→✅
- `app/api/org/units/[id]/delete-preview/route.ts` — 수정 🔴→✅
- `app/api/assets/[id]/assignment-history/route.ts` — 수정 🔴→✅
- `app/api/assets/expiring/route.ts` — 수정 🔴→✅
- `app/api/reports/monthly/[yearMonth]/pdf/route.ts` — 수정 🔴→✅
- `app/api/reports/monthly/[yearMonth]/data/route.ts` — 수정 🔴→✅

**수정 패턴**:
```ts
import { getCurrentUser } from "@/lib/auth";

export async function GET(...) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  // ...
}
```

### 결론

- middleware.ts 없음 → 각 라우트에서 명시적 인증 필수
- Phase 4 이후 2차 리뷰 결과: 인증 누락 8건 모두 수정됨
- 다음 스캔 주기: Phase 6 착수 전
