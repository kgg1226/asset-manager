// BE-078: /api/archives — 증적 이력 목록 조회 + 수동 실행

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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { yearMonth, categoryId } = body as { yearMonth?: string; categoryId?: number };

  if (!yearMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
    return NextResponse.json({ error: "yearMonth 형식: YYYY-MM" }, { status: 400 });
  }

  const [year, month] = yearMonth.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const assets = await prisma.asset.findMany({
    where: {
      createdAt: { lte: endDate },
      OR: [
        { status: { not: "DISPOSED" } },
        { status: "DISPOSED", updatedAt: { gte: startDate } },
      ],
    },
    include: {
      assignee: { select: { name: true, department: true } },
      orgUnit: { select: { name: true } },
    },
  });

  const archive = await prisma.archive.create({
    data: {
      yearMonth,
      status: "COMPLETED",
      trigger: "manual",
      startDate,
      endDate,
      createdBy: user.id,
      completedAt: new Date(),
      categoryId: categoryId ?? null,
      data: {
        create: {
          dataType: "assets",
          payload: assets.map((a) => ({
            id: a.id, name: a.name, type: a.type, status: a.status,
            vendor: a.vendor,
            monthlyCost: a.monthlyCost ? Number(a.monthlyCost) : null,
            currency: a.currency,
            assignee: a.assignee?.name ?? null,
            department: a.orgUnit?.name ?? a.assignee?.department ?? null,
            expiryDate: a.expiryDate?.toISOString() ?? null,
            purchaseDate: a.purchaseDate?.toISOString() ?? null,
          })),
          recordCount: assets.length,
        },
      },
      logs: {
        create: {
          level: "info",
          message: `수동 증적 생성 — ${assets.length}건 (${yearMonth})`,
        },
      },
    },
    include: {
      data: { select: { dataType: true, recordCount: true } },
      logs: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(archive, { status: 201 });
}
