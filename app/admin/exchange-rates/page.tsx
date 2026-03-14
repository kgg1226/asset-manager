"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Save, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

const CURRENCIES = [
  { code: "USD", name: "미국 달러" },
  { code: "EUR", name: "유로" },
  { code: "JPY", name: "일본 엔" },
  { code: "GBP", name: "영국 파운드" },
  { code: "CNY", name: "중국 위안" },
];

type RateEntry = { currency: string; rateToKRW: number | null; source: string | null; updatedAt?: string | null };

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export default function ExchangeRatesPage() {
  const [date, setDate] = useState(getTodayString());
  const [rates, setRates] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function loadRates(d: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exchange-rates?date=${d}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        const srcMap: Record<string, string> = {};
        let latestSync: string | null = null;
        for (const r of data.rates as RateEntry[]) {
          if (r.rateToKRW != null) map[r.currency] = String(r.rateToKRW);
          if (r.source) srcMap[r.currency] = r.source;
          if (r.source === "api" && r.updatedAt) {
            if (!latestSync || r.updatedAt > latestSync) latestSync = r.updatedAt;
          }
        }
        setRates(map);
        setSources(srcMap);
        if (latestSync) setLastSyncTime(latestSync);
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
      toast.success(`환율 ${json.updated}개 저장 완료`);
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "저장 실패" });
      toast.error("환율 저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/exchange-rate-sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "동기화 실패");
      toast.success("환율 동기화 완료");
      setResult({ ok: true, message: `외부 API에서 환율을 동기화했습니다.` });
      setLastSyncTime(new Date().toISOString());
      // 동기화 후 현재 날짜 데이터 다시 로드
      await loadRates(date);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "동기화 실패";
      toast.error(msg);
      setResult({ ok: false, message: msg });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">환율 관리</h1>
        </div>

        {/* 동기화 카드 */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">외부 API 환율 동기화</p>
              <p className="text-xs text-gray-400">
                {lastSyncTime
                  ? `마지막 동기화: ${new Date(lastSyncTime).toLocaleString("ko-KR")}`
                  : "자동 동기화: 매일 09:00"}
              </p>
            </div>
            <button
              onClick={syncNow}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {syncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {syncing ? "동기화 중..." : "지금 동기화"}
            </button>
          </div>
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
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
                {sources[code] && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${sources[code] === "api" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {sources[code] === "api" ? "API" : "수동"}
                  </span>
                )}
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
              {saving ? "저장 중..." : "수동 저장"}
            </button>
            {result && (
              <p className={`text-sm ${result.ok ? "text-green-600" : "text-red-600"}`}>{result.message}</p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
          <p className="text-sm text-blue-700">
            <strong>자동 동기화:</strong> 매일 09:00 배치가 실행됩니다.
            <br />
            <strong>수동 동기화:</strong> 상단 &quot;지금 동기화&quot; 버튼을 클릭하면 즉시 외부 API에서 최신 환율을 가져옵니다.
            <br />
            <span className="text-xs text-blue-500">
              외부 API: <code className="rounded bg-blue-100 px-1 font-mono text-xs">OPEN_EXCHANGE_RATES_APP_ID</code> 설정 시 우선 사용, 미설정 시 무료 API 시도.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
