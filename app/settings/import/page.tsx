import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImportPageClient from "./import-page-client";

export default async function ImportPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  return <ImportPageClient />;
}
