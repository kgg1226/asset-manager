import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import GroupsListClient from "./groups-list-client";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await getCurrentUser().catch(() => null);
  const groups = await prisma.licenseGroup.findMany({
    include: { members: true },
    orderBy: { name: "asc" },
  });

  const serializedGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    isDefault: g.isDefault,
    members: g.members.map((m) => ({ licenseId: m.licenseId })),
  }));

  return <GroupsListClient groups={serializedGroups} hasUser={!!user} />;
}
