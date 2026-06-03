"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, ShieldQuestion, CheckCircle2, XCircle, MinusCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Compliance = {
  enrollmentStatus: string;
  complianceStatus: string;
  managed: boolean;
  diskEncrypted: boolean | null;
  passcodeSet: boolean | null;
  firewallOn: boolean | null;
  antivirusOn: boolean | null;
  osUpToDate: boolean | null;
  jailbrokenRooted: boolean | null;
  lastCheckinAt: string | null;
  notes: string | null;
};

type TriField = "diskEncrypted" | "passcodeSet" | "firewallOn" | "antivirusOn" | "osUpToDate" | "jailbrokenRooted";
const CHECK_KEYS: TriField[] = ["diskEncrypted", "passcodeSet", "firewallOn", "antivirusOn", "osUpToDate", "jailbrokenRooted"];
const ENROLL_OPTS = ["UNENROLLED", "ENROLLED", "PENDING", "RETIRED"] as const;
const COMP_OPTS = ["COMPLIANT", "NON_COMPLIANT", "UNKNOWN"] as const;

type FormState = {
  enrollmentStatus: string;
  complianceStatus: string;
  managed: boolean;
  diskEncrypted: boolean | null;
  passcodeSet: boolean | null;
  firewallOn: boolean | null;
  antivirusOn: boolean | null;
  osUpToDate: boolean | null;
  jailbrokenRooted: boolean | null;
  notes: string;
};

function emptyForm(): FormState {
  return {
    enrollmentStatus: "UNENROLLED",
    complianceStatus: "UNKNOWN",
    managed: false,
    diskEncrypted: null,
    passcodeSet: null,
    firewallOn: null,
    antivirusOn: null,
    osUpToDate: null,
    jailbrokenRooted: null,
    notes: "",
  };
}

