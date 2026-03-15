"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, X, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";

function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function ReportSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [recipients, setRecipients] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);
  const [newEmail, setNewEmail] = useState("");
  const [testYearMonth, setTestYearMonth] = useState(getCurrentYearMonth());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function addRecipient() {
    const email = newEmail.trim();
    if (!email || recipients.includes(email)) return;
    setRecipients((prev) => [...prev, email]);
    setNewEmail("");
  }

  function removeRecipient(email: string) {
    setRecipients((prev) => prev.filter((e) => e !== email));
  }

  async function sendTestEmail() {
    if (recipients.length === 0) {
      setResult({ ok: false, message: t.report.sendEmail + " - " + t.common.required });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/reports/monthly/${testYearMonth}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? t.toast.saveFail);
      setResult({ ok: true, message: `${recipients.length} - ${testYearMonth} ${t.report.sendEmail} ${t.common.success}` });
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : t.common.error });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center gap-3">
          <Settings className="h-6 w-6 text-gray-500" />
          <h1 className="text-2xl font-bold text-gray-900">{t.report.sendEmail} {t.nav.settings}</h1>
        </div>

        <div className="space-y-6">
          {/* Recipients */}
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.report.sendEmail} {t.common.list}</h2>
            <div className="mb-4 flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                placeholder={t.employee.email}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={addRecipient}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
                {t.common.add}
              </button>
            </div>

            {recipients.length === 0 ? (
              <p className="text-sm text-gray-400">{t.common.noData}</p>
            ) : (
              <ul className="space-y-2">
                {recipients.map((email) => (
                  <li key={email} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-900">{email}</span>
                    <button
                      onClick={() => removeRecipient(email)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Test Send */}
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{t.notification.testSend}</h2>
            <div className="mb-4">
              <label className="block text-xs font-medium uppercase text-gray-500 mb-1">{t.report.period}</label>
              <input
                type="month"
                value={testYearMonth}
                onChange={(e) => setTestYearMonth(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={sendTestEmail}
              disabled={sending || recipients.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? t.common.loading : t.notification.testSend}
            </button>

            {result && (
              <div className={`mt-3 rounded-md p-3 text-sm ring-1 ${result.ok ? "bg-green-50 text-green-700 ring-green-200" : "bg-red-50 text-red-700 ring-red-200"}`}>
                {result.message}
              </div>
            )}
          </div>

          {/* Auto-send notice */}
          <div className="rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
            <h3 className="text-sm font-medium text-blue-900">{t.report.sendEmail}</h3>
            <p className="mt-1 text-sm text-blue-700">
              <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs">CRON_SECRET</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
