import { prisma } from "@/lib/prisma";
import Link from "next/link";
import HistoryTourWrapper from "./history-tour-wrapper";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ENTITY_TYPES = ["", "LICENSE", "ASSET", "EMPLOYEE", "ASSIGNMENT", "SEAT", "USER", "ORG", "ARCHIVE", "EXCHANGE_RATE", "ASSET_CATEGORY"] as const;
const ACTIONS = ["", "CREATED", "UPDATED", "DELETED", "ASSIGNED", "UNASSIGNED", "RETURNED", "REVOKED", "IMPORTED", "LOGIN", "LOGOUT", "LOGIN_FAILED", "STATUS_CHANGE", "MEMBER_OFFBOARD", "PASSWORD_RESET"] as const;

const entityLabel: Record<string, string> = {
  LICENSE: "라이선스",
  ASSET: "자산",
  EMPLOYEE: "조직원",
  ASSIGNMENT: "할당",
  SEAT: "시트",
  USER: "사용자",
  ORG: "조직",
  ARCHIVE: "증적",
  EXCHANGE_RATE: "환율",
  ASSET_CATEGORY: "자산카테고리",
};

const actionLabel: Record<string, string> = {
  CREATED: "생성",
  UPDATED: "수정",
  DELETED: "삭제",
  ASSIGNED: "할당",
  UNASSIGNED: "해제",
  RETURNED: "반납",
  REVOKED: "회수",
  IMPORTED: "가져오기",
  LOGIN: "로그인",
  LOGOUT: "로그아웃",
  LOGIN_FAILED: "로그인 실패",
  STATUS_CHANGE: "상태 변경",
  MEMBER_OFFBOARD: "퇴사 처리",
  PASSWORD_RESET: "비밀번호 초기화",
};

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

type SearchParams = {
  page?: string;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  q?: string;
  entityId?: string;
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const entityType = params.entityType || "";
  const action = params.action || "";
  const from = params.from || "";
  const to = params.to || "";
  const q = params.q || "";
  const entityId = params.entityId ? Number(params.entityId) : undefined;

  // Build where clause
  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (entityId) where.entityId = entityId;
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    where.createdAt = dateFilter;
  }
  if (q) {
    where.OR = [
      { details: { contains: q } },
      { actor: { contains: q } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildUrl(overrides: Partial<SearchParams>): string {
    const p = new URLSearchParams();
    const merged = { page: String(page), entityType, action, from, to, q, entityId: entityId ? String(entityId) : "", ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    return `/history?${p.toString()}`;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">변경 이력</h1>
          <HistoryTourWrapper />
        </div>

        {/* Filters */}
        <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200" data-tour="history-filter">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">유형</label>
            <select name="entityType" defaultValue={entityType} className="input text-sm">
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t ? entityLabel[t] ?? t : "전체"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">액션</label>
            <select name="action" defaultValue={action} className="input text-sm">
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{a ? actionLabel[a] ?? a : "전체"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">시작일</label>
            <input type="date" name="from" defaultValue={from} className="input text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">종료일</label>
            <input type="date" name="to" defaultValue={to} className="input text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">검색어</label>
            <input type="text" name="q" defaultValue={q} placeholder="검색..." className="input text-sm" />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            검색
          </button>
          <Link
            href="/history"
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            초기화
          </Link>
        </form>

        {/* Results info */}
        <p className="mb-3 text-sm text-gray-500">
          총 {total}건{entityId ? ` (ID: ${entityId})` : ""}
        </p>

        {/* Table */}
        {logs.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">이력이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200" data-tour="history-table">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">시간</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">대상 ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">액션</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">수행자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  let details: Record<string, unknown> | null = null;
                  if (log.details) {
                    try { details = JSON.parse(log.details); } catch {}
                  }

                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {log.createdAt.toLocaleString("ko-KR")}
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
                        {log.actor ?? "—"}
                      </td>
                      <td className="max-w-md px-4 py-3 text-sm text-gray-600">
                        {details ? (
                          <DetailsDiff details={details} />
                        ) : (
                          <span className="text-gray-400">—</span>
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
                이전
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
                다음
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsDiff({ details }: { details: Record<string, unknown> }) {
  if (details.summary) {
    return <span>{String(details.summary)}</span>;
  }

  // Show changed fields as before → after
  if (details.changes && typeof details.changes === "object") {
    const changes = details.changes as Record<string, { from: unknown; to: unknown }>;
    const entries = Object.entries(changes);
    if (entries.length === 0) return <span className="text-gray-400">변경 없음</span>;

    return (
      <div className="space-y-0.5">
        {entries.map(([field, { from, to }]) => (
          <div key={field} className="text-xs">
            <span className="font-medium text-gray-700">{field}:</span>{" "}
            <span className="text-red-600 line-through">{String(from ?? "—")}</span>
            {" → "}
            <span className="text-green-600">{String(to ?? "—")}</span>
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
