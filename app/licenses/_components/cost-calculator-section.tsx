"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  computeCost,
  CURRENCY_SYMBOLS,
  PAYMENT_CYCLE_LABELS,
  VALID_PAYMENT_CYCLES,
  type PaymentCycle,
  type Currency,
} from "@/lib/cost-calculator";
import { useTranslation } from "@/lib/i18n";

export default function CostCalculatorSection({
  paymentCycle,
  onPaymentCycleChange,
  quantity,
  unitPrice,
  currency,
  /** 지정통화 (대상통화 — KRW가 아닌 경우 교차 환율 계산) */
  targetCurrency,
  initialValues,
  errors,
}: {
  paymentCycle: PaymentCycle;
  onPaymentCycleChange: (c: PaymentCycle) => void;
  quantity: number | null;
  unitPrice: number | null;
  currency: Currency;
  targetCurrency?: Currency;
  initialValues?: {
    exchangeRate: number;
    isVatIncluded: boolean;
  };
  errors?: Record<string, string>;
}) {
  const { t } = useTranslation();
  const [exchangeRateStr, setExchangeRateStr] = useState(
    (initialValues?.exchangeRate ?? 1).toString()
  );
  const [isVatIncluded, setIsVatIncluded] = useState(
    initialValues?.isVatIncluded ?? false
  );
  const [rateSource, setRateSource] = useState<"auto" | "manual" | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateDate, setRateDate] = useState<string | null>(null);

  /** 환율 관리 탭에서 환율 자동 조회 */
  const fetchRate = useCallback(async (cur: string, target?: string) => {
    if (cur === "KRW" && (!target || target === "KRW")) return;
    setRateLoading(true);
    try {
      // 교차 환율 (예: USD → EUR) 또는 단순 환율 (USD → KRW)
      const effectiveTarget = target && target !== "KRW" ? target : undefined;
      const url = effectiveTarget
        ? `/api/exchange-rates?sourceCurrency=${cur}&targetCurrency=${effectiveTarget}`
        : `/api/exchange-rates?currency=${cur}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      if (effectiveTarget && data.rate) {
        // 교차 환율 응답
        setExchangeRateStr(String(data.rate));
        setRateSource("auto");
        setRateDate(data.date);
      } else if (data.rates) {
        // 단일 통화 응답
        const found = Array.isArray(data.rates)
          ? data.rates.find((r: { currency: string; rateToKRW: number | null }) => r.currency === cur && r.rateToKRW !== null)
          : null;
        if (found) {
          setExchangeRateStr(String(found.rateToKRW));
          setRateSource("auto");
          setRateDate(data.date);
        }
      }
    } catch {
      // 실패 시 수동 입력 유지
    } finally {
      setRateLoading(false);
    }
  }, []);

  // 통화 변경 시 환율 자동 조회
  useEffect(() => {
    if (currency === "KRW" && (!targetCurrency || targetCurrency === "KRW")) {
      setExchangeRateStr("1");
      setRateSource(null);
      setRateDate(null);
    } else if (!initialValues?.exchangeRate || initialValues.exchangeRate === 1) {
      // 초기값이 없거나 기본값이면 자동 조회
      fetchRate(currency, targetCurrency);
    }
  }, [currency, targetCurrency, fetchRate, initialValues?.exchangeRate]);

  const handleExchangeRateChange = (value: string) => {
    setExchangeRateStr(value);
    setRateSource("manual");
  };

  const handleRefreshRate = () => {
    fetchRate(currency, targetCurrency);
  };

  const preview = useMemo(() => {
    const rate = parseFloat(exchangeRateStr);
    if (
      quantity === null ||
      !isFinite(quantity) ||
      quantity <= 0 ||
      unitPrice === null ||
      !isFinite(unitPrice) ||
      unitPrice < 0
    )
      return null;
    return computeCost({
      paymentCycle,
      quantity,
      unitPrice,
      currency,
      exchangeRate: isFinite(rate) && rate > 0 ? rate : 1,
      isVatIncluded,
    });
  }, [paymentCycle, quantity, unitPrice, currency, exchangeRateStr, isVatIncluded]);

  const symbol = CURRENCY_SYMBOLS[currency];
  const krwSymbol = CURRENCY_SYMBOLS["KRW"];
  const isKRW = currency === "KRW" && (!targetCurrency || targetCurrency === "KRW");

  return (
    <fieldset className="space-y-4">
      <legend className="w-full border-b border-gray-200 pb-2 text-base font-semibold text-gray-900">
        {t.license.costInfo}{" "}
        <span className="text-xs font-normal text-gray-400">({t.common.optional})</span>
      </legend>

      {/* Hidden inputs — always submitted with the form */}
      <input type="hidden" name="paymentCycle" value={paymentCycle} />
      <input type="hidden" name="isVatIncluded" value={isVatIncluded ? "true" : "false"} />
      <input type="hidden" name="quantity" value={quantity ?? ""} />

      {/* Payment cycle */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t.license.paymentCycle}
        </label>
        <div className="flex gap-2">
          {VALID_PAYMENT_CYCLES.map((cycle) => (
            <label
              key={cycle}
              className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium ring-1 transition-colors ${
                paymentCycle === cycle
                  ? "bg-blue-600 text-white ring-blue-600"
                  : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                value={cycle}
                checked={paymentCycle === cycle}
                onChange={() => onPaymentCycleChange(cycle)}
                className="sr-only"
              />
              {PAYMENT_CYCLE_LABELS[cycle]}
            </label>
          ))}
        </div>
      </div>

      {/* Exchange rate */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <label className="block text-sm font-medium text-gray-700">
            {t.license.exchangeRate} ({symbol} → {targetCurrency && targetCurrency !== "KRW" ? CURRENCY_SYMBOLS[targetCurrency] : krwSymbol})
          </label>
          {rateSource === "auto" && rateDate && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              자동 ({rateDate})
            </span>
          )}
          {rateLoading && (
            <span className="text-xs text-gray-400">조회 중...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="exchangeRate"
            min={0.000001}
            step="any"
            value={exchangeRateStr}
            onChange={(e) => handleExchangeRateChange(e.target.value)}
            disabled={isKRW}
            placeholder="1"
            className="input flex-1 disabled:bg-gray-100 disabled:text-gray-400"
          />
          {!isKRW && (
            <button
              type="button"
              onClick={handleRefreshRate}
              disabled={rateLoading}
              className="shrink-0 rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-200 disabled:opacity-50"
              title="환율 관리 탭에서 최신 환율 가져오기"
            >
              {rateLoading ? "..." : "↻ 환율 조회"}
            </button>
          )}
        </div>
        {isKRW ? (
          <p className="mt-1 text-xs text-gray-400">KRW</p>
        ) : (
          <>
            {errors?.exchangeRate && (
              <p className="mt-1 text-xs text-red-600">{errors.exchangeRate}</p>
            )}
            {rateSource === null && !rateLoading && (
              <p className="mt-1 text-xs text-gray-400">
                환율 관리 탭의 데이터를 자동으로 가져옵니다. 직접 입력도 가능합니다.
              </p>
            )}
          </>
        )}
      </div>

      {/* VAT toggle */}
      <div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isVatIncluded}
            onChange={(e) => setIsVatIncluded(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            {t.license.vatIncluded} (10%)
          </span>
        </label>
      </div>

      {/* Read-only results panel */}
      <div className="rounded-md bg-gray-50 p-4 ring-1 ring-gray-200">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">{t.license.totalAmount}</h4>
        {preview ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-gray-600">{t.license.unitPrice} ({symbol})</dt>
            <dd className="text-right font-medium text-gray-900">
              {preview.subtotal.toLocaleString()}
            </dd>

            {isVatIncluded ? (
              <>
                <dt className="text-gray-600">VAT</dt>
                <dd className="text-right text-gray-500">{t.license.vatIncluded}</dd>
              </>
            ) : (
              <>
                <dt className="text-gray-600">VAT 10% ({symbol})</dt>
                <dd className="text-right font-medium text-gray-900">
                  + {preview.vatAmount.toLocaleString()}
                </dd>
              </>
            )}

            <dt className="font-medium text-gray-700">{t.common.total} ({symbol})</dt>
            <dd className="text-right font-semibold text-blue-700">
              {preview.totalAmountForeign.toLocaleString()}
            </dd>

            {currency !== "KRW" && (
              <>
                <dt className="font-medium text-gray-700">{t.common.total} ({krwSymbol})</dt>
                <dd className="text-right font-semibold text-blue-700">
                  {krwSymbol}{preview.totalAmountKRW.toLocaleString()}
                </dd>
              </>
            )}

            <dt className="col-span-2 mt-1 border-t border-gray-200 pt-2 text-xs font-medium uppercase text-gray-500">
              {t.license.totalAmount}
            </dt>
            <dt className="text-gray-600">{t.license.monthly} ({krwSymbol})</dt>
            <dd className="text-right text-gray-700">
              {krwSymbol}{preview.monthlyKRW.toLocaleString()}
            </dd>
            <dt className="text-gray-600">{t.license.yearly} ({krwSymbol})</dt>
            <dd className="text-right text-gray-700">
              {krwSymbol}{preview.annualKRW.toLocaleString()}
            </dd>
          </dl>
        ) : (
          <p className="text-sm text-gray-400">
            {t.license.quantity} / {t.license.unitPrice}
          </p>
        )}
      </div>
    </fieldset>
  );
}
