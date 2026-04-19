// GET /api/licenses/renewal-queue — 갱신 조치 필요 라이선스 목록
// 만료 60일 이내이면서 renewalStatus가 RENEWED/NOT_RENEWING이 아닌 라이선스
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const days = Number(request.nextUrl.searchParams.get("days") ?? "60");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + Math.max(1, Math.min(days, 365)));

  const licenses = await prisma.license.findMany({
    where: {
      expiryDate: { lte: cutoff, gte: new Date() },
      renewalStatus: { notIn: ["RENEWED", "NOT_RENEWING"] },
      parentId: null,
    },
    select: {
      id: true,
      name: true,
      expiryDate: true,
      renewalStatus: true,
      adminName: true,
      noticePeriodDays: true,
    },
    orderBy: { expiryDate: "asc" },
  });

  return NextResponse.json({ licenses, total: licenses.length });
}
