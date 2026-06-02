import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isLifecycleVisible } from "@/lib/lifecycle-visibility";

/** GET /api/feature-flags — 현재 사용자에게 적용할 기능 플래그 (인증 필요) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  // 정책: 내용연수/감가상각 등 라이프사이클 정보는 SUPER_ADMIN 만 항상 노출.
  // ADMIN/USER 는 LIFECYCLE_VISIBLE_TO_USER 플래그(/admin/feature-flags)에 따라 제어.
  // 서버 측 페이로드 마스킹(/api/assets)과 동일한 판정 헬퍼를 재사용한다.
  return NextResponse.json({
    lifecycleVisible: await isLifecycleVisible(user),
  });
}
