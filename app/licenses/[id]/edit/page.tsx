import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import EditLicenseForm from "./edit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditLicensePage({ params }: Props) {
  const editUser = await getCurrentUser().catch(() => null);
  if (!editUser) redirect("/login");
  const { id } = await params;
  const license = await prisma.license.findUnique({
    where: { id: Number(id) },
    include: {
      seats: {
        include: {
          assignments: {
            where: { returnedDate: null },
            select: {
              id: true,
              employee: { select: { name: true, department: true } },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!license) notFound();

  // Count active assignments (for license type change warning)
  const activeAssignmentCount = await prisma.assignment.count({
    where: { licenseId: Number(id), returnedDate: null },
  });

  const seats = license.seats.map((s) => ({
    id: s.id,
    key: s.key,
    assignedTo: s.assignments[0]
      ? { name: s.assignments[0].employee.name, department: s.assignments[0].employee.department }
      : null,
  }));

  // Parent license candidates (excluding self; already-child licenses cannot be parent)
  const allLicenses = await prisma.license.findMany({
    where: { id: { not: Number(id) }, parentId: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <EditLicenseForm license={license} seats={seats} allLicenses={allLicenses} activeAssignmentCount={activeAssignmentCount} />;
}
