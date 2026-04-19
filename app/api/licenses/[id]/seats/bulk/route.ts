// POST /api/licenses/:id/seats/bulk — 라이선스 시트 키 일괄 추가 (관리자 전용)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  const licenseId = Number(id);

  const body = await request.json().catch(() => null);
  const rawKeys: string[] = body?.keys;

  if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
    return NextResponse.json({ error: "keys 배열이 필요합니다." }, { status: 400 });
  }

  const keys = rawKeys.map((k) => String(k).trim()).filter(Boolean);
  if (keys.length === 0) return NextResponse.json({ error: "유효한 키가 없습니다." }, { status: 400 });
  if (keys.length > 500) return NextResponse.json({ error: "한 번에 최대 500개까지 추가할 수 있습니다." }, { status: 400 });

  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    select: { id: true, name: true, licenseType: true },
  });
  if (!license) return NextResponse.json({ error: "라이선스를 찾을 수 없습니다." }, { status: 404 });
  if (license.licenseType !== "KEY_BASED") {
    return NextResponse.json({ error: "KEY_BASED 라이선스에만 적용됩니다." }, { status: 400 });
  }

  // Check for duplicates within the batch
  const unique = new Set(keys);
  if (unique.size < keys.length) {
    const duped = keys.filter((k, i) => keys.indexOf(k) !== i);
    return NextResponse.json({ error: `배치 내 중복 키: ${[...new Set(duped)].slice(0, 5).join(", ")}` }, { status: 400 });
  }

  // Check existing keys in DB
  const existing = await prisma.licenseSeat.findMany({
    where: { key: { in: keys } },
    select: { key: true, license: { select: { name: true } } },
  });
  if (existing.length > 0) {
    const conflicts = existing.map((e) => `"${e.key}" (${e.license.name})`).slice(0, 5).join(", ");
    return NextResponse.json({ error: `이미 등록된 키: ${conflicts}` }, { status: 409 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const seats = await tx.licenseSeat.createMany({
      data: keys.map((key) => ({ licenseId, key })),
    });

    await writeAuditLog(tx, {
      entityType: "SEAT",
      entityId: licenseId,
      action: "CREATED",
      actor: user.username,
      actorType: "USER",
      actorId: user.id,
      details: {
        summary: `${license.name} 시트 키 일괄 추가 ${keys.length}개`,
        licenseId,
        count: keys.length,
      },
    });

    return seats;
  });

  return NextResponse.json({ created: created.count });
}
