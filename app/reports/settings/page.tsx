"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Plus, X, Send } from "lucide-react";
import { toast } from "sonner";

function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function ReportSettingsPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);

  function addRecipient() {
    setRecipients((prev) => [...prev, ""]);
  }

  function removeRecipient(index: number) {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRecipient(index: number, value: string) {
    setRecipients((prev) => prev.map((r, i) => (i === index ? value : r)));
  }

  async function handleSend() {
    const validEmails = recipients
      .map((r) => r.trim())
      .filter((r) => r.length > 0 && r.includes("@"));

    if (validEmails.length === 0) {
      toast.error("유효한 이메일 주소를 입력하세요.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/reports/monthly/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth,
          recipients: validEmails,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `발송 실패 (${res.status})`);
      }

      const result = await res.json();
      toast.success(
        `${result.period} 보고서가 ${result.recipientCount}명에게 발송되었습니다.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "이메일 발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <Link
          href="/reports"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> 보고서 목록
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">보고서 이메일 발송</h1>

        <div className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          {/* Period Selection */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              보고서 기간
            </label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              선택한 월의 보고서를 Excel 첨부파일과 함께 이메일로 발송합니다.
            </p>
          </div>

          {/* Recipients */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              수신자 이메일
            </label>
            <div className="space-y-2">
              {recipients.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateRecipient(idx, e.target.value)}
                      placeholder="example@company.com"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRecipient(idx)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRecipient}
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              수신자 추가
            </button>
          </div>

          {/* Send Button */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={handleSend}
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? (
                "발송 중..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  보고서 이메일 발송
                </>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              {yearMonth} 보고서가 입력된 이메일 주소로 발송됩니다.
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">이메일 발송 안내</p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-blue-700">
                <li>보고서 요약이 HTML 이메일 본문으로 포함됩니다.</li>
                <li>Excel 파일이 첨부파일로 함께 발송됩니다.</li>
                <li>SMTP 설정이 완료되어 있어야 발송이 가능합니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
