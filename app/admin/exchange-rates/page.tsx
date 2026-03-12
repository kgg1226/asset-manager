"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Save, RefreshCw } from "lucide-react";

const CURRENCIES = [
  { code: "USD", name: "미국 달러" },
  { code: "EUR", name: "유로" },
  { code: "JPY", name: "일본 엔" },
  { code: "GBP", name: "영국 파운드" },
  { code: "CNY", name: "중국 위안" },
];

type RateEntry = { currency: string; rateToKRW: number | null; source: string | null };

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export default function ExchangeRatesPage() {
  const [date, setDate] = useState(getTodayString());
  const [rates, setRates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function loadRates(d: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exchange-rates?date=${d}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const r of data.rates as RateEntry[]) {
          if (r.rateToKRW != null) map[r.currency] = String(r.rateToKRW);
        }
        setRates(map);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRates(date); }, [date]);

  async function saveRates() {
    setSaving(true);
    setResult(null);
    try {
      const rateObj: Record<string, number> = {};
      for (const [k, v] of Object.entries(rates)) {
        const n = parseFloat(v);
        if (!isNaN(n) && n > 0) rateObj[k] = n;
      }
      const res = await fetch("/api/admin/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, rates: rateObj }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult({ ok: true, message: `${date} 환율 ${json.updated}개 저장 완료` });
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">환율 관리</h1>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="mb-6 flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium uppercase text-gray-500 mb-1">날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => loadRates(date)}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              불러오기
            </button>
          </div>

          <p className="mb-4 text-xs text-gray-400">기준: 1 통화 = ? KRW (예: USD 1 = 1,350 KRW)</p>

          <div className="space-y-3">
            {CURRENCIES.map(({ code, name }) => (
              <div key={code} className="flex items-center gap-4">
                <div className="w-32">
                  <span className="text-sm font-medium text-gray-900">{code}</span>
                  <span className="ml-2 text-xs text-gray-400">{name}</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates[code] ?? ""}
                  onChange={(e) => setRates((prev) => ({ ...prev, [code]: e.target.value }))}
                  placeholder="0.00"
                  className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <span className="text-sm text-gray-400">KRW</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={saveRates}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "저장 중..." : "저장"}
            </button>
            {result && (
              <p className={`text-sm ${result.ok ? "text-green-600" : "text-red-600"}`}>{result.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
          <p className="text-sm text-blue-700">
            자동 동기화: 매일 09:00 <code className="rounded bg-blue-100 px-1 font-mono text-xs">POST /api/cron/exchange-rate-sync</code> 배치가 실행됩니다.
            <br />
            외부 API 설정: <code className="rounded bg-blue-100 px-1 font-mono text-xs">OPEN_EXCHANGE_RATES_APP_ID</code> 환경변수 (없으면 무료 API 시도 후 수동 입력).
          </p>
        </div>
      </div>
    </div>
  );
}
