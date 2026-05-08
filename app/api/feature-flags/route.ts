import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllFeatureFlags } from "@/lib/system-config";

/** GET /api/feature-flags — 현재 사용자에게 적용할 기능 플래그 (인증 필요) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const flags = await getAllFeatureFlags();

  // 정책: 내용연수/감가상각 등 라이프사이클 정보는 SUPER_ADMIN 만 항상 노출.
  // ADMIN/USER 는 LIFECYCLE_VISIBLE_TO_USER 플래그(/admin/feature-flags)에 따라 제어.
  if (user.isSuperAdmin) {
    return NextResponse.json({
      lifecycleVisible: true,
    });
  }

  return NextResponse.json({
    lifecycleVisible: flags.LIFECYCLE_VISIBLE_TO_USER,
  });
}