export default function DeviceCompliancePanel({ assetId, isAdmin }: { assetId: number; isAdmin: boolean }) {
  const { t } = useTranslation();
  const [data, setData] = useState<Compliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/assets/${assetId}/compliance`);
      if (!res.ok) throw new Error("load failed");
      const j = await res.json();
      setData(j.compliance);
    } catch {
      // 로드 실패를 "레코드 없음(빈 기본값)"과 구분 — 잘못된 편집/덮어쓰기 방지
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit() {
    setForm(
      data
        ? {
            enrollmentStatus: data.enrollmentStatus,
            complianceStatus: data.complianceStatus,
            managed: data.managed,
            diskEncrypted: data.diskEncrypted,
            passcodeSet: data.passcodeSet,
            firewallOn: data.firewallOn,
            antivirusOn: data.antivirusOn,
            osUpToDate: data.osUpToDate,
            jailbrokenRooted: data.jailbrokenRooted,
            notes: data.notes ?? "",
          }
        : emptyForm(),
    );
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/compliance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(t.toast.saveSuccess);
      setEditing(false);
      await load();
    } catch {
      toast.error(t.toast.saveFail);
    } finally {
      setSaving(false);
    }
  }

  async function recordCheckin() {
    setCheckingIn(true);
    try {
      // status 는 보내지 않는다 — 체크인은 "지금 확인함"(lastCheckinAt 갱신)일 뿐,
      // 컴플라이언스 등급 변경은 편집(PUT)에서만. 서버가 기존 status 를 보존한다.
      const res = await fetch(`/api/assets/${assetId}/compliance/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      toast.success(t.device.checkinDone);
      await load();
    } catch {
      toast.error(t.toast.saveFail);
    } finally {
      setCheckingIn(false);
    }
  }

  const enrollLabel = (s: string) =>
    ({ UNENROLLED: t.device.enrollUnenrolled, ENROLLED: t.device.enrollEnrolled, PENDING: t.device.enrollPending, RETIRED: t.device.enrollRetired } as Record<string, string>)[s] ?? s;
  const compLabel = (s: string) => (s === "COMPLIANT" ? t.device.compCompliant : s === "NON_COMPLIANT" ? t.device.compNonCompliant : t.device.compUnknown);
  const checkLabel: Record<TriField, string> = {
    diskEncrypted: t.device.diskEncrypted,
    passcodeSet: t.device.passcodeSet,
    firewallOn: t.device.firewallOn,
    antivirusOn: t.device.antivirusOn,
    osUpToDate: t.device.osUpToDate,
    jailbrokenRooted: t.device.jailbrokenRooted,
  };

  // jailbrokenRooted 는 true 가 위험(역의미)
  function isGood(key: TriField, v: boolean | null): boolean | null {
    if (v === null) return null;
    return key === "jailbrokenRooted" ? v === false : v === true;
  }

  const compClass = (s: string) =>
    s === "COMPLIANT" ? "bg-green-100 text-green-700" : s === "NON_COMPLIANT" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600";
  const CompIcon = data?.complianceStatus === "COMPLIANT" ? ShieldCheck : data?.complianceStatus === "NON_COMPLIANT" ? ShieldAlert : ShieldQuestion;

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          {t.device.title}
        </h2>
        {isAdmin && !editing && !loading && !loadError && (
          <div className="flex items-center gap-2">
            <button
              onClick={recordCheckin}
              disabled={checkingIn}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingIn ? "animate-spin" : ""}`} />
              {t.device.recordCheckin}
            </button>
            <button onClick={startEdit} className="rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50">
              {t.common.edit}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{t.common.loading}</p>
      ) : loadError ? (
        <button onClick={load} className="flex items-center gap-2 text-sm text-red-600 hover:underline" aria-label={t.toast.networkError}>
          <RefreshCw className="h-4 w-4" />
          {t.toast.networkError}
        </button>
      ) : editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">{t.device.enrollment}</span>
              <select value={form.enrollmentStatus} onChange={(e) => setForm({ ...form, enrollmentStatus: e.target.value })} className="input text-sm">
                {ENROLL_OPTS.map((o) => <option key={o} value={o}>{enrollLabel(o)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">{t.device.compliance}</span>
              <select value={form.complianceStatus} onChange={(e) => setForm({ ...form, complianceStatus: e.target.value })} className="input text-sm">
                {COMP_OPTS.map((o) => <option key={o} value={o}>{compLabel(o)}</option>)}
              </select>
            </label>
            <label className="flex items-end gap-2 pb-1.5">
              <input type="checkbox" checked={form.managed} onChange={(e) => setForm({ ...form, managed: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
              <span className="text-sm text-gray-700">{t.device.managed}</span>
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-gray-500">{t.device.securityChecks}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CHECK_KEYS.map((key) => (
                <label key={key} className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-1.5">
                  <span className="text-sm text-gray-700">{checkLabel[key]}</span>
                  <select
                    value={form[key] === null ? "" : form[key] ? "true" : "false"}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value === "" ? null : e.target.value === "true" })}
                    className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs"
                  >
                    <option value="">{t.device.notChecked}</option>
                    <option value="true">{t.common.yes}</option>
                    <option value="false">{t.common.no}</option>
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? t.common.processing : t.common.save}
            </button>
            <button onClick={() => setEditing(false)} className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50">
              {t.common.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">{t.device.enrollment}</dt>
              <dd className="mt-1 text-sm text-gray-900">{enrollLabel(data?.enrollmentStatus ?? "UNENROLLED")}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">{t.device.compliance}</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${compClass(data?.complianceStatus ?? "UNKNOWN")}`}>
                  <CompIcon className="h-3.5 w-3.5" />
                  {compLabel(data?.complianceStatus ?? "UNKNOWN")}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">{t.device.lastCheckin}</dt>
              <dd className="mt-1 text-sm text-gray-900">{data?.lastCheckinAt ? new Date(data.lastCheckinAt).toLocaleString() : t.device.neverCheckin}</dd>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase text-gray-500">{t.device.securityChecks}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CHECK_KEYS.map((key) => {
                const v = data ? data[key] : null;
                const good = isGood(key, v);
                return (
                  <div key={key} className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-1.5">
                    <span className="text-sm text-gray-700">{checkLabel[key]}</span>
                    {good === null ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400"><MinusCircle className="h-3.5 w-3.5" />{t.device.notChecked}</span>
                    ) : good ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {data?.notes && <p className="text-sm text-gray-600">{data.notes}</p>}
        </div>
      )}
    </div>
  );
}
