"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Send,
  CheckCircle2,
  XCircle,
  MinusCircle,
  RefreshCw,
  ArrowLeft,
  Mail,
  MessageSquare,
  AlertTriangle,
  Clock,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { NOTIFICATIONS_TOUR_KEY, getNotificationsSteps } from "@/app/_components/tours/notifications-tour";

// ── Types ──

interface DiagStep {
  step: string;
  status: "ok" | "fail" | "skip";
  message: string;
  durationMs?: number;
}

interface TestResult {
  ok: boolean;
  diagnostics: DiagStep[];
}

interface NotifLog {
  id: number;
  channel: string;
  recipient: string;
  status: string;
  errorMsg?: string | null;
  sentAt: string;
  entityType?: string | null;
  license?: { id: number; name: string } | null;
  asset?: { id: number; name: string; type: string } | null;
}

interface LogStats {
  total: number;
  ok: number;
  fail: number;
  byChannel: { EMAIL: number; SLACK: number };
}

// ── Component ──

export default function NotificationSettingsPage() {
  const { t, locale } = useTranslation();
  // Test state
  const [testChannel, setTestChannel] = useState<"EMAIL" | "SLACK" | "BOTH">("BOTH");
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Log state
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logFilter, setLogFilter] = useState<{ status: string; channel: string }>({ status: "", channel: "" });

  // ── Load logs ──
  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (logFilter.status) params.set("status", logFilter.status);
      if (logFilter.channel) params.set("channel", logFilter.channel);
      params.set("limit", "100");
      const res = await fetch(`/api/notifications/history?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs ?? []);
      setStats(data.stats ?? null);
    } catch {
      toast.error(t.notification.loadFail);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // ── Test send ──
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: testChannel,
          ...(testEmail && { email: testEmail }),
        }),
      });
      const data: TestResult = await res.json();
      setTestResult(data);
      if (data.ok) {
        toast.success(t.notification.testSuccess);
      } else {
        toast.error(t.notification.testPartialFail);
      }
      // Refresh logs after test
      setTimeout(() => loadLogs(), 1000);
    } catch {
      toast.error(t.notification.testRequestFail);
    } finally {
      setIsTesting(false);
    }
  };

  const statusIcon = (s: string) => {
    if (s === "ok" || s === "OK") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === "fail" || s === "FAIL") return <XCircle className="h-4 w-4 text-red-500" />;
    return <MinusCircle className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/settings/groups" className="rounded-md p-2 hover:bg-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-7 w-7 text-blue-600" />
              {t.notification.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t.notification.subtitle}</p>
          </div>
          <div className="ml-auto">
            <TourGuide tourKey={NOTIFICATIONS_TOUR_KEY} steps={getNotificationsSteps(t)} />
          </div>
        </div>

        {/* ── Test Section ── */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm" data-tour="notif-test">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{t.notification.testSection}</h2>
          <p className="mb-4 text-sm text-gray-600">
            {t.notification.testDescription}
          </p>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Channel selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.notification.testChannel}</label>
              <div className="flex gap-2">
                {(["EMAIL", "SLACK", "BOTH"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setTestChannel(ch)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      testChannel === ch
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {ch === "EMAIL" && <Mail className="h-3.5 w-3.5" />}
                    {ch === "SLACK" && <MessageSquare className="h-3.5 w-3.5" />}
                    {ch === "BOTH" && <Bell className="h-3.5 w-3.5" />}
                    {{ EMAIL: t.notification.emailChannel, SLACK: t.notification.slackChannel, BOTH: `${t.notification.emailChannel} + ${t.notification.slackChannel}` }[ch]}
                  </button>
                ))}
              </div>
            </div>

            {/* Email target (optional) */}
            {(testChannel === "EMAIL" || testChannel === "BOTH") && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t.notification.recipientEmail}</label>
                <input
                  type="email"
                  placeholder={t.notification.recipientEmailPlaceholder}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isTesting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isTesting ? t.common.loading : t.notification.testSend}
          </button>

          {/* Test Results */}
          {testResult && (
            <div className={`mt-4 rounded-md border p-4 ${testResult.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="mb-3 flex items-center gap-2">
                {testResult.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-semibold ${testResult.ok ? "text-green-800" : "text-red-800"}`}>
                  {testResult.ok ? t.notification.allChannelSuccess : t.notification.someChannelFail}
                </span>
              </div>
              <div className="space-y-2">
                {testResult.diagnostics.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 rounded bg-white/60 px-3 py-2">
                    {statusIcon(d.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{d.step}</p>
                      <p className="text-xs text-gray-600 break-all">{d.message}</p>
                    </div>
                    {d.durationMs != null && (
                      <span className="flex-shrink-0 text-xs text-gray-400">{d.durationMs}ms</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Troubleshooting hints */}
              {!testResult.ok && (
                <div className="mt-3 rounded bg-white/80 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">{t.notification.troubleshootGuide}</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {testResult.diagnostics.some((d) => d.message.includes("SMTP")) && (
                      <>
                        <li>• {t.notification.smtpEnvCheck}</li>
                        <li>• {t.notification.smtpClosedNetwork}</li>
                        <li>• {t.notification.smtpSecure}</li>
                      </>
                    )}
                    {testResult.diagnostics.some((d) => d.message.includes("SLACK_WEBHOOK_URL")) && (
                      <>
                        <li>• {t.notification.slackWebhookEnable}</li>
                        <li>• {t.notification.slackWebhookEnv}</li>
                      </>
                    )}
                    {testResult.diagnostics.some((d) => d.message.includes("Slack API error")) && (
                      <>
                        <li>• {t.notification.slackWebhookExpired}</li>
                        <li>• {t.notification.slackChannelAccess}</li>
                      </>
                    )}
                    {testResult.diagnostics.some((d) => d.message.includes("ECONNREFUSED") || d.message.includes("ETIMEDOUT")) && (
                      <li>• {t.notification.networkCheck}</li>
                    )}
                    {testResult.diagnostics.some((d) => d.message.includes("auth")) && (
                      <li>• {t.notification.smtpAuthCheck}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Notification Log Section ── */}
        <div className="rounded-lg bg-white p-6 shadow-sm" data-tour="notif-log">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">{t.notification.sendHistory}</h2>
            <button
              onClick={loadLogs}
              disabled={isLoadingLogs}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
              {t.notification.refresh}
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">{t.common.all}</p>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="rounded-md bg-green-50 p-3 text-center">
                <p className="text-xs text-green-600">{t.common.success}</p>
                <p className="text-lg font-bold text-green-700">{stats.ok}</p>
              </div>
              <div className="rounded-md bg-red-50 p-3 text-center">
                <p className="text-xs text-red-600">{t.common.failure}</p>
                <p className="text-lg font-bold text-red-700">{stats.fail}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-3 text-center">
                <p className="text-xs text-blue-600">{t.notification.emailChannel} / {t.notification.slackChannel}</p>
                <p className="text-lg font-bold text-blue-700">{stats.byChannel.EMAIL} / {stats.byChannel.SLACK}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={logFilter.status}
              onChange={(e) => setLogFilter((p) => ({ ...p, status: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">{t.common.all} {t.common.status}</option>
              <option value="OK">{t.common.success}</option>
              <option value="FAIL">{t.common.failure}</option>
            </select>
            <select
              value={logFilter.channel}
              onChange={(e) => setLogFilter((p) => ({ ...p, channel: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">{t.common.all}</option>
              <option value="EMAIL">{t.notification.emailChannel}</option>
              <option value="SLACK">{t.notification.slackChannel}</option>
            </select>
          </div>

          {/* Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{t.notification.time}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{t.notification.channel}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{t.notification.recipient}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{t.notification.target}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{t.common.status}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">{t.notification.errorCol}</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingLogs ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">{t.common.loading}</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">{t.common.noData}</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(log.sentAt).toLocaleString(locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : locale === "zh-TW" ? "zh-TW" : locale === "vi" ? "vi-VN" : "en-US")}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.channel === "EMAIL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          {log.channel === "EMAIL" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                          {log.channel === "EMAIL" ? t.notification.emailChannel : t.notification.slackChannel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate" title={log.recipient}>{log.recipient}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {log.license && (
                          <Link href={`/licenses/${log.license.id}`} className="text-blue-600 hover:underline">{log.license.name}</Link>
                        )}
                        {log.asset && (
                          <Link href={`/cloud/${log.asset.id}`} className="text-blue-600 hover:underline">{log.asset.name}</Link>
                        )}
                        {!log.license && !log.asset && "—"}
                      </td>
                      <td className="px-3 py-2">
                        {log.status === "OK" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />{t.common.success}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600"><XCircle className="h-3.5 w-3.5" />{t.common.failure}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600 max-w-[200px] truncate" title={log.errorMsg ?? ""}>
                        {log.errorMsg || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
