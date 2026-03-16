// BE-031: GET /api/reports/monthly/{yearMonth}/excel — Excel 보고서 다운로드

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ValidationError, handleValidationError } from "@/lib/validation";
import ExcelJS from "exceljs";

type Params = { params: Promise<{ yearMonth: string }> };

function parsePeriod(yearMonth: string) {
  const match = yearMonth.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) throw new ValidationError("유효하지 않은 기간입니다. 형식: YYYY-MM");
  const year = Number(match[1]);
  const month = Number(match[2]);
  return {
    year, month,
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 0, 23, 59, 59, 999),
    period: yearMonth,
  };
}

const TYPE_LABELS: Record<string, string> = {
  SOFTWARE: "Software",
  CLOUD: "Cloud",
  HARDWARE: "Hardware",
  DOMAIN_SSL: "Domain/SSL",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "In Stock",
  IN_USE: "In Use",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  UNUSABLE: "Unusable",
  PENDING_DISPOSAL: "Pending Disposal",
  DISPOSED: "Disposed",
};

function formatCurrency(val: number | null): string {
  if (val == null) return "-";
  return val.toLocaleString("ko-KR");
}

function formatDate(val: Date | null): string {
  if (!val) return "-";
  return new Date(val).toISOString().split("T")[0];
}

export async function GET(_request: NextRequest, { params }: Params) {

  try {
    const { yearMonth } = await params;
    const { startDate, endDate, period } = parsePeriod(yearMonth);

    // 데이터 조회
    const assets = await prisma.asset.findMany({
      where: {
        createdAt: { lte: endDate },
        OR: [
          { status: { not: "DISPOSED" } },
          { status: "DISPOSED", updatedAt: { gte: startDate } },
        ],
      },
      include: {
        assignee: { select: { id: true, name: true, department: true } },
        orgUnit: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    // 집계
    let totalMonthlyCost = 0;
    const typeMap = new Map<string, { count: number; cost: number }>();
    const statusMap = new Map<string, { count: number; cost: number }>();
    const deptMap = new Map<string, { count: number; cost: number }>();

    for (const asset of assets) {
      const mc = asset.monthlyCost ? Number(asset.monthlyCost) : 0;
      totalMonthlyCost += mc;

      // Type
      const te = typeMap.get(asset.type) ?? { count: 0, cost: 0 };
      te.count++; te.cost += mc;
      typeMap.set(asset.type, te);

      // Status
      const se = statusMap.get(asset.status) ?? { count: 0, cost: 0 };
      se.count++; se.cost += mc;
      statusMap.set(asset.status, se);

      // Department
      const dept = asset.orgUnit?.name ?? asset.assignee?.department ?? "Unassigned";
      const de = deptMap.get(dept) ?? { count: 0, cost: 0 };
      de.count++; de.cost += mc;
      deptMap.set(dept, de);
    }

    // ── Excel 생성 ──
    const wb = new ExcelJS.Workbook();
    wb.creator = "Asset Manager";
    wb.created = new Date();

    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };

    function styleHeader(ws: ExcelJS.Worksheet, colCount: number) {
      const row = ws.getRow(1);
      for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.border = borderStyle;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
      row.height = 28;
    }

    // ── Sheet 1: Summary ──
    const wsSummary = wb.addWorksheet("Summary");
    wsSummary.columns = [
      { header: "Item", key: "label", width: 25 },
      { header: "Value", key: "value", width: 30 },
    ];
    styleHeader(wsSummary, 2);
    wsSummary.addRow({ label: "Report Period", value: period });
    wsSummary.addRow({ label: "Start Date", value: formatDate(startDate) });
    wsSummary.addRow({ label: "End Date", value: formatDate(endDate) });
    wsSummary.addRow({ label: "Total Assets", value: assets.length });
    wsSummary.addRow({ label: "Monthly Cost Total (KRW)", value: formatCurrency(Math.round(totalMonthlyCost)) });
    wsSummary.addRow({ label: "Report Generated", value: formatDate(new Date()) });

    // ── Sheet 2: By Type ──
    const wsType = wb.addWorksheet("By Type");
    wsType.columns = [
      { header: "Type", key: "type", width: 20 },
      { header: "Asset Count", key: "count", width: 12 },
      { header: "Monthly Cost (KRW)", key: "cost", width: 20 },
    ];
    styleHeader(wsType, 3);
    for (const [type, data] of typeMap) {
      wsType.addRow({ type: TYPE_LABELS[type] ?? type, count: data.count, cost: formatCurrency(Math.round(data.cost)) });
    }

    // ── Sheet 3: By Status ──
    const wsStatus = wb.addWorksheet("By Status");
    wsStatus.columns = [
      { header: "Status", key: "status", width: 15 },
      { header: "Asset Count", key: "count", width: 12 },
      { header: "Monthly Cost (KRW)", key: "cost", width: 20 },
    ];
    styleHeader(wsStatus, 3);
    for (const [status, data] of statusMap) {
      wsStatus.addRow({ status: STATUS_LABELS[status] ?? status, count: data.count, cost: formatCurrency(Math.round(data.cost)) });
    }

    // ── Sheet 4: By Department ──
    const wsDept = wb.addWorksheet("By Department");
    wsDept.columns = [
      { header: "Department", key: "department", width: 25 },
      { header: "Asset Count", key: "count", width: 12 },
      { header: "Monthly Cost (KRW)", key: "cost", width: 20 },
    ];
    styleHeader(wsDept, 3);
    for (const [dept, data] of deptMap) {
      wsDept.addRow({ department: dept, count: data.count, cost: formatCurrency(Math.round(data.cost)) });
    }

    // ── Sheet 5: Detail ──
    const wsDetail = wb.addWorksheet("Detail");
    wsDetail.columns = [
      { header: "Asset Name", key: "name", width: 30 },
      { header: "Type", key: "type", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Vendor", key: "vendor", width: 20 },
      { header: "Monthly Cost", key: "monthlyCost", width: 15 },
      { header: "Currency", key: "currency", width: 8 },
      { header: "Assignee", key: "assignee", width: 15 },
      { header: "Department", key: "department", width: 15 },
      { header: "Expiry Date", key: "expiryDate", width: 14 },
      { header: "Purchase Date", key: "purchaseDate", width: 14 },
    ];
    styleHeader(wsDetail, 10);
    for (const a of assets) {
      wsDetail.addRow({
        name: a.name,
        type: TYPE_LABELS[a.type] ?? a.type,
        status: STATUS_LABELS[a.status] ?? a.status,
        vendor: a.vendor ?? "-",
        monthlyCost: a.monthlyCost ? formatCurrency(Number(a.monthlyCost)) : "-",
        currency: a.currency ?? "KRW",
        assignee: a.assignee?.name ?? "-",
        department: a.orgUnit?.name ?? a.assignee?.department ?? "-",
        expiryDate: formatDate(a.expiryDate),
        purchaseDate: formatDate(a.purchaseDate),
      });
    }

    // ── Buffer 변환 및 응답 ──
    const buffer = await wb.xlsx.writeBuffer();
    const fileName = `Asset_Report_${period}.xlsx`;

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to generate Excel report:", error);
    return NextResponse.json(
      { error: "Excel 보고서 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
