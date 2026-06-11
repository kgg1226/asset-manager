// GET /api/asset-classifications — 자산분류체계 트리 조회 (로그인 사용자 공용, dev-037)
// 관리 CRUD 는 /api/admin/asset-classifications (ADMIN 전용) 그대로 두고,
// 자산 폼의 분류 선택용 읽기 전용 경로만 개방한다.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";

export async function GET() {
  // proxy.ts 는 GET 을 비인증 통과시키므로 핸들러 자체 가드 필수 (lessons 준수)
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED");

  const categories = await prisma.assetMajorCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      subCategories: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, code: true },
      },
    },
  });

  return NextResponse.json({ categories });
}
