// GET /api/admin/gdrive-config — Google Drive 설정 상태 조회
// PUT /api/admin/gdrive-config — Google Drive 설정 저장
// DELETE /api/admin/gdrive-config — Google Drive 설정 삭제 (개별 키)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getGDriveConfigStatus,
  setConfigValue,
  deleteConfigValue,
  GDRIVE_KEYS,
  type GDriveConfigKey,
} from "@/lib/system-config";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const status = await getGDriveConfigStatus();
    return NextResponse.json({ config: status });
  } catch (error) {
    console.error("Failed to get gdrive config:", error);
    return NextResponse.json(
      { error: "설정 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();
    const updates: Record<string, string> = body.config ?? {};

    for (const [key, value] of Object.entries(updates)) {
      if (!GDRIVE_KEYS.includes(key as GDriveConfigKey)) continue;
      if (typeof value === "string" && value.trim()) {
        await setConfigValue(key as GDriveConfigKey, value.trim(), user.id);
      }
    }

    const status = await getGDriveConfigStatus();
    return NextResponse.json({ config: status });
  } catch (error) {
    console.error("Failed to save gdrive config:", error);
    return NextResponse.json(
      { error: "설정 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key || !GDRIVE_KEYS.includes(key as GDriveConfigKey)) {
      return NextResponse.json({ error: "유효하지 않은 키입니다." }, { status: 400 });
    }

    await deleteConfigValue(key as GDriveConfigKey);
    const status = await getGDriveConfigStatus();
    return NextResponse.json({ config: status });
  } catch (error) {
    console.error("Failed to delete gdrive config:", error);
    return NextResponse.json(
      { error: "설정 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
