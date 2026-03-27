import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllFeatureFlags } from "@/lib/system-config";

/** GET /api/feature-flags — 현재 사용자에게 적용할 기능 플래그 (인증 필요) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const flags = await getAllFeatureFlags();

  // 관리자는 항상 모든 기능 보임
  if (user.role === "ADMIN") {
    return NextResponse.json({
      lifecycleVisible: true,
    });
  }

  // 일반 사용자: 플래그에 따라 제어
  return NextResponse.json({
    lifecycleVisible: flags.LIFECYCLE_VISIBLE_TO_USER,
  });
}
