import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllFeatureFlags, setFeatureFlag, type FeatureFlagKey, FEATURE_FLAG_KEYS } from "@/lib/system-config";

/** GET /api/admin/feature-flags — 모든 기능 플래그 조회 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const flags = await getAllFeatureFlags();
  return NextResponse.json(flags);
}

/** PUT /api/admin/feature-flags — 기능 플래그 업데이트 */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const { key, enabled } = body as { key: string; enabled: boolean };

  if (!FEATURE_FLAG_KEYS.includes(key as FeatureFlagKey)) {
    return NextResponse.json({ error: "유효하지 않은 플래그 키입니다." }, { status: 400 });
  }

  await setFeatureFlag(key as FeatureFlagKey, enabled, user.id);

  return NextResponse.json({ ok: true, key, enabled });
}
