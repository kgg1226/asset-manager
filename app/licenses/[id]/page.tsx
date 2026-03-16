import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { computeCost } from "@/lib/cost-calculator";
import LicenseDetailContent from "./license-detail-content";

export const dynamic = "force-dynamic";

export default async function LicenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const { id } = await params;
  const licenseId = Number(id);

  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: {
      parent: { select: { id: true, name: true } },
      orgUnit: { select: { id: true, name: true, company: { select: { name: true } } } },
      children: {
        select: {
          id: true,
          name: true,
          licenseType: true,
          totalQuantity: true,
          expiryDate: true,
          assignments: {
            where: { returnedDate: null },
            select: { id: true },
          },
        },
        orderBy: { name: "asc" },
      },
      seats: {
        include: {
          assignments: {
            where: { returnedDate: null },
            select: {
              id: true,
              employee: { select: { id: true, name: true, department: true } },
              assignedDate: true,
            },
          },
        },
        orderBy: { id: "asc" },
      },
      assignments: {
        where: { returnedDate: null },
        include: {
          employee: { select: { id: true, name: true, department: true } },
          seat: { select: { key: true } },
        },
        orderBy: { assignedDate: "desc" },
      },
    },
  });

  if (!license) notFound();

  // Fetch users and orgUnits for renewal owner selection
  const [users, orgUnits] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, username: true },
      orderBy: { username: "asc" },
    }),
    prisma.orgUnit.findMany({
      select: { id: true, name: true, companyId: true },
      orderBy: { name: "asc" },
    }).catch(() => [] as { id: number; name: string; companyId: number }[]),
  ]);

  // Fetch history from both AssignmentHistory and AuditLog
  const [assignmentHistory, auditLogs] = await Promise.all([
    prisma.assignmentHistory.findMany({
      where: { licenseId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        reason: true,
        createdAt: true,
        employeeId: true,
        assignment: {
          select: {
            employee: { select: { name: true } },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "LICENSE", entityId: licenseId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        actor: true,
        details: true,
        createdAt: true,
      },
    }),
  ]);

  // Dashboard stats
  const activeAssignments = license.assignments;
  const isKeyBased = license.licenseType === "KEY_BASED";
  const totalSeats = isKeyBased
    ? license.seats.length || license.totalQuantity
    : license.totalQuantity;
  const assignedCount = activeAssignments.length;
  const remainingCount = totalSeats - assignedCount;
  const missingKeyCount = isKeyBased
    ? license.seats.filter((s) => s.key === null).length
    : 0;

  // Merge history entries
  type HistoryEntry = {
    id: string;
    action: string;
    description: string;
    createdAt: string;
    source: "assignment" | "audit";
  };

  const history: HistoryEntry[] = [
    ...assignmentHistory.map((h) => ({
      id: `ah-${h.id}`,
      action: h.action,
      description: (() => {
        const empName = h.assignment?.employee?.name ?? `#${h.employeeId}`;
        const actionLabel =
          h.action === "ASSIGNED"
            ? "ASSIGNED"
            : h.action === "RETURNED"
              ? "RETURNED"
              : "REVOKED";
        return `${empName} \u2014 ${actionLabel}${h.reason ? ` (${h.reason})` : ""}`;
      })(),
      createdAt: h.createdAt.toISOString(),
      source: "assignment" as const,
    })),
    ...auditLogs.map((a) => ({
      id: `al-${a.id}`,
      action: a.action,
      description: (() => {
        if (a.details) {
          try {
            const d = JSON.parse(a.details);
            if (d.summary) return d.summary as string;
          } catch {}
        }
        return `${a.action}${a.actor ? ` \u2014 ${a.actor}` : ""}`;
      })(),
      createdAt: a.createdAt.toISOString(),
      source: "audit" as const,
    })),
  ];

  history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const displayHistory = history.slice(0, 30);

  // Prepare assignment data for client component
  const assignmentData = activeAssignments.map((a) => ({
    assignmentId: a.id,
    employeeId: a.employee.id,
    employeeName: a.employee.name,
    department: a.employee.department ?? "",
    assignedDate: a.assignedDate.toLocaleDateString(),
    seatKey: a.seat?.key ?? null,
    licenseType: license.licenseType as "NO_KEY" | "KEY_BASED" | "VOLUME",
    volumeKey: license.licenseType === "VOLUME" ? license.key : null,
  }));

  // Compute cost breakdown
  const hasCostData =
    license.quantity != null &&
    license.unitPrice != null &&
    license.paymentCycle != null;

  const costBreakdown = hasCostData
    ? computeCost({
        paymentCycle: license.paymentCycle!,
        quantity: license.quantity!,
        unitPrice: license.unitPrice!,
        currency: license.currency,
        exchangeRate: license.exchangeRate,
        isVatIncluded: license.isVatIncluded,
      })
    : null;

  // Serialize data for client
  const serializedLicense = {
    name: license.name,
    licenseType: license.licenseType,
    key: license.key,
    description: license.description,
    vendor: license.vendor,
    contractFile: license.contractFile,
    contractFileName: license.contractFileName,
    quotationFile: license.quotationFile,
    quotationFileName: license.quotationFileName,
    purchaseDate: license.purchaseDate?.toISOString() ?? null,
    expiryDate: license.expiryDate?.toISOString() ?? null,
    price: license.price,
    adminName: license.adminName,
    noticePeriodDays: license.noticePeriodDays,
    quantity: license.quantity,
    unitPrice: license.unitPrice,
    paymentCycle: license.paymentCycle,
    currency: license.currency,
    exchangeRate: license.exchangeRate,
    isVatIncluded: license.isVatIncluded,
    renewalStatus: (license as any).renewalStatus ?? null,
    renewalDate: (license as any).renewalDate ? new Date((license as any).renewalDate).toISOString() : null,
    renewalDateManual: (license as any).renewalDateManual ? new Date((license as any).renewalDateManual).toISOString() : null,
    parent: license.parent,
    orgUnit: license.orgUnit,
  };

  const serializedSeats = license.seats.map((seat) => ({
    id: seat.id,
    key: seat.key,
    assignments: seat.assignments.map((a) => ({
      id: a.id,
      employee: a.employee,
      assignedDate: a.assignedDate.toISOString(),
    })),
  }));

  const serializedChildren = license.children.map((child) => ({
    id: child.id,
    name: child.name,
    licenseType: child.licenseType,
    totalQuantity: child.totalQuantity,
    expiryDate: child.expiryDate?.toISOString() ?? null,
    assignments: child.assignments,
  }));

  return (
    <LicenseDetailContent
      licenseId={licenseId}
      license={serializedLicense}
      seats={serializedSeats}
      children={serializedChildren}
      childrenSecond={serializedChildren}
      assignmentData={assignmentData}
      displayHistory={displayHistory}
      costBreakdown={costBreakdown ? {
        totalAmountForeign: costBreakdown.totalAmountForeign,
        monthlyKRW: costBreakdown.monthlyKRW,
        annualKRW: costBreakdown.annualKRW,
      } : null}
      hasCostData={hasCostData}
      totalSeats={totalSeats}
      assignedCount={assignedCount}
      remainingCount={remainingCount}
      missingKeyCount={missingKeyCount}
      isKeyBased={isKeyBased}
      isLoggedIn={!!user}
      users={users}
      orgUnits={orgUnits}
    />
  );
}
