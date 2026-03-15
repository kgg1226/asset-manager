import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import EditPageClient from "./edit-page-client";

export const dynamic = "force-dynamic";

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  const { id } = await params;
  const group = await prisma.licenseGroup.findUnique({
    where: { id: Number(id) },
    include: { members: true },
  });

  if (!group) notFound();

  const licenses = await prisma.license.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const serializedGroup = {
    id: group.id,
    name: group.name,
    description: group.description,
    isDefault: group.isDefault,
    members: group.members.map((m) => ({ licenseId: m.licenseId })),
  };

  return <EditPageClient group={serializedGroup} licenses={licenses} />;
}
