"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Save, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { EXCHANGE_RATES_TOUR_KEY, getExchangeRatesSteps } from "@/app/_components/tours/exchange-rates-tour";

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "GBP", name: "British Pound" },
  { code: "CNY", name: "Chinese Yuan" },
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
  const { t } = useTranslation();

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
      setResult({ ok: true, message: t.toast.saveSuccess });
      toast.success(t.toast.saveSuccess);
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : t.toast.saveFail });
      toast.error(t.toast.saveFail);
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
      if (!res.ok) throw new Error(json.error || t.common.error);
      toast.success(t.common.success);
      setResult({ ok: true, message: t.common.success });
      setLastSyncTime(new Date().toISOString());
      await loadRates(date);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.common.error;
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
          <h1 className="text-2xl font-bold text-gray-900">{t.header.exchangeRate}</h1>
          <TourGuide tourKey={EXCHANGE_RATES_TOUR_KEY} steps={getExchangeRatesSteps(t)} />
        </div>

        {/* sync card */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" data-tour="exchange-rates-sync">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">API Sync</p>
              <p className="text-xs text-gray-400">
                {lastSyncTime
                  ? `${new Date(lastSyncTime).toLocaleString()}`
                  : "09:00 daily"}
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
              {syncing ? t.common.loading : "Sync"}
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200" data-tour="exchange-rates-table">
          <div className="mb-6 flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium uppercase text-gray-500 mb-1">{t.common.date}</label>
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
              {t.common.search}
            </button>
          </div>

          <p className="mb-4 text-xs text-gray-400">1 {t.license.currency} = ? KRW</p>

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
                    {sources[code] === "api" ? "API" : "Manual"}
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
              {saving ? t.common.loading : t.common.save}
            </button>
            {result && (
              <p className={`text-sm ${result.ok ? "text-green-600" : "text-red-600"}`}>{result.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
