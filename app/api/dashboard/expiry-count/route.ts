// GET /api/dashboard/expiry-count — 만료 임박 자산/라이선스 수 (30일 이내)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 });

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [assetCount, licenseCount] = await Promise.all([
    prisma.asset.count({
      where: {
        expiryDate: { gte: now, lte: in30 },
        status: { not: "DISPOSED" },
      },
    }),
    prisma.license.count({
      where: {
        expiryDate: { gte: now, lte: in30 },
      },
    }),
  ]);

  return NextResponse.json({ count: assetCount + licenseCount });
}
