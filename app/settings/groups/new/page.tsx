import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import NewPageClient from "./new-page-client";

export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  const licenses = await prisma.license.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <NewPageClient licenses={licenses} />;
}
