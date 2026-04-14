import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/search?q=keyword&limit=10&types=licenses,assets,employees
// 통합 검색 (라이선스 + 자산 + 조직원, 인증 필수)
// types 파라미터로 검색 범위 지정 가능 (미지정 시 전체)
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const limit = Math.min(20, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "10")));
    const typesParam = request.nextUrl.searchParams.get("types");
    const requestedTypes = typesParam
      ? new Set(typesParam.split(",").map((t) => t.trim()))
      : new Set(["licenses", "assets", "employees"]);

    if (!q || q.length < 1) {
      return NextResponse.json({ licenses: [], assets: [], employees: [] });
    }

    const search = { contains: q, mode: "insensitive" as const };

    const queries = {
      licenses: requestedTypes.has("licenses")
        ? prisma.license.findMany({
            where: {
              OR: [
                { name: search },
                { adminName: search },
                { description: search },
                { key: search },
                { vendor: search },
              ],
            },
            select: {
              id: true,
              name: true,
              licenseType: true,
              expiryDate: true,
              vendor: true,
              renewalStatus: true,
            },
            take: limit,
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),

      assets: requestedTypes.has("assets")
        ? prisma.asset.findMany({
            where: {
              OR: [
                { name: search },
                { vendor: search },
                { description: search },
                { hardwareDetail: { serialNumber: search } },
                { hardwareDetail: { hostname: search } },
                { hardwareDetail: { assetTag: search } },
                { domainDetail: { domainName: search } },
                { cloudDetail: { platform: search } },
                { cloudDetail: { accountId: search } },
                { cloudDetail: { resourceId: search } },
              ],
            },
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              vendor: true,
              expiryDate: true,
            },
            take: limit,
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),

      employees: requestedTypes.has("employees")
        ? prisma.employee.findMany({
            where: {
              OR: [
                { name: search },
                { email: search },
                { department: search },
                { title: search },
              ],
            },
            select: {
              id: true,
              name: true,
              department: true,
              title: true,
              email: true,
              status: true,
            },
            take: limit,
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    };

    const [licenses, assets, employees] = await Promise.all([
      queries.licenses,
      queries.assets,
      queries.employees,
    ]);

    return NextResponse.json({ licenses, assets, employees });
  } catch (error) {
    console.error("Search failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "검색에 실패했습니다." }, { status: 500 });
  }
}
