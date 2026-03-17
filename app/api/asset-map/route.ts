import { NextRequest, NextResponse } from "next/server";
import { buildAssetMapData } from "@/lib/asset-map-builder";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const typesParam = searchParams.get("types");
    const types = typesParam ? typesParam.split(",").filter(Boolean) : undefined;

    const orgUnitIdParam = searchParams.get("orgUnitId");
    const orgUnitId = orgUnitIdParam ? parseInt(orgUnitIdParam, 10) : undefined;

    const search = searchParams.get("search") || undefined;

    const data = await buildAssetMapData({ types, orgUnitId, search });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Asset map API error:", error);
    return NextResponse.json(
      { error: "자산지도 데이터를 불러오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
