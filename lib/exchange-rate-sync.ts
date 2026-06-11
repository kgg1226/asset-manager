// 환율 동기화 코어 (dev-033) — cron 라우트(BE-056)와 lazy 자동 동기화가 공유하는 단일 출처.
// 환경변수 OPEN_EXCHANGE_RATES_APP_ID 가 있으면 openexchangerates.org 사용,
// 없으면 exchangerate-api.com 무료 엔드포인트 폴백.

import { prisma } from "@/lib/prisma";

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "JPY", "GBP", "CNY"];

export type SyncResult = {
  ok: boolean;
  date: string;
  skipped?: boolean;
  updated?: number;
  rates?: Record<string, number>;
  message: string;
};

/**
 * 외부 API 에서 오늘 환율을 받아 DB 에 upsert 한다.
 * @param opts.force true 면 오늘 데이터가 있어도 덮어쓴다 (관리자 수동 동기화).
 *                   false 면 이미 있으면 skip (cron·lazy 자동 동기화).
 */
export async function syncExchangeRates(opts: { force?: boolean } = {}): Promise<SyncResult> {
  const today = new Date().toISOString().split("T")[0];

  if (!opts.force) {
    const existing = await prisma.exchangeRate.findFirst({
      where: { date: today, currency: "USD" },
      select: { id: true },
    });
    if (existing) {
      return { ok: true, date: today, skipped: true, message: `${today} 환율 이미 동기화됨` };
    }
  }

  let rates: Record<string, number> | null = null;

  // OpenExchangeRates API (유료)
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (appId) {
    try {
      const res = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD&symbols=${SUPPORTED_CURRENCIES.join(",")},KRW`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = await res.json();
        const usdToKRW = data.rates?.KRW ?? 1350;
        rates = {};
        for (const currency of SUPPORTED_CURRENCIES) {
          if (data.rates?.[currency] && currency !== "KRW") {
            // USD 기준 → KRW 기준으로 변환
            rates[currency] = usdToKRW / data.rates[currency];
          }
        }
      }
    } catch {
      // 타임아웃/네트워크 실패 — 무료 폴백 시도
    }
  }

  // 폴백: exchangerate-api.com 무료 (KRW 기준)
  if (!rates) {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/KRW", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.result === "success" && data.rates) {
          rates = {};
          for (const currency of SUPPORTED_CURRENCIES) {
            if (data.rates[currency]) {
              // KRW → currency 비율이므로 역수
              rates[currency] = 1 / data.rates[currency];
            }
          }
        }
      }
    } catch {
      // 외부 API 실패 — 저장 건너뜀
    }
  }

  if (!rates) {
    return {
      ok: false,
      date: today,
      message: "외부 환율 API 연결 실패. OPEN_EXCHANGE_RATES_APP_ID 환경변수를 설정하거나 수동으로 환율을 입력하세요.",
    };
  }

  const upserts = SUPPORTED_CURRENCIES
    .filter((c) => rates![c] != null)
    .map((currency) =>
      prisma.exchangeRate.upsert({
        where: { date_currency: { date: today, currency } },
        create: { date: today, currency, rateToKRW: rates![currency], source: "api" },
        update: { rateToKRW: rates![currency], source: "api" },
      }),
    );

  const results = await prisma.$transaction(upserts);

  return {
    ok: true,
    date: today,
    updated: results.length,
    rates,
    message: `${today} 환율 ${results.length}개 동기화 완료`,
  };
}

// ── lazy 자동 동기화 (stale-while-revalidate, dev-033) ──
// 환율 조회 시 오늘 데이터가 없으면 그 자리에서 동기화한다 — 버튼/크론 없이도
// "하루 첫 사용" 시점에 자동 갱신. 외부 API 장애 시 매 조회가 5초씩 대기하지
// 않도록 시도 간격을 1시간으로 제한한다(인메모리 — 단일 인스턴스 배포 전제).

let lastAutoSyncAttemptMs = 0;
const AUTO_SYNC_RETRY_MS = 60 * 60 * 1000;

export async function ensureTodayRates(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  // 빠른 경로: 오늘 데이터가 이미 있으면 조회 1회로 끝
  const existing = await prisma.exchangeRate.findFirst({
    where: { date: today, currency: "USD" },
    select: { id: true },
  });
  if (existing) return;

  const now = Date.now();
  if (now - lastAutoSyncAttemptMs < AUTO_SYNC_RETRY_MS) return;
  lastAutoSyncAttemptMs = now;

  try {
    await syncExchangeRates();
  } catch {
    // 실패해도 조회는 기존(가장 최근) 데이터로 진행 — 다음 시도는 1시간 후
  }
}
