import { prisma } from "@/lib/prisma";
import { getEmployeeDisplayNames } from "@/lib/employee-display";
import { getCurrentUser } from "@/lib/auth";
import EmployeesContent from "./employees-content";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const SORT_FIELDS = ["name", "department", "status"] as const;
type SortField = (typeof SORT_FIELDS)[number];

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; unassigned?: string; page?: string; sort?: string; order?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = (["ACTIVE", "OFFBOARDING"].includes(params.status ?? "")
    ? params.status
    : null) as "ACTIVE" | "OFFBOARDING" | null;
  const unassigned = params.unassigned === "true";
  const sort: SortField = (SORT_FIELDS as readonly string[]).includes(params.sort ?? "")
    ? (params.sort as SortField)
    : "name";
  const order: "asc" | "desc" = params.order === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [{ name: { contains: query, mode: "insensitive" } }, { department: { contains: query, mode: "insensitive" } }];
  }

  if (status) {
    where.status = status;
  }

  // 미할당 필터는 DB 레벨에서 적용해야 페이지네이션 total 이 정확하다.
  if (unassigned) {
    where.assignments = { none: { returnedDate: null } };
  }

  const total = await prisma.employee.count({ where });

  const employees = await prisma.employee.findMany({
    where,
    include: {
      assignments: {
        where: { returnedDate: null },
      },
    },
    orderBy: { [sort]: order },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  // 표시명 disambiguation 은 현재 페이지 내 동명이인 기준 (페이지 경계 너머는 edge case)
  const displayNames = getEmployeeDisplayNames(
    employees.map((e) => ({ id: e.id, name: e.name, email: e.email }))
  );

  const rows = employees.map((e) => ({
    id: e.id,
    name: e.name,
    department: e.department,
    email: e.email,
    status: (e as { status?: string }).status ?? "ACTIVE",
    assignmentCount: e.assignments.length,
  }));

  return (
    <EmployeesContent
      rows={rows}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      displayNames={displayNames}
      query={query}
      status={status}
      unassigned={unassigned}
      sort={sort}
      order={order}
      isLoggedIn={!!user}
    />
  );
}
