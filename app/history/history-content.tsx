"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

const PAGE_SIZE = 50;

const ENTITY_TYPES = ["", "LICENSE", "ASSET", "EMPLOYEE", "ASSIGNMENT", "SEAT", "USER", "ORG", "ARCHIVE", "EXCHANGE_RATE", "ASSET_CATEGORY"] as const;
const ACTIONS = ["", "CREATED", "UPDATED", "DELETED", "ASSIGNED", "UNASSIGNED", "RETURNED", "REVOKED", "IMPORTED", "LOGIN", "LOGOUT", "LOGIN_FAILED", "STATUS_CHANGE", "MEMBER_OFFBOARD", "PASSWORD_RESET"] as const;

const actionBadge: Record<string, string> = {
  CREATED: "text-green-700 bg-green-100",
  UPDATED: "text-blue-700 bg-blue-100",
  DELETED: "text-red-700 bg-red-100",
  ASSIGNED: "text-purple-700 bg-purple-100",
  RETURNED: "text-yellow-700 bg-yellow-100",
  UNASSIGNED: "text-orange-700 bg-orange-100",
  REVOKED: "text-red-700 bg-red-100",
  IMPORTED: "text-indigo-700 bg-indigo-100",
  LOGIN: "text-gray-700 bg-gray-100",
  LOGOUT: "text-gray-700 bg-gray-100",
  LOGIN_FAILED: "text-red-700 bg-red-100",
  STATUS_CHANGE: "text-amber-700 bg-amber-100",
  MEMBER_OFFBOARD: "text-rose-700 bg-rose-100",
  PASSWORD_RESET: "text-cyan-700 bg-cyan-100",
};

const entityBadge: Record<string, string> = {
  LICENSE: "text-blue-700 bg-blue-100",
  ASSET: "text-teal-700 bg-teal-100",
  EMPLOYEE: "text-orange-700 bg-orange-100",
  ASSIGNMENT: "text-purple-700 bg-purple-100",
  SEAT: "text-violet-700 bg-violet-100",
  USER: "text-gray-700 bg-gray-100",
  ORG: "text-emerald-700 bg-emerald-100",
  ARCHIVE: "text-cyan-700 bg-cyan-100",
  EXCHANGE_RATE: "text-amber-700 bg-amber-100",
  ASSET_CATEGORY: "text-pink-700 bg-pink-100",
};

type AuditLogEntry = {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  actor: string | null;
  details: string | null;
  createdAt: string; // serialized from server
};

type HistoryContentProps = {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
  entityType: string;
  action: string;
  from: string;
  to: string;
  q: string;
  entityId?: number;
};

function useEntityLabels(): Record<string, string> {
  const { t } = useTranslation();
  return {
    LICENSE: t.license.title,
    ASSET: t.asset.assetName.replace(t.common.name, "").trim() || t.nav.hardware,
    EMPLOYEE: t.employee.title,
    ASSIGNMENT: t.license.seatAssignment.includes(t.license.seat) ? t.license.seatAssignment.replace(t.license.seat, "").trim() : t.license.assignedTo,
    SEAT: t.license.seat,
    USER: t.header.user,
    ORG: t.org.title,
    ARCHIVE: t.header.archives,
    EXCHANGE_RATE: t.header.exchangeRate,
    ASSET_CATEGORY: t.header.assetCategory,
  };
}

function useActionLabels(): Record<string, string> {
  const { t } = useTranslation();
  return {
    CREATED: t.history.created,
    UPDATED: t.history.updated,
    DELETED: t.history.deleted,
    ASSIGNED: t.dashboard.assigned,
    UNASSIGNED: t.license.unassigned,
    RETURNED: t.common.back,
    REVOKED: t.license.unassign,
    IMPORTED: t.common.import,
    LOGIN: t.common.login,
    LOGOUT: t.common.logout,
    LOGIN_FAILED: t.common.failure,
    STATUS_CHANGE: t.common.status,
    MEMBER_OFFBOARD: t.employee.inactive,
    PASSWORD_RESET: t.auth.changePassword,
  };
}

