// BE-056: POST /api/cron/exchange-rate-sync — 환율 일일 동기화
// 매일 09:00 실행 / CRON_SECRET 필요
// 동기화 본체는 lib/exchange-rate-sync.ts (dev-033 에서 추출 — lazy 자동 동기화와 공유)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isCronAuthorized } from "@/lib/cron-auth";
import { syncExchangeRates } from "@/lib/exchange-rate-sync";

export async function POST(request: NextRequest) {
  // CRON_SECRET 또는 ADMIN 세션으로 인증
  const isCron = isCronAuthorized(request);
  if (!isCron) {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // ADMIN 수동 동기화 시 기존 데이터 덮어쓰기 허용, cron 은 skip-if-exists (기존 동작 보존)
    const result = await syncExchangeRates({ force: !isCron });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Exchange rate sync failed:", error);
    return NextResponse.json({ error: "환율 동기화에 실패했습니다." }, { status: 500 });
  }
}
