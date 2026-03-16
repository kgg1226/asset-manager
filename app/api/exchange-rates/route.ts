/**
 * GET /api/exchange-rates?currency=USD&date=2026-03-16
 *
 * 환율 조회 (인증된 사용자 — 라이선스/자산 등록 시 환율 자동 적용용)
 *
 * - currency 미지정: 전체 통화 반환
 * - date 미지정: 최신 날짜 데이터 반환
 * - sourceCurrency + targetCurrency: 두 통화 간 교차 환율 계산
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "JPY", "GBP", "CNY"];

export async function GET(request: NextRequest) {
  // 인증 필요 (ADMIN 아닌 일반 사용자도 가능)
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const currencyParam = searchParams.get("currency")?.toUpperCase();
  const sourceCurrency = searchParams.get("sourceCurrency")?.toUpperCase();
  const targetCurrency = searchParams.get("targetCurrency")?.toUpperCase();

  try {
    // 교차 환율 계산 (sourceCurrency → targetCurrency)
    if (sourceCurrency && targetCurrency) {
      return await handleCrossRate(sourceCurrency, targetCurrency, dateParam);
    }

    // 특정 날짜 or 최신 날짜
    let date = dateParam;
    if (!date) {
      // 최신 날짜의 환율 데이터 조회
      const latest = await prisma.exchangeRate.findFirst({
        orderBy: { date: "desc" },
        select: { date: true },
      });
      date = latest?.date ?? new Date().toISOString().split("T")[0];
    }

    const where: Record<string, unknown> = { date };
    if (currencyParam && SUPPORTED_CURRENCIES.includes(currencyParam)) {
      where.currency = currencyParam;
    }

    const rates = await prisma.exchangeRate.findMany({
      where,
      orderBy: { currency: "asc" },
    });

    // 없는 통화는 null로 포함
    const result = currencyParam
      ? rates
      : SUPPORTED_CURRENCIES.map((c) => {
          const found = rates.find((r) => r.currency === c);
          return found
            ? { currency: c, rateToKRW: Number(found.rateToKRW), source: found.source, date }
            : { currency: c, rateToKRW: null, source: null, date };
        });

    return NextResponse.json({ date, rates: result });
  } catch (error) {
    console.error("Exchange rate lookup error:", error);
    return NextResponse.json({ error: "환율 조회 실패" }, { status: 500 });
  }
}

/**
 * 교차 환율 계산: sourceCurrency → targetCurrency
 * KRW 기준 환율을 이용하여 교차 환율을 계산한다.
 *
 * 예: USD → EUR
 *   rateUSD = 1350 (1 USD = 1350 KRW)
 *   rateEUR = 1480 (1 EUR = 1480 KRW)
 *   crossRate = rateUSD / rateEUR = 1350 / 1480 ≈ 0.9122
 *   → 1 USD = 0.9122 EUR
 */
async function handleCrossRate(
  source: string,
  target: string,
  dateParam: string | null
) {
  // KRW ↔ X 는 직접 환산
  const allCurrencies = ["KRW", ...SUPPORTED_CURRENCIES];
  if (!allCurrencies.includes(source) || !allCurrencies.includes(target)) {
    return NextResponse.json(
      { error: `지원하지 않는 통화입니다. 허용값: ${allCurrencies.join(", ")}` },
      { status: 400 }
    );
  }

  if (source === target) {
    return NextResponse.json({ source, target, rate: 1, date: dateParam });
  }

  // 최신 날짜 조회
  let date = dateParam;
  if (!date) {
    const latest = await prisma.exchangeRate.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
    date = latest?.date ?? new Date().toISOString().split("T")[0];
  }

  // 필요한 환율 조회
  const neededCurrencies = [source, target].filter((c) => c !== "KRW");
  const rates = await prisma.exchangeRate.findMany({
    where: {
      date,
      currency: { in: neededCurrencies },
    },
  });

  const rateMap = new Map(rates.map((r) => [r.currency, Number(r.rateToKRW)]));

  // KRW의 rateToKRW는 1
  const sourceToKRW = source === "KRW" ? 1 : rateMap.get(source);
  const targetToKRW = target === "KRW" ? 1 : rateMap.get(target);

  if (sourceToKRW === undefined || targetToKRW === undefined) {
    const missing = [];
    if (sourceToKRW === undefined) missing.push(source);
    if (targetToKRW === undefined) missing.push(target);
    return NextResponse.json(
      { error: `${date} 날짜의 환율 데이터가 없습니다: ${missing.join(", ")}` },
      { status: 404 }
    );
  }

  // 교차 환율: 1 source = (sourceToKRW / targetToKRW) target
  const crossRate = sourceToKRW / targetToKRW;

  return NextResponse.json({
    source,
    target,
    rate: Math.round(crossRate * 1_000_000) / 1_000_000, // 소수 6자리
    sourceToKRW,
    targetToKRW,
    date,
  });
}
