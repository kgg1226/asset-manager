import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UsersPageClient from "./users-page-client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; role?: string }>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const me = await requireAdmin();
  const { q, role } = await searchParams;

  const roleFilter =
    role === "ADMIN" || role === "USER" ? role : undefined;

  const users = await prisma.user.findMany({
    where: {
      AND: [
        q ? { username: { contains: q } } : {},
        roleFilter ? { role: roleFilter } : {},
      ],
    },
    select: {
      id:        true,
      username:  true,
      role:      true,
      isActive:  true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <UsersPageClient
      users={users as Parameters<typeof UsersPageClient>[0]["users"]}
      currentUserId={me.id}
      q={q}
      role={role}
    />
  );
}
