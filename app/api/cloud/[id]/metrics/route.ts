// GET  — 클라우드 자산 사용량 메트릭 조회
// POST — 사용량 메트릭 수동 입력 또는 자동 수집 결과 저장

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/cloud/[id]/metrics ──
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const assetId = Number(id);
    if (isNaN(assetId))
      return NextResponse.json({ error: "유효하지 않은 ID" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const metricName = searchParams.get("metric"); // 특정 메트릭 필터
    const days = Number(searchParams.get("days") || "30"); // 기간 (기본 30일)

    const since = new Date();
    since.setDate(since.getDate() - days);

    const cloudDetail = await prisma.cloudDetail.findUnique({
      where: { assetId },
      select: { id: true },
    });
    if (!cloudDetail)
      return NextResponse.json({ error: "클라우드 자산을 찾을 수 없습니다." }, { status: 404 });

    const metrics = await prisma.cloudUsageMetric.findMany({
      where: {
        cloudDetailId: cloudDetail.id,
        ...(metricName && { metricName }),
        periodStart: { gte: since },
      },
      orderBy: { periodStart: "asc" },
    });

    // 메트릭 이름별 그룹핑
    const grouped: Record<string, typeof metrics> = {};
    for (const m of metrics) {
      if (!grouped[m.metricName]) grouped[m.metricName] = [];
      grouped[m.metricName].push(m);
    }

    return NextResponse.json({ metrics: grouped });
  } catch (error) {
    console.error("Failed to fetch cloud metrics:", error);
    return NextResponse.json({ error: "메트릭 조회 실패" }, { status: 500 });
  }
}

// ── POST /api/cloud/[id]/metrics ──
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const { id } = await params;
    const assetId = Number(id);
    if (isNaN(assetId))
      return NextResponse.json({ error: "유효하지 않은 ID" }, { status: 400 });

    const body = await request.json();

    const cloudDetail = await prisma.cloudDetail.findUnique({
      where: { assetId },
      select: { id: true },
    });
    if (!cloudDetail)
      return NextResponse.json({ error: "클라우드 자산을 찾을 수 없습니다." }, { status: 404 });

    // 단건 또는 배열 입력 지원
    const items = Array.isArray(body) ? body : [body];

    const created = await prisma.cloudUsageMetric.createMany({
      data: items.map((item: Record<string, unknown>) => ({
        cloudDetailId: cloudDetail.id,
        metricName: String(item.metricName || ""),
        metricValue: Number(item.metricValue || 0),
        metricUnit: item.metricUnit ? String(item.metricUnit) : null,
        periodStart: new Date(item.periodStart as string),
        periodEnd: item.periodEnd ? new Date(item.periodEnd as string) : null,
        source: String(item.source || "MANUAL"),
      })),
    });

    return NextResponse.json({ created: created.count }, { status: 201 });
  } catch (error) {
    console.error("Failed to save cloud metrics:", error);
    return NextResponse.json({ error: "메트릭 저장 실패" }, { status: 500 });
  }
}
