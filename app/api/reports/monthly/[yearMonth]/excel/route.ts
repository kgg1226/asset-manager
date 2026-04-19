// BE-031: GET /api/reports/monthly/{yearMonth}/excel — Excel 보고서 다운로드
// BE-078: 다운로드 시 Archive 증적 자동 생성

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ValidationError, handleValidationError } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
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

const ALL_DETAIL_FIELDS = ["name","type","status","vendor","monthlyCost","currency","assignee","department","expiryDate","purchaseDate"] as const;
type DetailField = typeof ALL_DETAIL_FIELDS[number];
const ALL_SHEETS = ["Summary","ByType","ByStatus","ByDepartment","Detail","HardwareDetail"] as const;
type SheetKey = typeof ALL_SHEETS[number];

export async function GET(request: NextRequest, { params }: Params) {

  try {
    const { yearMonth } = await params;
    const { startDate, endDate, period } = parsePeriod(yearMonth);

    const url = new URL(request.url);
    const fieldsParam = url.searchParams.get("fields");
    const sheetsParam = url.searchParams.get("sheets");
    const selectedFields = new Set<DetailField>(
      fieldsParam
        ? (fieldsParam.split(",").filter((f) => (ALL_DETAIL_FIELDS as readonly string[]).includes(f)) as DetailField[])
        : [...ALL_DETAIL_FIELDS]
    );
    const selectedSheets = new Set<SheetKey>(
      sheetsParam
        ? (sheetsParam.split(",").filter((s) => (ALL_SHEETS as readonly string[]).includes(s)) as SheetKey[])
        : [...ALL_SHEETS]
    );

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
        assignee: { select: { id: true, name: true, department: true, email: true } },
        orgUnit: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        hardwareDetail: true,
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
    if (!selectedSheets.has("Summary")) { /* skip */ } else {
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
    } // end Summary

    // ── Sheet 2: By Type ──
    if (selectedSheets.has("ByType")) {
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
    } // end ByType

    // ── Sheet 3: By Status ──
    if (selectedSheets.has("ByStatus")) {
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
    } // end ByStatus

    // ── Sheet 4: By Department ──
    if (selectedSheets.has("ByDepartment")) {
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
    } // end ByDepartment

    // ── Sheet 5: Detail ──
    if (selectedSheets.has("Detail")) {
    const allDetailCols: { header: string; key: DetailField; width: number }[] = [
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
    const wsDetail = wb.addWorksheet("Detail");
    wsDetail.columns = allDetailCols.filter((c) => selectedFields.has(c.key));
    styleHeader(wsDetail, wsDetail.columns.length);
    const allDetailData = (a: (typeof assets)[0]) => ({
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
    for (const a of assets) {
      const row = allDetailData(a);
      const filtered = Object.fromEntries(
        Object.entries(row).filter(([k]) => selectedFields.has(k as DetailField))
      );
      wsDetail.addRow(filtered);
    }
    } // end Detail

    // ── Sheet 6: Hardware Detail ──
    if (selectedSheets.has("HardwareDetail")) {
    const hwAssets = assets.filter((a) => a.type === "HARDWARE");
    const wsHw = wb.addWorksheet("Hardware Detail");
    wsHw.columns = [
      { header: "자산번호 (Asset Tag)", key: "assetTag", width: 18 },
      { header: "자산명 (Name)", key: "name", width: 30 },
      { header: "호스트네임 (Hostname)", key: "hostname", width: 20 },
      { header: "시리얼 (Serial Number)", key: "serialNumber", width: 20 },
      { header: "제조사 (Manufacturer)", key: "manufacturer", width: 18 },
      { header: "모델 (Model)", key: "model", width: 22 },
      { header: "유형 (Device Type)", key: "deviceType", width: 14 },
      { header: "CPU", key: "cpu", width: 22 },
      { header: "RAM", key: "ram", width: 12 },
      { header: "Storage", key: "storage", width: 14 },
      { header: "OS", key: "os", width: 12 },
      { header: "OS Version", key: "osVersion", width: 12 },
      { header: "구매일 (Purchase Date)", key: "purchaseDate", width: 14 },
      { header: "보증만료 (Warranty End)", key: "warrantyEndDate", width: 14 },
      { header: "사용자 (Assignee)", key: "assignee", width: 14 },
      { header: "이메일 (Email)", key: "assigneeEmail", width: 22 },
      { header: "부서 (Department)", key: "department", width: 16 },
      { header: "위치 (Location)", key: "location", width: 18 },
      { header: "상태 (Status)", key: "status", width: 14 },
      { header: "등급 (Condition)", key: "condition", width: 10 },
      { header: "월 비용 (Monthly Cost)", key: "monthlyCost", width: 16 },
      { header: "구매비용 (Purchase Cost)", key: "cost", width: 16 },
      { header: "통화 (Currency)", key: "currency", width: 8 },
      { header: "비고 (Notes)", key: "notes", width: 30 },
      { header: "설명 (Description)", key: "description", width: 30 },
    ];
    styleHeader(wsHw, 25);
    for (const a of hwAssets) {
      const hw = a.hardwareDetail;
      wsHw.addRow({
        assetTag: hw?.assetTag ?? "-",
        name: a.name,
        hostname: hw?.hostname ?? "-",
        serialNumber: hw?.serialNumber ?? "-",
        manufacturer: hw?.manufacturer ?? "-",
        model: hw?.model ?? "-",
        deviceType: hw?.deviceType ?? "-",
        cpu: hw?.cpu ?? "-",
        ram: hw?.ram ?? "-",
        storage: hw?.storage ?? "-",
        os: hw?.os ?? "-",
        osVersion: hw?.osVersion ?? "-",
        purchaseDate: formatDate(a.purchaseDate),
        warrantyEndDate: formatDate(hw?.warrantyEndDate ?? null),
        assignee: a.assignee?.name ?? "-",
        assigneeEmail: a.assignee?.email ?? "-",
        department: a.orgUnit?.name ?? a.assignee?.department ?? "-",
        location: hw?.location ?? "-",
        status: STATUS_LABELS[a.status] ?? a.status,
        condition: hw?.condition ?? "-",
        monthlyCost: a.monthlyCost ? formatCurrency(Number(a.monthlyCost)) : "-",
        cost: a.cost ? formatCurrency(Number(a.cost)) : "-",
        currency: a.currency ?? "KRW",
        notes: hw?.notes ?? "-",
        description: a.description ?? "-",
      });
    }
    } // end HardwareDetail

    // ── Buffer 변환 및 응답 ──
    const buffer = await wb.xlsx.writeBuffer();
    const fileName = `Asset_Report_${period}.xlsx`;

    // BE-078: 증적 Archive 자동 생성 (비동기, 실패해도 다운로드 응답에 영향 없음)
    getCurrentUser().then((user) => {
      return prisma.archive.create({
        data: {
          yearMonth: period,
          status: "COMPLETED",
          trigger: "manual",
          startDate: startDate,
          endDate: endDate,
          createdBy: user?.id ?? null,
          completedAt: new Date(),
          data: {
            create: {
              dataType: "assets",
              payload: assets.map((a) => ({
                id: a.id, name: a.name, type: a.type, status: a.status,
                vendor: a.vendor, monthlyCost: a.monthlyCost ? Number(a.monthlyCost) : null,
                currency: a.currency, assignee: a.assignee?.name ?? null,
                department: a.orgUnit?.name ?? a.assignee?.department ?? null,
                expiryDate: a.expiryDate?.toISOString() ?? null,
                purchaseDate: a.purchaseDate?.toISOString() ?? null,
              })),
              recordCount: assets.length,
            },
          },
          logs: {
            create: {
              level: "info",
              message: `Excel 보고서 생성 완료 — ${assets.length}건 (${period})`,
            },
          },
        },
      });
    }).catch((e) => console.error("[archive] auto-create failed:", e));

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
