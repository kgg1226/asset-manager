// GET  /api/admin/archives/[id]/export — 증적 Excel 직접 다운로드 (기본 경로, dev-034)
// POST /api/admin/archives/[id]/export — 증적 파일 생성 및 Google Drive 업로드 (보조)
// 워크북 생성은 lib/archive-export.ts 단일 출처를 공유한다.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isGoogleDriveConfiguredAsync, uploadToGoogleDrive } from "@/lib/google-drive";
import { buildArchiveWorkbook } from "@/lib/archive-export";

type Params = { params: Promise<{ id: string }> };

async function loadCompletedArchive(id: string) {
  const archiveId = Number(id);
  if (isNaN(archiveId)) {
    return { error: NextResponse.json({ error: "잘못된 ID입니다." }, { status: 400 }) } as const;
  }
  const archive = await prisma.archive.findUnique({
    where: { id: archiveId },
    include: { data: true },
  });
  if (!archive) {
    return { error: NextResponse.json({ error: "증적을 찾을 수 없습니다." }, { status: 404 }) } as const;
  }
  if (archive.status !== "COMPLETED") {
    return { error: NextResponse.json({ error: "완료된 증적만 내보낼 수 있습니다." }, { status: 400 }) } as const;
  }
  return { archive, archiveId } as const;
}

// ── 직접 다운로드 (GDrive 설정과 무관하게 항상 동작) ──
// proxy.ts 는 GET 을 비인증 통과시키므로 핸들러 자체 가드가 필수 (lessons 준수)
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireAdmin();
  const { id } = await params;

  const loaded = await loadCompletedArchive(id);
  if ("error" in loaded) return loaded.error;
  const { archive, archiveId } = loaded;

  try {
    const { buffer, fileName } = await buildArchiveWorkbook(archive);

    await prisma.archiveLog.create({
      data: { archiveId, level: "info", message: `Excel 다운로드 (${user.username})` },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Archive download failed:", error);
    return NextResponse.json({ error: `다운로드에 실패했습니다: ${msg}` }, { status: 500 });
  }
}

// ── Google Drive 업로드 (보조 — 기존 동작 보존) ──
export async function POST(_request: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  const loaded = await loadCompletedArchive(id);
  if ("error" in loaded) return loaded.error;
  const { archive, archiveId } = loaded;

  try {
    let fileUrl: string | null = null;

    if (await isGoogleDriveConfiguredAsync()) {
      const { buffer, fileName } = await buildArchiveWorkbook(archive);
      fileUrl = await uploadToGoogleDrive(
        buffer,
        fileName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        archive.yearMonth
      );

      await prisma.archive.update({
        where: { id: archiveId },
        data: { excelUrl: fileUrl, fileUrl },
      });

      await prisma.archiveLog.create({
        data: { archiveId, level: "info", message: `Google Drive 업로드 완료: ${fileUrl}` },
      });
    } else {
      await prisma.archiveLog.create({
        data: { archiveId, level: "warn", message: "Google Drive 환경변수가 설정되지 않아 업로드를 건너뜁니다." },
      });
    }

    return NextResponse.json({
      ok: true,
      fileUrl,
      driveConfigured: await isGoogleDriveConfiguredAsync(),
      message: await isGoogleDriveConfiguredAsync() ? "Google Drive 업로드 완료" : "Google Drive 미설정 — 업로드 건너뜀",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Archive export failed:", error);
    await prisma.archiveLog.create({
      data: { archiveId, level: "error", message: `내보내기 실패: ${msg}` },
    }).catch(() => {});
    return NextResponse.json({ error: `내보내기에 실패했습니다: ${msg}` }, { status: 500 });
  }
}
