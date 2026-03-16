import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getEmployeeDisplayName } from "@/lib/employee-display";
import { getCurrentUser } from "@/lib/auth";
import EmployeeDetailContent from "./employee-detail-content";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  const { id } = await params;
  const employeeId = Number(id);

  const [employee, companies, sameName] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        orgUnit: { select: { name: true } },
        company: { select: { name: true } },
        assignments: {
          include: {
            license: true,
            seat: { select: { key: true } },
          },
          orderBy: { assignedDate: "desc" },
        },
      },
    }),
    prisma.orgCompany.findMany({
      include: {
        orgs: { orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: {},
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!employee) notFound();

  const displayName = getEmployeeDisplayName(
    { id: employee.id, name: employee.name, email: employee.email },
    sameName
  );

  const assignmentHistory = await prisma.assignmentHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      licenseId: true,
      action: true,
      reason: true,
      createdAt: true,
      assignment: { select: { license: { select: { name: true } } } },
    },
  });

  const allLicenses = await prisma.license.findMany({
    select: {
      id: true,
      name: true,
      totalQuantity: true,
      assignments: {
        where: { returnedDate: null },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const activeAssignments = employee.assignments.filter((a) => !a.returnedDate);
  const pastAssignments = employee.assignments.filter((a) => a.returnedDate);

  const assignedLicenseIds = new Set(activeAssignments.map((a) => a.licenseId));
  const availableLicenses = allLicenses
    .filter((l) => !assignedLicenseIds.has(l.id) && l.totalQuantity > 0)
    .map((l) => ({
      id: l.id,
      name: l.name,
      remaining: l.totalQuantity - l.assignments.length,
    }));

  const assignedForManage = activeAssignments.map((a) => ({
    assignmentId: a.id,
    licenseId: a.licenseId,
    licenseName: a.license.name,
    licenseType: a.license.licenseType as "NO_KEY" | "KEY_BASED" | "VOLUME",
    seatKey: a.seat?.key ?? null,
    volumeKey: a.license.licenseType === "VOLUME" ? a.license.key : null,
    assignedDate: a.assignedDate.toLocaleDateString(),
    reason: a.reason,
  }));

  // Build history entries (serialize dates to strings for client)
  type HistoryEntry = {
    id: string;
    action: string;
    description: string;
    createdAt: string;
  };

  const history: HistoryEntry[] = assignmentHistory.map((h) => {
    const licenseName = h.assignment?.license?.name ?? `License #${h.licenseId}`;
    const actionLabel = h.action === "ASSIGNED" ? "할당" : h.action === "RETURNED" ? "반납" : "해제";
    return {
      id: `ah-${h.id}`,
      action: h.action,
      description: `${licenseName} — ${actionLabel}${h.reason ? ` (${h.reason})` : ""}`,
      createdAt: h.createdAt.toLocaleDateString(),
    };
  });

  history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const displayHistory = history.slice(0, 30);

  const totalHistoryCount = assignmentHistory.length;

  // Serialize past assignments
  const pastAssignmentsData = pastAssignments.map((a) => ({
    id: a.id,
    licenseId: a.licenseId,
    licenseName: a.license.name,
    assignedDate: a.assignedDate.toLocaleDateString(),
    returnedDate: a.returnedDate?.toLocaleDateString() ?? null,
  }));

  // Serialize employee data
  const employeeData = {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    title: employee.title ?? null,
    department: employee.department,
    orgUnitName: employee.orgUnit?.name ?? null,
    companyId: employee.companyId ?? null,
    orgUnitId: employee.orgUnitId ?? null,
    status: (employee as { status?: string }).status ?? "ACTIVE",
  };

  return (
    <EmployeeDetailContent
      employee={employeeData}
      displayName={displayName}
      companies={companies}
      activeAssignmentCount={activeAssignments.length}
      totalHistoryCount={totalHistoryCount}
      assignedForManage={assignedForManage}
      availableLicenses={availableLicenses}
      pastAssignments={pastAssignmentsData}
      displayHistory={displayHistory}
      isLoggedIn={!!user}
    />
  );
}
