import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getAllAppSettings,
  setAppSetting,
  APP_SETTINGS,
  APP_SETTING_KEYS,
} from "@/lib/system-config";

/** GET /api/admin/feature-flags — 모든 앱 설정 조회 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const settings = await getAllAppSettings();
  return NextResponse.json({ settings, definitions: APP_SETTINGS });
}

/** PUT /api/admin/feature-flags — 앱 설정 업데이트 */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await request.json();
  const { key, value } = body as { key: string; value: string };

  if (!APP_SETTING_KEYS.includes(key)) {
    return NextResponse.json({ error: "유효하지 않은 설정 키입니다." }, { status: 400 });
  }

  // 유효성 검사
  const def = APP_SETTINGS.find(s => s.key === key);
  if (def?.type === "number") {
    const num = Number(value);
    if (isNaN(num)) return NextResponse.json({ error: "숫자를 입력해주세요." }, { status: 400 });
    if (def.min !== undefined && num < def.min) return NextResponse.json({ error: `최소 ${def.min} 이상이어야 합니다.` }, { status: 400 });
    if (def.max !== undefined && num > def.max) return NextResponse.json({ error: `최대 ${def.max} 이하여야 합니다.` }, { status: 400 });
  }

  if (def?.type === "numberArray") {
    try {
      const arr = JSON.parse(value);
      if (!Array.isArray(arr) || !arr.every((n: unknown) => typeof n === "number")) {
        return NextResponse.json({ error: "숫자 배열 형식이 필요합니다." }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "JSON 형식이 올바르지 않습니다." }, { status: 400 });
    }
  }

  await setAppSetting(key, value, user.id);

  return NextResponse.json({ ok: true, key, value });
}
