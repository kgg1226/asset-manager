import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ReportDetailClient from "./report-detail-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ yearMonth: string }> };

export default async function ReportDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) return notFound();

  const { yearMonth } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) return notFound();

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  let data: {
    period: string;
    startDate: string;
    endDate: string;
    summary: { totalMonthlyCost: number; assetCount: number };
    byType: { type: string; count: number; cost: number }[];
    byStatus: { status: string; count: number; cost: number }[];
    byDepartment: { department: string; count: number; cost: number }[];
    expiringCount: number;
    assetDetails: {
      id: string;
      name: string;
      type: string;
      status: string;
      vendor: string | null;
      monthlyCost: number | null;
      expiryDate: string | null;
      assignee: { id: string; name: string } | null;
      department: string | null;
    }[];
  } | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/reports/monthly/${yearMonth}/data`, {
      headers: { Cookie: "" },
      cache: "no-store",
    });
    if (res.ok) {
      data = await res.json();
    }
  } catch {
    // fallback: data remains null
  }

  return <ReportDetailClient yearMonth={yearMonth} data={data} />;
}
