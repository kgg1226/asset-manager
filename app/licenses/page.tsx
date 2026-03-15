import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import LicensesContent from "./licenses-content";

export const dynamic = "force-dynamic";

type SortField = "name" | "totalQuantity" | "assigned" | "expiryDate";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 50;

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string; page?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const params = await searchParams;
  const sortField = (["name", "totalQuantity", "assigned", "expiryDate"].includes(params.sort ?? "")
    ? params.sort
    : "expiryDate") as SortField;
  const sortOrder = (params.order === "asc" || params.order === "desc" ? params.order : "asc") as SortOrder;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const [licenses, totalCount] = await Promise.all([
    prisma.license.findMany({
      skip,
      take: ITEMS_PER_PAGE,
      select: {
        id: true,
        name: true,
        licenseType: true,
        totalQuantity: true,
        totalAmountKRW: true,
        paymentCycle: true,
        purchaseDate: true,
        expiryDate: true,
        noticePeriodDays: true,
        adminName: true,
        parentId: true,
        children: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        assignments: {
          where: { returnedDate: null },
          select: {
            id: true,
            employeeId: true,
            employee: { select: { name: true, department: true } },
          },
        },
        seats: {
          select: {
            id: true,
            key: true,
          },
        },
      },
    }),
    prisma.license.count(),
  ]);

  const enriched = licenses.map((license) => {
    const assignedCount = license.assignments.length;
    const maxCapacity = license.licenseType === "KEY_BASED"
      ? license.seats.length || license.totalQuantity
      : license.totalQuantity;
    const missingKeyCount = license.licenseType === "KEY_BASED"
      ? license.seats.filter((s) => s.key === null).length
      : 0;
    return {
      ...license,
      assignedCount,
      maxCapacity,
      missingKeyCount,
      remainingCount: maxCapacity - assignedCount,
      assignedEmployeeIds: license.assignments.map((a) => a.employeeId),
      assignedEmployees: license.assignments.map((a) => ({
        assignmentId: a.id,
        employeeId: a.employeeId,
        employeeName: a.employee.name,
        department: a.employee.department,
      })),
    };
  });

  // Hierarchy sort: parents first, children right below parent
  const childrenMap = new Map<number, typeof enriched>();
  const roots: typeof enriched = [];
  for (const lic of enriched) {
    if (lic.parentId == null) {
      roots.push(lic);
    } else {
      const siblings = childrenMap.get(lic.parentId) ?? [];
      siblings.push(lic);
      childrenMap.set(lic.parentId, siblings);
    }
  }
  const hierarchySorted: (typeof enriched[number] & { depth: number })[] = [];
  function walkLicenses(items: typeof enriched, depth: number) {
    for (const lic of items) {
      hierarchySorted.push({ ...lic, depth });
      const kids = childrenMap.get(lic.id);
      if (kids) walkLicenses(kids, depth + 1);
    }
  }
  // Apply sort then hierarchy walk
  enriched.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "name":
        cmp = a.name.localeCompare(b.name, "ko");
        break;
      case "totalQuantity":
        cmp = a.totalQuantity - b.totalQuantity;
        break;
      case "assigned":
        cmp = a.assignedCount - b.assignedCount;
        break;
      case "expiryDate": {
        const aTime = a.expiryDate?.getTime() ?? Infinity;
        const bTime = b.expiryDate?.getTime() ?? Infinity;
        cmp = aTime - bTime;
        break;
      }
    }
    return sortOrder === "desc" ? -cmp : cmp;
  });
  walkLicenses(roots, 0);
  // Add orphan items (parentId not in current page)
  for (const lic of enriched) {
    if (!hierarchySorted.find((h) => h.id === lic.id)) {
      hierarchySorted.push({ ...lic, depth: 0 });
    }
  }

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  });

  // Serialize dates for client component
  const serializedLicenses = hierarchySorted.map((lic) => ({
    ...lic,
    purchaseDate: lic.purchaseDate?.toISOString() ?? null,
    expiryDate: lic.expiryDate?.toISOString() ?? null,
    children: undefined,
    assignments: undefined,
    seats: undefined,
  }));

  return (
    <LicensesContent
      licenses={serializedLicenses as any}
      employees={employees.map(e => ({ ...e, department: e.department ?? "" }))}
      totalCount={totalCount}
      currentPage={currentPage}
      itemsPerPage={ITEMS_PER_PAGE}
      sortField={sortField}
      sortOrder={sortOrder}
      isLoggedIn={!!user}
    />
  );
}
