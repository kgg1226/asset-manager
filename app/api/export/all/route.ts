// BE-070: GET /api/export/all — 전체 자산 Excel/CSV Export
// dev-031: type 파라미터가 있으면 해당 자산 유형 "전용" 시트(유형별 컬럼, 한국어 헤더)만 내보낸다.
//          type 없으면 기존 전체 워크북(Licenses/Assets/Employees/Cost Summary) 유지.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCiaOverallGrade, getCiaGradeLabel } from "@/lib/cia";
import ExcelJS from "exceljs";

const ASSET_TYPES = ["SOFTWARE", "CLOUD", "HARDWARE", "DOMAIN_SSL", "CONTRACT", "OTHER"] as const;
type AssetType = (typeof ASSET_TYPES)[number];

const TYPE_LABELS: Record<string, string> = {
  SOFTWARE: "Software", CLOUD: "Cloud", HARDWARE: "Hardware",
  DOMAIN_SSL: "Domain/SSL", CONTRACT: "Contract", OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "In Stock", IN_USE: "In Use", ACTIVE: "Active", INACTIVE: "Inactive",
  UNUSABLE: "Unusable", PENDING_DISPOSAL: "Pending Disposal", DISPOSED: "Disposed",
};

// 타입별 전용 시트는 한국어 헤더 — 상태 값도 한국어로 통일
const STATUS_LABELS_KO: Record<string, string> = {
  IN_STOCK: "재고", IN_USE: "사용 중", INACTIVE: "미사용",
  UNUSABLE: "불용", PENDING_DISPOSAL: "폐기 대상", DISPOSED: "폐기 완료",
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
    const typeRaw = request.nextUrl.searchParams.get("type"); // HARDWARE | CLOUD | DOMAIN_SSL | CONTRACT | ... | null
    if (typeRaw && !ASSET_TYPES.includes(typeRaw as AssetType)) {
      return NextResponse.json({ error: "유효하지 않은 자산 유형입니다." }, { status: 400 });
    }
    const typeFilter = typeRaw as AssetType | null;

    // ── 유형 지정 내보내기: 해당 유형 자산만, 유형별 전용 컬럼 (dev-031) ──
    if (typeFilter) {
      const assets = await prisma.asset.findMany({
        where: { type: typeFilter },
        include: {
          assignee: { select: { name: true } },
          orgUnit: { select: { name: true } },
          company: { select: { name: true } },
          hardwareDetail: true,
          cloudDetail: true,
          domainDetail: true,
          contractDetail: true,
        },
        orderBy: { name: "asc" },
      });
      const sheet = getTypedSheet(typeFilter, assets);
      return format === "csv" ? buildTypedCsvResponse(typeFilter, sheet) : buildTypedExcelResponse(typeFilter, sheet);
    }

    // ── 전체 내보내기 (기존 동작 유지) ──
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

// ── 유형별 전용 시트 정의 (dev-031) — Excel/CSV 가 공유하는 단일 출처 ──

type SheetColumn = { header: string; key: string; width: number };
type TypedSheet = { sheetName: string; columns: SheetColumn[]; rows: Record<string, string | number>[] };

const TYPE_SHEET_NAMES: Record<AssetType, string> = {
  SOFTWARE: "소프트웨어", CLOUD: "클라우드", HARDWARE: "하드웨어",
  DOMAIN_SSL: "도메인SSL", CONTRACT: "업체 계약", OTHER: "기타",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ciaGradeLabel(a: any): string {
  const grade = getCiaOverallGrade({ ciaC: a.ciaC ?? null, ciaI: a.ciaI ?? null, ciaA: a.ciaA ?? null });
  return grade != null ? getCiaGradeLabel(grade) : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTypedSheet(type: AssetType, assets: any[]): TypedSheet {
  const sheetName = TYPE_SHEET_NAMES[type];

  if (type === "HARDWARE") {
    return {
      sheetName,
      columns: [
        { header: "자산 코드", key: "assetTag", width: 14 },
        { header: "자산명", key: "name", width: 24 },
        { header: "호스트명", key: "hostname", width: 18 },
        { header: "업무명(용도)", key: "purpose", width: 24 },
        { header: "운영체제(버전)", key: "os", width: 18 },
        { header: "모델명", key: "model", width: 22 },
        { header: "일련번호", key: "serialNumber", width: 18 },
        { header: "위치", key: "location", width: 14 },
        { header: "사용자", key: "assignee", width: 12 },
        // 담당자/관리자는 현재 데이터 모델에 없는 필드 — 자산 실사 시 수기 기입용 빈 컬럼 유지
        { header: "담당자", key: "manager", width: 12 },
        { header: "관리자", key: "admin", width: 12 },
        { header: "관리부서", key: "orgUnit", width: 16 },
        { header: "C", key: "ciaC", width: 5 },
        { header: "I", key: "ciaI", width: 5 },
        { header: "A", key: "ciaA", width: 5 },
        { header: "등급", key: "grade", width: 8 },
      ],
      rows: assets.map((a) => {
        const hd = a.hardwareDetail ?? {};
        return {
          assetTag: hd.assetTag ?? "",
          name: a.name,
          hostname: hd.hostname ?? "",
          purpose: a.description ?? "",
          os: [hd.os, hd.osVersion].filter(Boolean).join(" "),
          model: [hd.manufacturer, hd.model].filter(Boolean).join(" "),
          serialNumber: hd.serialNumber ?? "",
          location: hd.location ?? "",
          assignee: a.assignee?.name ?? "",
          manager: "",
          admin: "",
          orgUnit: a.orgUnit?.name ?? "",
          ciaC: a.ciaC ?? "",
          ciaI: a.ciaI ?? "",
          ciaA: a.ciaA ?? "",
          grade: ciaGradeLabel(a),
        };
      }),
    };
  }

  if (type === "CLOUD") {
    return {
      sheetName,
      columns: [
        { header: "자산명", key: "name", width: 24 },
        { header: "상태", key: "status", width: 10 },
        { header: "플랫폼", key: "platform", width: 12 },
        { header: "계정 ID", key: "accountId", width: 20 },
        { header: "리전", key: "region", width: 16 },
        { header: "서비스 분류", key: "serviceCategory", width: 12 },
        { header: "리소스 유형", key: "resourceType", width: 14 },
        { header: "인스턴스 사양", key: "instanceSpec", width: 16 },
        { header: "월 비용", key: "monthlyCost", width: 12 },
        { header: "통화", key: "currency", width: 7 },
        { header: "계약 시작일", key: "contractStartDate", width: 13 },
        { header: "만료일", key: "expiryDate", width: 13 },
        { header: "사용자", key: "assignee", width: 12 },
        { header: "관리부서", key: "orgUnit", width: 16 },
        { header: "C", key: "ciaC", width: 5 },
        { header: "I", key: "ciaI", width: 5 },
        { header: "A", key: "ciaA", width: 5 },
        { header: "등급", key: "grade", width: 8 },
      ],
      rows: assets.map((a) => {
        const cd = a.cloudDetail ?? {};
        return {
          name: a.name,
          status: STATUS_LABELS_KO[a.status] ?? a.status,
          platform: cd.platform ?? "",
          accountId: cd.accountId ?? "",
          region: cd.region ?? "",
          serviceCategory: cd.serviceCategory ?? "",
          resourceType: cd.resourceType ?? "",
          instanceSpec: cd.instanceSpec ?? "",
          monthlyCost: fmtNum(a.monthlyCost),
          currency: a.currency ?? "",
          contractStartDate: fmtDate(cd.contractStartDate ?? null),
          expiryDate: fmtDate(a.expiryDate),
          assignee: a.assignee?.name ?? "",
          orgUnit: a.orgUnit?.name ?? "",
          ciaC: a.ciaC ?? "",
          ciaI: a.ciaI ?? "",
          ciaA: a.ciaA ?? "",
          grade: ciaGradeLabel(a),
        };
      }),
    };
  }

  if (type === "DOMAIN_SSL") {
    return {
      sheetName,
      columns: [
        { header: "자산명", key: "name", width: 24 },
        { header: "도메인", key: "domainName", width: 24 },
        { header: "등록기관", key: "registrar", width: 16 },
        { header: "SSL 유형", key: "sslType", width: 10 },
        { header: "발급기관", key: "issuer", width: 16 },
        { header: "자동 갱신", key: "autoRenew", width: 10 },
        { header: "만료일", key: "expiryDate", width: 13 },
        { header: "비용", key: "cost", width: 12 },
        { header: "통화", key: "currency", width: 7 },
        { header: "관리부서", key: "orgUnit", width: 16 },
      ],
      rows: assets.map((a) => {
        const dd = a.domainDetail ?? {};
        return {
          name: a.name,
          domainName: dd.domainName ?? "",
          registrar: dd.registrar ?? "",
          sslType: dd.sslType ?? "",
          issuer: dd.issuer ?? "",
          autoRenew: dd.autoRenew == null ? "" : dd.autoRenew ? "Y" : "N",
          expiryDate: fmtDate(a.expiryDate),
          cost: fmtNum(a.cost),
          currency: a.currency ?? "",
          orgUnit: a.orgUnit?.name ?? "",
        };
      }),
    };
  }

  if (type === "CONTRACT") {
    return {
      sheetName,
      columns: [
        { header: "자산명", key: "name", width: 24 },
        { header: "계약번호", key: "contractNumber", width: 16 },
        { header: "계약 상대", key: "counterparty", width: 20 },
        { header: "계약 유형", key: "contractType", width: 12 },
        { header: "자동 갱신", key: "autoRenew", width: 10 },
        { header: "구매일", key: "purchaseDate", width: 13 },
        { header: "만료일", key: "expiryDate", width: 13 },
        { header: "비용", key: "cost", width: 12 },
        { header: "통화", key: "currency", width: 7 },
        { header: "관리부서", key: "orgUnit", width: 16 },
      ],
      rows: assets.map((a) => {
        const ct = a.contractDetail ?? {};
        return {
          name: a.name,
          contractNumber: ct.contractNumber ?? "",
          counterparty: ct.counterparty ?? "",
          contractType: ct.contractType ?? "",
          autoRenew: ct.autoRenew == null ? "" : ct.autoRenew ? "Y" : "N",
          purchaseDate: fmtDate(a.purchaseDate),
          expiryDate: fmtDate(a.expiryDate),
          cost: fmtNum(a.cost),
          currency: a.currency ?? "",
          orgUnit: a.orgUnit?.name ?? "",
        };
      }),
    };
  }

  // SOFTWARE / OTHER — 범용 컬럼
  return {
    sheetName,
    columns: [
      { header: "자산명", key: "name", width: 24 },
      { header: "상태", key: "status", width: 10 },
      { header: "공급업체", key: "vendor", width: 16 },
      { header: "비용", key: "cost", width: 12 },
      { header: "월 비용", key: "monthlyCost", width: 12 },
      { header: "통화", key: "currency", width: 7 },
      { header: "구매일", key: "purchaseDate", width: 13 },
      { header: "만료일", key: "expiryDate", width: 13 },
      { header: "사용자", key: "assignee", width: 12 },
      { header: "관리부서", key: "orgUnit", width: 16 },
    ],
    rows: assets.map((a) => ({
      name: a.name,
      status: STATUS_LABELS_KO[a.status] ?? a.status,
      vendor: a.vendor ?? "",
      cost: fmtNum(a.cost),
      monthlyCost: fmtNum(a.monthlyCost),
      currency: a.currency ?? "",
      purchaseDate: fmtDate(a.purchaseDate),
      expiryDate: fmtDate(a.expiryDate),
      assignee: a.assignee?.name ?? "",
      orgUnit: a.orgUnit?.name ?? "",
    })),
  };
}

async function buildTypedExcelResponse(type: AssetType, sheet: TypedSheet) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Asset Manager";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheet.sheetName);
  ws.columns = sheet.columns;
  for (const row of sheet.rows) ws.addRow(row);

  const headerRow = ws.getRow(1);
  for (let c = 1; c <= sheet.columns.length; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }
  headerRow.height = 28;

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().split("T")[0];
  const slug = type.toLowerCase().replace("_", "-");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${slug}-export-${today}.xlsx"`,
    },
  });
}

function buildTypedCsvResponse(type: AssetType, sheet: TypedSheet) {
  const esc = (v: string | number): string => {
    if (typeof v === "number") return String(v);
    return `"${v.replace(/"/g, '""')}"`;
  };
  const lines: string[] = [];
  lines.push(sheet.columns.map((c) => esc(c.header)).join(","));
  for (const row of sheet.rows) {
    lines.push(sheet.columns.map((c) => esc(row[c.key] ?? "")).join(","));
  }

  const csv = "\uFEFF" + lines.join("\n"); // BOM — Excel 한글 인코딩
  const today = new Date().toISOString().split("T")[0];
  const slug = type.toLowerCase().replace("_", "-");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-export-${today}.csv"`,
    },
  });
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
