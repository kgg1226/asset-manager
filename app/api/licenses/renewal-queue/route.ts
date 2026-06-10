// GET /api/licenses/renewal-queue — 갱신 조치 필요 라이선스 목록
// 만료 60일 이내이면서 renewalStatus가 RENEWED/NOT_RENEWING이 아닌 라이선스
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const days = Number(request.nextUrl.searchParams.get("days") ?? "60");
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + Math.max(1, Math.min(days, 365)));

  // 유효 갱신일 = renewalDateManual ?? renewalDate ?? expiryDate (구버전 데이터 폴백) (dev-028)
  const inWindow = { lte: cutoff, gte: now };
  const rows = await prisma.license.findMany({
    where: {
      renewalStatus: { notIn: ["RENEWED", "NOT_RENEWING"] },
      parentId: null,
      OR: [
        { renewalDateManual: inWindow },
        { renewalDateManual: null, renewalDate: inWindow },
        { renewalDateManual: null, renewalDate: null, expiryDate: inWindow },
      ],
    },
    select: {
      id: true,
      name: true,
      expiryDate: true,
      renewalDate: true,
      renewalDateManual: true,
      renewalStatus: true,
      adminName: true,
      noticePeriodDays: true,
    },
  });

  // 유효 갱신일(dueDate)로 정규화 + 정렬. 소비자(갱신 배너)는 dueDate 사용.
  const licenses = rows
    .map((l) => {
      const due = l.renewalDateManual ?? l.renewalDate ?? l.expiryDate;
      return {
        id: l.id,
        name: l.name,
        dueDate: due ? due.toISOString() : null,
        expiryDate: due ? due.toISOString() : null, // 하위호환: 기존 소비자가 expiryDate 를 읽어도 동작
        renewalStatus: l.renewalStatus,
        adminName: l.adminName,
        noticePeriodDays: l.noticePeriodDays,
      };
    })
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  return NextResponse.json({ licenses, total: licenses.length });
}