export default function HistoryContent({
  logs,
  total,
  page,
  totalPages,
  entityType,
  action,
  from,
  to,
  q,
  entityId,
}: HistoryContentProps) {
  const { t, locale } = useTranslation();
  const entityLabel = useEntityLabels();
  const actionLabel = useActionLabels();

  function buildUrl(overrides: Partial<Record<string, string>>): string {
    const p = new URLSearchParams();
    const merged = {
      page: String(page),
      entityType,
      action,
      from,
      to,
      q,
      entityId: entityId ? String(entityId) : "",
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    return `/history?${p.toString()}`;
  }

  const dateLocale = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US";

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">{t.history.title}</h1>

        {/* Filters */}
        <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">{t.common.type}</label>
            <select name="entityType" defaultValue={entityType} className="input text-sm">
              {ENTITY_TYPES.map((et) => (
                <option key={et} value={et}>{et ? entityLabel[et] ?? et : t.common.all}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">{t.history.action}</label>
            <select name="action" defaultValue={action} className="input text-sm">
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{a ? actionLabel[a] ?? a : t.common.all}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">{t.common.date}</label>
            <input type="date" name="from" defaultValue={from} className="input text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">{t.common.date}</label>
            <input type="date" name="to" defaultValue={to} className="input text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">{t.common.search}</label>
            <input type="text" name="q" defaultValue={q} placeholder={`${t.common.search}...`} className="input text-sm" />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t.common.search}
          </button>
          <Link
            href="/history"
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            {t.common.reset}
          </Link>
        </form>

        {/* Results info */}
        <p className="mb-3 text-sm text-gray-500">
          {t.common.total} {total}{entityId ? ` (ID: ${entityId})` : ""}
        </p>

        {/* Table */}
        {logs.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">{t.common.noData}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.history.timestamp}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.type}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.history.entity} ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.history.action}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.history.actor}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.history.details}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  let details: Record<string, unknown> | null = null;
                  if (log.details) {
                    try { details = JSON.parse(log.details); } catch { /* ignore */ }
                  }

                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {new Date(log.createdAt).toLocaleString(dateLocale)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${entityBadge[log.entityType] ?? "text-gray-700 bg-gray-50"}`}>
                          {entityLabel[log.entityType] ?? log.entityType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-gray-600">
                        {log.entityType === "LICENSE" ? (
                          <Link href={`/licenses/${log.entityId}`} className="text-blue-600 hover:underline">
                            #{log.entityId}
                          </Link>
                        ) : log.entityType === "EMPLOYEE" ? (
                          <Link href={`/employees/${log.entityId}`} className="text-blue-600 hover:underline">
                            #{log.entityId}
                          </Link>
                        ) : log.entityType === "ASSET" ? (
                          <Link href={`/hardware/${log.entityId}`} className="text-blue-600 hover:underline">
                            #{log.entityId}
                          </Link>
                        ) : (
                          `#${log.entityId}`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${actionBadge[log.action] ?? "text-gray-700 bg-gray-50"}`}>
                          {actionLabel[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.actor ?? "\u2014"}
                      </td>
                      <td className="max-w-md px-4 py-3 text-sm text-gray-600">
                        {details ? (
                          <DetailsDiff details={details} />
                        ) : (
                          <span className="text-gray-400">{"\u2014"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                {t.common.back}
              </Link>
            )}
            <span className="text-sm text-gray-500">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
              >
                {t.common.next}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsDiff({ details }: { details: Record<string, unknown> }) {
  const { t } = useTranslation();

  if (details.summary) {
    return <span>{String(details.summary)}</span>;
  }

  // Show changed fields as before -> after
  if (details.changes && typeof details.changes === "object") {
    const changes = details.changes as Record<string, { from: unknown; to: unknown }>;
    const entries = Object.entries(changes);
    if (entries.length === 0) return <span className="text-gray-400">{t.common.noData}</span>;

    return (
      <div className="space-y-0.5">
        {entries.map(([field, { from, to }]) => (
          <div key={field} className="text-xs">
            <span className="font-medium text-gray-700">{field}:</span>{" "}
            <span className="text-red-600 line-through">{String(from ?? "\u2014")}</span>
            {" \u2192 "}
            <span className="text-green-600">{String(to ?? "\u2014")}</span>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: show JSON
  return (
    <pre className="max-w-xs truncate text-xs text-gray-500">
      {JSON.stringify(details)}
    </pre>
  );
}
