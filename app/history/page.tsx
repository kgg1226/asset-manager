import { prisma } from "@/lib/prisma";
import HistoryContent from "./history-content";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

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

  // Serialize logs for client component (Date -> string)
  const serializedLogs = logs.map((log) => ({
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    actor: log.actor,
    details: log.details,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <HistoryContent
      logs={serializedLogs}
      total={total}
      page={page}
      totalPages={totalPages}
      entityType={entityType}
      action={action}
      from={from}
      to={to}
      q={q}
      entityId={entityId}
    />
  );
}
