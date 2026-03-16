import { prisma } from "@/lib/prisma";
import { getEmployeeDisplayNames } from "@/lib/employee-display";
import { getCurrentUser } from "@/lib/auth";
import EmployeesContent from "./employees-content";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; unassigned?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = (["ACTIVE", "OFFBOARDING"].includes(params.status ?? "")
    ? params.status
    : null) as "ACTIVE" | "OFFBOARDING" | null;
  const unassigned = params.unassigned === "true";

  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [{ name: { contains: query, mode: "insensitive" } }, { department: { contains: query, mode: "insensitive" } }];
  }

  if (status) {
    where.status = status;
  }

  const employees = await prisma.employee.findMany({
    where,
    include: {
      assignments: {
        where: { returnedDate: null },
      },
    },
    orderBy: { name: "asc" },
  });

  const filtered = unassigned ? employees.filter((e) => e.assignments.length === 0) : employees;

  const displayNames = getEmployeeDisplayNames(
    filtered.map((e) => ({ id: e.id, name: e.name, email: e.email }))
  );

  // Serialize for client component
  const employeesData = employees.map((e) => ({
    id: e.id,
    name: e.name,
    department: e.department,
    email: e.email,
    status: (e as { status?: string }).status ?? "ACTIVE",
    assignmentCount: e.assignments.length,
  }));

  const filteredData = filtered.map((e) => ({
    id: e.id,
    name: e.name,
    department: e.department,
    email: e.email,
    status: (e as { status?: string }).status ?? "ACTIVE",
    assignmentCount: e.assignments.length,
  }));

  return (
    <EmployeesContent
      employees={employeesData}
      filtered={filteredData}
      displayNames={displayNames}
      query={query}
      status={status}
      unassigned={unassigned}
      isLoggedIn={!!user}
    />
  );
}
