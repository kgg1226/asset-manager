// GET /api/reports/pii-flow — ISMS-P 개인정보 흐름표 Excel export (dev-050 #9)
//
// 노드(자산이 보유한 AssetPiiItem)와 엣지(자산 간 PII 이동 AssetLink.piiItems)를 합쳐
// "항목·처리단계·보유기간·법적근거·파기방법·관리/수탁" 6컬럼 흐름표로 내보낸다.
// 입력단(dev-050 #7: PiiItemsEditor 의 lifecycleStages/destructionMethod)이 채워져야 컬럼이 빈칸이 아니다.
//
// 인증: getCurrentUser() → 미인증 401, 비관리자 403 (api/export/all 동일 패턴).
// proxy.ts 가 GET 을 비인증 통과시키므로 핸들러에서 직접 가드 필수.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { piiItemLabel, isPiiItemKey } from "@/lib/pii-items";
import { PII_STAGE_LABEL, isPiiStage } from "@/lib/pii-stage";
import ExcelJS from "exceljs";

// AssetPiiItem.lifecycleStages(JSON 문자열) → 단계 라벨 조인. 없으면 빈 문자열.
function stageLabels(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.filter(isPiiStage).map((s) => PII_STAGE_LABEL[s]).join(", ");
    }
  } catch {
    /* ignore malformed */
  }
  return "";
}

// Asset.piiStage(단일 코드) → 라벨.
function singleStageLabel(stage: string | null | undefined): string {
  return isPiiStage(stage) ? PII_STAGE_LABEL[stage] : "";
}

// AssetLink.piiItems(JSON 배열 문자열, 레거시 콤마 문자열 하위호환) → 항목 코드/원문 배열.
function parseLinkItems(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.map(String).map((s) => s.trim()).filter(Boolean);
  } catch {
    /* fallthrough to legacy comma split */
  }
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    // ── 노드: PII 항목을 보유한 자산 ──
    const assets = await prisma.asset.findMany({
      include: {
        piiItems: { orderBy: { id: "asc" } },
        orgUnit: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    // ── 엣지: PII 가 이동하는 연결 ──
    const links = await prisma.assetLink.findMany({
      where: { piiItems: { not: null } },
      include: {
        sourceAsset: { select: { name: true, piiStage: true } },
        targetAsset: { select: { name: true, piiStage: true } },
        sourceExternal: { select: { name: true } },
        targetExternal: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: Record<string, any>[] = [];

    // 보유(노드) 행 — 자산별 PII 항목 1건당 1행
    for (const a of assets) {
      for (const p of a.piiItems) {
        const stage = stageLabels(p.lifecycleStages) || singleStageLabel(a.piiStage);
        rows.push({
          kind: "보유",
          flow: a.name,
          item: piiItemLabel(p.itemKey),
          stage,
          retention: p.retentionPeriod ?? "",
          legal: p.legalBasis ?? "",
          destruction: p.destructionMethod ?? "",
          party: a.orgUnit?.name ?? a.assignee?.name ?? "",
          note: p.note ?? "",
        });
      }
    }

    // 이동(엣지) 행 — 연결의 PII 항목 1건당 1행
    for (const link of links) {
      const items = parseLinkItems(link.piiItems);
      if (items.length === 0) continue;
      const sourceName = link.sourceAsset?.name ?? link.sourceExternal?.name ?? "?";
      const targetName = link.targetAsset?.name ?? link.targetExternal?.name ?? "?";
      // 수탁자/제3자: 타겟이 외부엔티티면 그 이름, 아니면 타겟 자산명
      const party = link.targetExternal?.name
        ? `${link.targetExternal.name} (수탁/제3자)`
        : (link.targetAsset?.name ?? "");
      const stage = singleStageLabel(link.targetAsset?.piiStage);
      const note = [link.label, link.condition].filter(Boolean).join(" / ");
      for (const v of items) {
        rows.push({
          kind: "이동",
          flow: `${sourceName} → ${targetName}`,
          // 카탈로그 코드면 라벨로, 레거시 자유텍스트면 원문 그대로 (하위호환 — dev-051 통합 전 데이터)
          item: isPiiItemKey(v) ? piiItemLabel(v) : v,
          stage,
          retention: link.retentionPeriod ?? "",
          legal: link.legalBasis ?? "",
          destruction: link.destructionMethod ?? "",
          party,
          note,
        });
      }
    }

    // ── Excel 워크북 (api/export/all 컨벤션) ──
    const wb = new ExcelJS.Workbook();
    wb.creator = "Asset Manager";
    wb.created = new Date();

    const ws = wb.addWorksheet("개인정보흐름표");
    ws.columns = [
      { header: "구분", key: "kind", width: 8 },
      { header: "자산/흐름", key: "flow", width: 30 },
      { header: "개인정보 항목", key: "item", width: 16 },
      { header: "처리단계", key: "stage", width: 18 },
      { header: "보유기간", key: "retention", width: 18 },
      { header: "법적근거", key: "legal", width: 18 },
      { header: "파기방법", key: "destruction", width: 18 },
      { header: "관리·수탁", key: "party", width: 24 },
      { header: "비고", key: "note", width: 24 },
    ];
    for (const row of rows) ws.addRow(row);

    // 헤더 스타일 — 파란 배경·흰색 굵은 11pt·중앙정렬 (전사 export 통일)
    const headerRow = ws.getRow(1);
    for (let c = 1; c <= 9; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
    headerRow.height = 28;

    const buffer = await wb.xlsx.writeBuffer();
    const today = new Date().toISOString().split("T")[0];

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pii-flow-${today}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Failed to export PII flow:", error);
    return NextResponse.json(
      { error: "개인정보 흐름표 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
