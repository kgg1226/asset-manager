# Security Report — 2026-04-21

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
