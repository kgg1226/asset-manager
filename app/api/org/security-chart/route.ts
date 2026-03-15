import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

// GET /api/org/security-chart — 정보보호 조직도 전체 조회
export async function GET() {
  try {
    const nodes = await prisma.securityOrgChart.findMany({
      include: {
        employee: {
          select: { id: true, name: true, department: true, title: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(nodes);
  } catch (error) {
    console.error("Failed to fetch security org chart:", error);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// POST /api/org/security-chart — 노드(직책) 생성
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const body = await request.json();
    const title = (body.title as string)?.trim();
    if (!title) return NextResponse.json({ error: "직책명은 필수입니다." }, { status: 400 });

    const parentId = body.parentId ? Number(body.parentId) : null;
    const employeeId = body.employeeId ? Number(body.employeeId) : null;

    // 부모 노드 존재 확인
    if (parentId) {
      const parent = await prisma.securityOrgChart.findUnique({ where: { id: parentId } });
      if (!parent) return NextResponse.json({ error: "상위 노드를 찾을 수 없습니다." }, { status: 404 });
    }

    // 같은 부모 아래 다음 sortOrder
    const maxSort = await prisma.securityOrgChart.aggregate({
      where: { parentId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const node = await prisma.$transaction(async (tx) => {
      const created = await tx.securityOrgChart.create({
        data: { title, parentId, employeeId, sortOrder },
        include: {
          employee: { select: { id: true, name: true, department: true, title: true } },
        },
      });

      await writeAuditLog(tx, {
        entityType: "ORG",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { type: "SecurityOrgChart", title, parentId },
      });

      return created;
    });

    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    console.error("Failed to create security org node:", error);
    return NextResponse.json({ error: "생성에 실패했습니다." }, { status: 500 });
  }
}
