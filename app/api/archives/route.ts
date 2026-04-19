// BE-078: GET /api/archives — 증적 이력 목록 조회

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const yearMonth = url.searchParams.get("yearMonth");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20"));

  const where = yearMonth ? { yearMonth } : {};
  const [items, total] = await Promise.all([
    prisma.archive.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, code: true } },
        data: { select: { dataType: true, recordCount: true } },
        logs: { orderBy: { createdAt: "asc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.archive.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}
