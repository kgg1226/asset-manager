"use client";

import Link from "next/link";
import { useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type Device = {
  assetId: number;
  name: string;
  deviceType: string | null;
  assignee: string | null;
  enrollmentStatus: string;
  complianceStatus: string;
  lastCheckinAt: string | null;
};

const STALE_DAYS = 30;

export default function DevicesContent({
  counts,
  devices,
}: {
  counts: { managed: number; compliant: number; nonCompliant: number; unknown: number };
  devices: Device[];
}) {
  const { t } = useTranslation();
  const [now] = useState(() => Date.now());

  const compLabel = (s: string) =>
    s === "COMPLIANT" ? t.device.compCompliant : s === "NON_COMPLIANT" ? t.device.compNonCompliant : t.device.compUnknown;
  const compClass = (s: string) =>
    s === "COMPLIANT" ? "bg-green-100 text-green-700" : s === "NON_COMPLIANT" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600";
  const enrollLabel = (s: string) =>
    ({ UNENROLLED: t.device.enrollUnenrolled, ENROLLED: t.device.enrollEnrolled, PENDING: t.device.enrollPending, RETIRED: t.device.enrollRetired } as Record<string, string>)[s] ?? s;

  const isStale = (last: string | null) => !last || now - new Date(last).getTime() > STALE_DAYS * 86400000;
  const fmtCheckin = (last: string | null) => (last ? new Date(last).toLocaleDateString() : t.device.neverCheckin);

  const cards = [
    { label: t.device.cardManaged, value: counts.managed, cls: "text-gray-900" },
    { label: t.device.cardCompliant, value: counts.compliant, cls: "text-green-600" },
    { label: t.device.cardNonCompliant, value: counts.nonCompliant, cls: "text-red-600" },
    { label: t.device.cardUnknown, value: counts.unknown, cls: "text-gray-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <MonitorSmartphone className="h-6 w-6 text-blue-600" />
            {t.device.dashboardTitle}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t.device.dashboardDesc}</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
              <p className="text-xs font-medium uppercase text-gray-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.asset.assetName}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.asset.assignee}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.device.enrollment}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.device.compliance}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.device.lastCheckin}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devices.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t.device.noManaged}</td></tr>
              ) : (
                devices.map((d) => {
                  const stale = isStale(d.lastCheckinAt);
                  const attention = d.complianceStatus === "NON_COMPLIANT" || stale;
                  return (
                    <tr key={d.assetId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        <Link href={`/hardware/${d.assetId}`} className="text-blue-600 hover:underline">{d.name}</Link>
                        {d.deviceType && <span className="ml-1 text-xs text-gray-400">{d.deviceType}</span>}
                        {attention && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">{t.device.needsAttention}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{d.assignee ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{enrollLabel(d.enrollmentStatus)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${compClass(d.complianceStatus)}`}>{compLabel(d.complianceStatus)}</span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${stale ? "text-amber-600" : "text-gray-600"}`}>{fmtCheckin(d.lastCheckinAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
