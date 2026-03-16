// BE-070: GET /api/export/all — 전체 자산 Excel/CSV Export
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ExcelJS from "exceljs";

const TYPE_LABELS: Record<string, string> = {
  SOFTWARE: "Software", CLOUD: "Cloud", HARDWARE: "Hardware",
  DOMAIN_SSL: "Domain/SSL", CONTRACT: "Contract", OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "In Stock", IN_USE: "In Use", ACTIVE: "Active", INACTIVE: "Inactive",
  UNUSABLE: "Unusable", PENDING_DISPOSAL: "Pending Disposal", DISPOSED: "Disposed",
};

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function fmtNum(v: number | { toNumber(): number } | null): number | string {
  if (v == null) return "";
  return typeof v === "number" ? v : v.toNumber();
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const format = request.nextUrl.searchParams.get("format") ?? "xlsx";

    const [licenses, assets, employees] = await Promise.all([
      prisma.license.findMany({
        include: { assignments: { where: { returnedDate: null } } },
        orderBy: { name: "asc" },
      }),
      prisma.asset.findMany({
        include: {
          assignee: { select: { name: true } },
          orgUnit: { select: { name: true } },
          company: { select: { name: true } },
          contractDetail: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.employee.findMany({
        include: {
          orgUnit: { select: { name: true } },
          company: { select: { name: true } },
          assignments: { where: { returnedDate: null }, select: { id: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    if (format === "csv") {
      return buildCsvResponse(licenses, assets, employees);
    }

    return buildExcelResponse(licenses, assets, employees);
  } catch (error) {
    console.error("Export failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "내보내기에 실패했습니다." }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildExcelResponse(licenses: any[], assets: any[], employees: any[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Asset Manager";
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

  function styleHeader(ws: ExcelJS.Worksheet, colCount: number) {
    const row = ws.getRow(1);
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
    row.height = 28;
  }

  // Sheet 1: Licenses
  const wsLic = wb.addWorksheet("Licenses");
  wsLic.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "License Name", key: "name", width: 30 },
    { header: "Type", key: "type", width: 12 },
    { header: "Total Qty", key: "qty", width: 10 },
    { header: "Assigned", key: "assigned", width: 10 },
    { header: "Remaining", key: "remaining", width: 10 },
    { header: "Currency", key: "currency", width: 8 },
    { header: "Total (KRW)", key: "amountKRW", width: 15 },
    { header: "Purchase Date", key: "purchaseDate", width: 14 },
    { header: "Expiry Date", key: "expiryDate", width: 14 },
    { header: "Admin", key: "admin", width: 15 },
  ];
  for (const l of licenses) {
    wsLic.addRow({
      id: l.id, name: l.name, type: l.licenseType,
      qty: l.totalQuantity, assigned: l.assignments.length,
      remaining: l.totalQuantity - l.assignments.length,
      currency: l.currency, amountKRW: l.totalAmountKRW ?? "",
      purchaseDate: fmtDate(l.purchaseDate), expiryDate: fmtDate(l.expiryDate),
      admin: l.adminName ?? "",
    });
  }
  styleHeader(wsLic, 11);

  // Sheet 2: Assets
  const wsAsset = wb.addWorksheet("Assets");
  wsAsset.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Asset Name", key: "name", width: 30 },
    { header: "Type", key: "type", width: 14 },
    { header: "Status", key: "status", width: 12 },
    { header: "Vendor", key: "vendor", width: 20 },
    { header: "Cost", key: "cost", width: 15 },
    { header: "Monthly Cost", key: "monthlyCost", width: 15 },
    { header: "Currency", key: "currency", width: 8 },
    { header: "Purchase Date", key: "purchaseDate", width: 14 },
    { header: "Expiry Date", key: "expiryDate", width: 14 },
    { header: "Assignee", key: "assignee", width: 15 },
    { header: "Department", key: "orgUnit", width: 15 },
    { header: "Company", key: "company", width: 15 },
  ];
  for (const a of assets) {
    wsAsset.addRow({
      id: a.id, name: a.name,
      type: TYPE_LABELS[a.type] ?? a.type,
      status: STATUS_LABELS[a.status] ?? a.status,
      vendor: a.vendor ?? "",
      cost: fmtNum(a.cost), monthlyCost: fmtNum(a.monthlyCost),
      currency: a.currency,
      purchaseDate: fmtDate(a.purchaseDate), expiryDate: fmtDate(a.expiryDate),
      assignee: a.assignee?.name ?? "", orgUnit: a.orgUnit?.name ?? "",
      company: a.company?.name ?? "",
    });
  }
  styleHeader(wsAsset, 13);

  // Sheet 3: Employees
  const wsEmp = wb.addWorksheet("Employees");
  wsEmp.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Name", key: "name", width: 15 },
    { header: "Email", key: "email", width: 25 },
    { header: "Title", key: "title", width: 15 },
    { header: "Department", key: "department", width: 15 },
    { header: "Org Unit", key: "orgUnit", width: 15 },
    { header: "Company", key: "company", width: 15 },
    { header: "Status", key: "status", width: 10 },
    { header: "Assignments", key: "assignCount", width: 10 },
  ];
  for (const e of employees) {
    wsEmp.addRow({
      id: e.id, name: e.name, email: e.email ?? "",
      title: e.title ?? "", department: e.department ?? "",
      orgUnit: e.orgUnit?.name ?? "", company: e.company?.name ?? "",
      status: e.status === "ACTIVE" ? "Active" : "Inactive",
      assignCount: e.assignments.length,
    });
  }
  styleHeader(wsEmp, 9);

  // Sheet 4: Cost Summary
  const wsSummary = wb.addWorksheet("Cost Summary");
  wsSummary.columns = [
    { header: "Item", key: "label", width: 25 },
    { header: "Value", key: "value", width: 30 },
  ];
  const totalLicCost = licenses.reduce((s, l) => s + (l.totalAmountKRW ?? 0), 0);
  const totalAssetMonthlyCost = assets.reduce((s, a) => {
    const mc = a.monthlyCost ? (typeof a.monthlyCost === "number" ? a.monthlyCost : a.monthlyCost.toNumber()) : 0;
    return s + mc;
  }, 0);
  wsSummary.addRow({ label: "Total Licenses", value: licenses.length });
  wsSummary.addRow({ label: "Total Assets", value: assets.length });
  wsSummary.addRow({ label: "Total Employees", value: employees.length });
  wsSummary.addRow({ label: "License Total (KRW)", value: totalLicCost.toLocaleString() });
  wsSummary.addRow({ label: "Asset Monthly Cost (KRW)", value: Math.round(totalAssetMonthlyCost).toLocaleString() });
  wsSummary.addRow({ label: "Asset Annual Cost (KRW)", value: Math.round(totalAssetMonthlyCost * 12).toLocaleString() });
  wsSummary.addRow({ label: "Export Date", value: new Date().toISOString().split("T")[0] });
  styleHeader(wsSummary, 2);

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="asset-export-${today}.xlsx"`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCsvResponse(licenses: any[], assets: any[], employees: any[]) {
  const lines: string[] = [];

  lines.push("=== Licenses ===");
  lines.push("ID,License Name,Type,Total Qty,Assigned,Currency,Total (KRW),Purchase Date,Expiry Date");
  for (const l of licenses) {
    lines.push([
      l.id, `"${l.name}"`, l.licenseType, l.totalQuantity, l.assignments.length,
      l.currency, l.totalAmountKRW ?? "", fmtDate(l.purchaseDate), fmtDate(l.expiryDate),
    ].join(","));
  }

  lines.push("");
  lines.push("=== Assets ===");
  lines.push("ID,Asset Name,Type,Status,Vendor,Cost,Monthly Cost,Currency,Purchase Date,Expiry Date");
  for (const a of assets) {
    lines.push([
      a.id, `"${a.name}"`, a.type, a.status, `"${a.vendor ?? ""}"`,
      fmtNum(a.cost), fmtNum(a.monthlyCost), a.currency,
      fmtDate(a.purchaseDate), fmtDate(a.expiryDate),
    ].join(","));
  }

  lines.push("");
  lines.push("=== Employees ===");
  lines.push("ID,Name,Email,Department,Status,Assignments");
  for (const e of employees) {
    lines.push([
      e.id, `"${e.name}"`, `"${e.email ?? ""}"`, `"${e.department ?? ""}"`,
      e.status, e.assignments.length,
    ].join(","));
  }

  const csv = "\uFEFF" + lines.join("\n");
  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="asset-export-${today}.csv"`,
    },
  });
}
