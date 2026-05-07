// 변경: 서버 컴포넌트로 분리 — OrgCompany 목록을 페치해 NewEmployeeForm에 전달

import { prisma } from "@/lib/prisma";
import NewEmployeeForm from "./new-employee-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewEmployeePage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");

  const [companies, titleMappings] = await Promise.all([
    prisma.orgCompany.findMany({
      include: {
        orgs: { orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.titleCiaMapping.findMany({
      select: { title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const titleOptions = titleMappings.map((m) => m.title);

  return <NewEmployeeForm companies={companies} titleOptions={titleOptions} />;
}
