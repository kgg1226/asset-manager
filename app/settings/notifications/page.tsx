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
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Save,
  Settings,
  X,
  Power,
  CalendarClock,
  FileDown,
  UserCog,
  ArrowLeftRight,
  BellRing,
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

interface ConfigItem {
  key: string;
  source: "db" | "env" | "none";
  maskedValue: string | null;
  updatedAt: string | null;
}

interface NotificationPreferences {
  enabled: boolean;
  channel: "SLACK" | "EMAIL" | "BOTH";
  events: Record<string, boolean>;
  renewalDaysBefore: number;
  cancellationDaysBefore: number;
}

// ── Channel Config Modal ──

function ChannelConfigModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());

  const SENSITIVE_KEYS = new Set(["SLACK_WEBHOOK_URL", "SMTP_PASS"]);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications/config");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfigs(data.configs ?? []);
      const initial: Record<string, string> = {};
      for (const c of data.configs ?? []) {
        if (c.source !== "none" && !SENSITIVE_KEYS.has(c.key)) {
          initial[c.key] = c.maskedValue ?? "";
        }
      }
      setFormValues(initial);
      setDirtyKeys(new Set());
    } catch {
      toast.error(t.notification.configLoadFail);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadConfig();
  }, [open, loadConfig]);

  if (!open) return null;

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setDirtyKeys((prev) => new Set(prev).add(key));
  };

  const handleClear = async (key: string) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: [{ key, value: null }] }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.notification.configSaved);
      await loadConfig();
      onSaved?.();
    } catch {
      toast.error(t.notification.configSaveFail);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (dirtyKeys.size === 0) return;
    setIsSaving(true);
    try {
      const entries = Array.from(dirtyKeys)
        .filter((k) => formValues[k] !== undefined && formValues[k].trim() !== "")
        .map((k) => ({ key: k, value: formValues[k].trim() }));
      if (entries.length === 0) return;

      const res = await fetch("/api/notifications/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: entries }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.notification.configSaved);
      setDirtyKeys(new Set());
      await loadConfig();
      onSaved?.();
    } catch {
      toast.error(t.notification.configSaveFail);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getSourceBadge = (source: "db" | "env" | "none") => {
    if (source === "db")
      return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{t.notification.sourceDb}</span>;
    if (source === "env")
      return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{t.notification.sourceEnv}</span>;
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">{t.notification.sourceNone}</span>;
  };

  const getConfig = (key: string) => configs.find((c) => c.key === key);

  const renderField = (key: string, label: string, type: "text" | "password" | "number" | "email" = "text", placeholder?: string) => {
    const config = getConfig(key);
    const isSensitive = SENSITIVE_KEYS.has(key);
    const isVisible = showSecrets.has(key);
    const isDirty = dirtyKeys.has(key);

    return (
      <div className="flex items-center gap-2" key={key}>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700">{label}</label>
            {config && getSourceBadge(config.source)}
          </div>
          <div className="relative">
            <input
              type={isSensitive && !isVisible ? "password" : type === "password" ? (isVisible ? "text" : "password") : type}
              placeholder={config?.source === "none" ? placeholder ?? "" : config?.maskedValue ?? placeholder ?? ""}
              value={formValues[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              className={`w-full rounded-md border px-3 py-2 pr-16 text-sm ${isDirty ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-300"}`}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {isSensitive && (
                <button type="button" onClick={() => toggleSecret(key)} className="rounded p-1 text-gray-400 hover:text-gray-600" title={isVisible ? t.notification.hideValue : t.notification.showValue}>
                  {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
              {config?.source === "db" && (
                <button type="button" onClick={() => handleClear(key)} disabled={isSaving} className="rounded p-1 text-gray-400 hover:text-red-500" title={t.notification.clearToEnv}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Lock className="h-5 w-5 text-amber-500" />
            {t.notification.configTitle}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <p className="mb-3 text-xs text-gray-500">{t.notification.configDescription}</p>

        <div className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <Settings className="h-3.5 w-3.5 flex-shrink-0" />
          {t.notification.dbPriorityNote}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-gray-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t.common.loading}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Slack */}
              <div className="rounded-md border border-gray-200 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  {t.notification.slackSettings}
                </h3>
                {renderField("SLACK_WEBHOOK_URL", t.notification.webhookUrl, "password", "https://hooks.slack.com/services/...")}
              </div>

              {/* SMTP */}
              <div className="rounded-md border border-gray-200 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Mail className="h-4 w-4 text-blue-500" />
                  {t.notification.smtpSettings}
                </h3>
                <div className="space-y-3">
                  {renderField("SMTP_HOST", t.notification.smtpHost, "text", "smtp.example.com")}
                  {renderField("SMTP_PORT", t.notification.smtpPort, "number", "587")}
                  {renderField("SMTP_USER", t.notification.smtpUser, "text", "user@example.com")}
                  {renderField("SMTP_PASS", t.notification.smtpPass, "password")}
                  {renderField("SMTP_FROM", t.notification.smtpFrom, "email", "noreply@example.com")}
                </div>
              </div>
            </div>

            {dirtyKeys.size > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? t.notification.saving : t.notification.saveConfig}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Preferences Section ──

function PreferencesSection({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const loadPrefs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrefs(data.prefs);
      setIsDirty(false);
    } catch {
      // 기본값 사용
      setPrefs({
        enabled: false,
        channel: "SLACK",
        events: {
          ASSET_CREATED: true,
          ASSET_UPDATED: true,
          ASSET_DELETED: true,
          DATA_IMPORT: true,
          RENEWAL_APPROACHING: true,
          CANCELLATION_APPROACHING: true,
          ASSIGNMENT_CHANGE: true,
          USER_MANAGEMENT: false,
        },
        renewalDaysBefore: 30,
        cancellationDaysBefore: 30,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadPrefs();
  }, [isAdmin, loadPrefs]);

  const updatePrefs = (updater: (p: NotificationPreferences) => NotificationPreferences) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setIsDirty(true);
      return next;
    });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.notification.prefsSaved);
      setIsDirty(false);
    } catch {
      toast.error(t.notification.prefsSaveFail);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin || isLoading || !prefs) return null;

  const EVENT_CONFIG: Array<{ key: string; icon: React.ReactNode; label: string; desc: string; hasDays?: boolean; daysKey?: "renewalDaysBefore" | "cancellationDaysBefore" }> = [
    { key: "ASSET_CREATED", icon: <BellRing className="h-4 w-4 text-blue-500" />, label: t.notification.eventAssetCreated, desc: t.notification.eventAssetCreatedDesc },
    { key: "ASSET_UPDATED", icon: <BellRing className="h-4 w-4 text-amber-500" />, label: t.notification.eventAssetUpdated, desc: t.notification.eventAssetUpdatedDesc },
    { key: "ASSET_DELETED", icon: <BellRing className="h-4 w-4 text-red-500" />, label: t.notification.eventAssetDeleted, desc: t.notification.eventAssetDeletedDesc },
    { key: "DATA_IMPORT", icon: <FileDown className="h-4 w-4 text-green-500" />, label: t.notification.eventDataImport, desc: t.notification.eventDataImportDesc },
    { key: "RENEWAL_APPROACHING", icon: <CalendarClock className="h-4 w-4 text-orange-500" />, label: t.notification.eventRenewal, desc: t.notification.eventRenewalDesc, hasDays: true, daysKey: "renewalDaysBefore" },
    { key: "CANCELLATION_APPROACHING", icon: <AlertTriangle className="h-4 w-4 text-red-500" />, label: t.notification.eventCancellation, desc: t.notification.eventCancellationDesc, hasDays: true, daysKey: "cancellationDaysBefore" },
    { key: "ASSIGNMENT_CHANGE", icon: <ArrowLeftRight className="h-4 w-4 text-purple-500" />, label: t.notification.eventAssignment, desc: t.notification.eventAssignmentDesc },
    { key: "USER_MANAGEMENT", icon: <UserCog className="h-4 w-4 text-gray-500" />, label: t.notification.eventUserMgmt, desc: t.notification.eventUserMgmtDesc },
  ];

  return (
    <div className="mb-8 rounded-lg bg-white p-6 shadow-sm" data-tour="notif-prefs">
      <h2 className="mb-1 text-lg font-bold text-gray-900 flex items-center gap-2">
        <Bell className="h-5 w-5 text-blue-500" />
        {t.notification.prefsTitle}
      </h2>
      <p className="mb-5 text-sm text-gray-500">{t.notification.prefsDescription}</p>

      {/* Master switch + channel */}
      <div className="mb-5 flex flex-wrap items-center gap-6 rounded-lg border border-gray-200 p-4">
        {/* Master toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => updatePrefs((p) => ({ ...p, enabled: !p.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.enabled ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs.enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <div>
            <p className="text-sm font-medium text-gray-900">{t.notification.masterSwitch}</p>
            <p className="text-xs text-gray-500">{t.notification.masterSwitchDesc}</p>
          </div>
        </div>

        {/* Channel selection */}
        {prefs.enabled && (
          <div className="flex items-center gap-2 border-l border-gray-200 pl-6">
            <span className="text-xs font-medium text-gray-600">{t.notification.notifyChannel}:</span>
            {(["SLACK", "EMAIL", "BOTH"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => updatePrefs((p) => ({ ...p, channel: ch }))}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  prefs.channel === ch ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {ch === "SLACK" && <MessageSquare className="h-3 w-3" />}
                {ch === "EMAIL" && <Mail className="h-3 w-3" />}
                {ch === "BOTH" && <Bell className="h-3 w-3" />}
                {ch === "BOTH" ? `${t.notification.emailChannel} + ${t.notification.slackChannel}` : ch === "EMAIL" ? t.notification.emailChannel : t.notification.slackChannel}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Event toggles */}
      {prefs.enabled && (
        <div className="space-y-2">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{t.notification.eventTypes}</h3>
          {EVENT_CONFIG.map((evt) => (
            <div key={evt.key} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                {evt.icon}
                <div>
                  <p className="text-sm font-medium text-gray-900">{evt.label}</p>
                  <p className="text-xs text-gray-500">{evt.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {evt.hasDays && evt.daysKey && prefs.events[evt.key] && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={prefs[evt.daysKey]}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 30;
                        updatePrefs((p) => ({ ...p, [evt.daysKey!]: Math.max(1, Math.min(365, v)) }));
                      }}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm"
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap">{t.notification.daysBefore}</span>
                  </div>
                )}
                <button
                  onClick={() =>
                    updatePrefs((p) => ({
                      ...p,
                      events: { ...p.events, [evt.key]: !p.events[evt.key] },
                    }))
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    prefs.events[evt.key] ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${prefs.events[evt.key] ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save */}
      {isDirty && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? t.notification.saving : t.notification.saveConfig}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

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

  // User role
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d?.user?.role === "ADMIN"))
      .catch(() => {});
  }, []);

  // Channel config modal
  const [showChannelConfig, setShowChannelConfig] = useState(false);

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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-7 w-7 text-blue-600" />
              {t.notification.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t.notification.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowChannelConfig(true)}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <Settings className="h-4 w-4" />
                {t.notification.channelConfig}
              </button>
            )}
            <TourGuide tourKey={NOTIFICATIONS_TOUR_KEY} steps={getNotificationsSteps(t)} />
          </div>
        </div>

        {/* ── Preferences Section (ADMIN only) ── */}
        <PreferencesSection isAdmin={isAdmin} />

        {/* ── Test Section ── */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm" data-tour="notif-test">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{t.notification.testSection}</h2>
          <p className="mb-4 text-sm text-gray-600">{t.notification.testDescription}</p>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.notification.testChannel}</label>
              <div className="flex gap-2">
                {(["EMAIL", "SLACK", "BOTH"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setTestChannel(ch)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      testChannel === ch ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
            {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isTesting ? t.common.loading : t.notification.testSend}
          </button>

          {testResult && (
            <div className={`mt-4 rounded-md border p-4 ${testResult.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="mb-3 flex items-center gap-2">
                {testResult.ok ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
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
                    {d.durationMs != null && <span className="flex-shrink-0 text-xs text-gray-400">{d.durationMs}ms</span>}
                  </div>
                ))}
              </div>
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

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={logFilter.status} onChange={(e) => setLogFilter((p) => ({ ...p, status: e.target.value }))} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
              <option value="">{t.common.all} {t.common.status}</option>
              <option value="OK">{t.common.success}</option>
              <option value="FAIL">{t.common.failure}</option>
            </select>
            <select value={logFilter.channel} onChange={(e) => setLogFilter((p) => ({ ...p, channel: e.target.value }))} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
              <option value="">{t.common.all}</option>
              <option value="EMAIL">{t.notification.emailChannel}</option>
              <option value="SLACK">{t.notification.slackChannel}</option>
            </select>
          </div>

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
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${log.channel === "EMAIL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                          {log.channel === "EMAIL" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                          {log.channel === "EMAIL" ? t.notification.emailChannel : t.notification.slackChannel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate" title={log.recipient}>{log.recipient}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {log.license && <Link href={`/licenses/${log.license.id}`} className="text-blue-600 hover:underline">{log.license.name}</Link>}
                        {log.asset && <Link href={`/cloud/${log.asset.id}`} className="text-blue-600 hover:underline">{log.asset.name}</Link>}
                        {!log.license && !log.asset && "—"}
                      </td>
                      <td className="px-3 py-2">
                        {log.status === "OK" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />{t.common.success}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600"><XCircle className="h-3.5 w-3.5" />{t.common.failure}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-red-600 max-w-[200px] truncate" title={log.errorMsg ?? ""}>{log.errorMsg || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Channel Config Modal */}
      <ChannelConfigModal open={showChannelConfig} onClose={() => setShowChannelConfig(false)} onSaved={() => setTestResult(null)} />
    </div>
  );
}
