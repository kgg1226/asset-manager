import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditLicenseForm from "./edit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditLicensePage({ params }: Props) {
  const { id } = await params;
  const licenseId = Number(id);
  const [license, allLicenses] = await Promise.all([
    prisma.license.findUnique({
      where: { id: licenseId },
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
        children: { select: { id: true } },
      },
    }),
    prisma.license.findMany({
      where: { id: { not: licenseId } },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!license) notFound();

  const seats = license.seats.map((s) => ({
    id: s.id,
    key: s.key,
    assignedTo: s.assignments[0]
      ? { name: s.assignments[0].employee.name, department: s.assignments[0].employee.department }
      : null,
  }));

  // Filter: exclude licenses that are children of this license (to prevent circular refs)
  const hasChildren = license.children.length > 0;
  const parentOptions = allLicenses
    .filter((l) => !(hasChildren && l.parentId === licenseId))
    .map((l) => ({ id: l.id, name: l.name }));

  return (
    <EditLicenseForm
      license={{ ...license, parentId: license.parentId }}
      seats={seats}
      parentOptions={parentOptions}
    />
  );
}
