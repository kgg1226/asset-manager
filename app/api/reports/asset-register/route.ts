/**
 * GET /api/reports/asset-register
 * ISMS 정보자산관리대장 엑셀 내보내기
 * 시트: 표지 / 클라우드 / 서버·하드웨어 / 단말기 / 소프트웨어(라이선스) / 도메인·SSL
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

const CIA_GRADE = (c?: number | null, i?: number | null, a?: number | null): string => {
  const avg = ((c ?? 2) + (i ?? 2) + (a ?? 2)) / 3;
  if (avg <= 1.5) return "A (최상)";
  if (avg <= 2.0) return "B (상)";
  if (avg <= 2.5) return "C (중)";
  return "D (하)";
};

const fmt = (d?: Date | null): string =>
  d ? new Date(d).toLocaleDateString("ko-KR") : "";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F4E79" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

function applyHeader(sheet: ExcelJS.Worksheet, cols: string[]) {
  const row = sheet.addRow(cols);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDER;
  });
  row.height = 30;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function styleDataRow(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", wrapText: false };
  });
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const [assets, licenses] = await Promise.all([
    prisma.asset.findMany({
      include: {
        hardwareDetail: true,
        cloudDetail: true,
        domainDetail: true,
        assignee: { select: { name: true, department: true } },
        orgUnit: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.license.findMany({
      include: {
        orgUnit: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const cloud = assets.filter((a) => a.type === "CLOUD");
  const hardware = assets.filter((a) => a.type === "HARDWARE" && ["Server", "ServerBlade", "Storage", "NAS", "SAN", "Backup", "Network", "SecurityDevice", "Rack", "Facility"].includes(a.hardwareDetail?.deviceType ?? ""));
  const endpoint = assets.filter((a) => a.type === "HARDWARE" && ["Laptop", "Desktop", "Mobile", "Monitor", "Peripheral", "Component"].includes(a.hardwareDetail?.deviceType ?? ""));
  const domainSsl = assets.filter((a) => a.type === "DOMAIN_SSL");
  const other = assets.filter((a) => a.type === "OTHER" || a.type === "CONTRACT");

  const wb = new ExcelJS.Workbook();
  wb.creator = "정보자산관리시스템";
  wb.created = new Date();

  // ── 표지 ──────────────────────────────────────────────────────────────
  const cover = wb.addWorksheet("표지");
  cover.mergeCells("A1:H1");
  const titleCell = cover.getCell("A1");
  titleCell.value = "정보자산관리대장";
  titleCell.font = { size: 20, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  cover.getRow(1).height = 60;

  cover.addRow([]);
  cover.addRow(["작성일", new Date().toLocaleDateString("ko-KR"), "", "", "총 자산 수", assets.length + licenses.length]);
  cover.addRow(["클라우드", cloud.length, "", "", "라이선스/SW", licenses.length]);
  cover.addRow(["서버·하드웨어", hardware.length, "", "", "단말기", endpoint.length]);
  cover.addRow(["도메인·SSL", domainSsl.length, "", "", "기타", other.length]);
  cover.columns = [{ width: 18 }, { width: 12 }, { width: 4 }, { width: 4 }, { width: 18 }, { width: 12 }];

  // ── 중요도 평가 기준 ──────────────────────────────────────────────────
  const criteria = wb.addWorksheet("중요도평가기준");
  applyHeader(criteria, ["구분", "등급", "기준"]);
  [
    ["기밀성(C)", "1 (최상)", "극히 제한된 인원만 접근 가능"],
    ["기밀성(C)", "2 (상)", "내부 관리자만 접근 가능"],
    ["기밀성(C)", "3 (중)", "내부 임직원 접근 가능"],
    ["무결성(I)", "1 (최상)", "변조 시 서비스 중단 또는 법적 문제"],
    ["무결성(I)", "2 (상)", "변조 시 업무 큰 장애"],
    ["무결성(I)", "3 (중)", "변조 시 경미한 장애"],
    ["가용성(A)", "1 (최상)", "24시간 무중단 필수"],
    ["가용성(A)", "2 (상)", "업무시간 내 중단 불가"],
    ["가용성(A)", "3 (중)", "단시간 중단 허용"],
  ].forEach((r) => {
    const row = criteria.addRow(r);
    styleDataRow(row);
  });
  criteria.columns = [{ width: 14 }, { width: 12 }, { width: 40 }];

  // ── 클라우드 ──────────────────────────────────────────────────────────
  const cloudSheet = wb.addWorksheet("클라우드");
  applyHeader(cloudSheet, ["No", "자산명", "플랫폼", "계정ID", "리소스ID", "서비스유형", "인스턴스", "월비용", "담당자", "관리부서", "C", "I", "A", "등급", "만료일", "상태"]);
  cloud.forEach((a, i) => {
    const d = a.cloudDetail;
    const row = cloudSheet.addRow([
      i + 1, a.name, d?.platform ?? "", d?.accountId ?? "", d?.resourceId ?? "",
      d?.serviceCategory ?? "", d?.instanceSpec ?? "",
      a.monthlyCost ? Number(a.monthlyCost).toLocaleString() + " " + (a.currency ?? "KRW") : "",
      a.assignee?.name ?? "", a.orgUnit?.name ?? a.assignee?.department ?? "",
      a.ciaC ?? "", a.ciaI ?? "", a.ciaA ?? "",
      CIA_GRADE(a.ciaC, a.ciaI, a.ciaA), fmt(a.expiryDate), a.status,
    ]);
    styleDataRow(row);
  });
  cloudSheet.columns = [
    { width: 5 }, { width: 24 }, { width: 12 }, { width: 18 }, { width: 18 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 },
    { width: 4 }, { width: 4 }, { width: 4 }, { width: 10 }, { width: 12 }, { width: 10 },
  ];

  // ── 서버·하드웨어 ──────────────────────────────────────────────────────
  const serverSheet = wb.addWorksheet("서버·하드웨어");
  applyHeader(serverSheet, ["No", "자산명", "유형", "제조사", "모델", "시리얼번호", "OS", "CPU", "RAM", "스토리지", "IP/위치", "담당자", "관리부서", "C", "I", "A", "등급", "구매일", "상태"]);
  hardware.forEach((a, i) => {
    const d = a.hardwareDetail;
    const row = serverSheet.addRow([
      i + 1, a.name, d?.deviceType ?? "", d?.manufacturer ?? "", d?.model ?? "",
      d?.serialNumber ?? "", d?.os ?? "", d?.cpu ?? "", d?.ram ?? "", d?.storage ?? "",
      d?.hostname ?? "", a.assignee?.name ?? "", a.orgUnit?.name ?? a.assignee?.department ?? "",
      a.ciaC ?? "", a.ciaI ?? "", a.ciaA ?? "",
      CIA_GRADE(a.ciaC, a.ciaI, a.ciaA), fmt(a.purchaseDate), a.status,
    ]);
    styleDataRow(row);
  });
  serverSheet.columns = [
    { width: 5 }, { width: 22 }, { width: 14 }, { width: 12 }, { width: 14 },
    { width: 16 }, { width: 14 }, { width: 14 }, { width: 8 }, { width: 12 },
    { width: 14 }, { width: 12 }, { width: 14 },
    { width: 4 }, { width: 4 }, { width: 4 }, { width: 10 }, { width: 12 }, { width: 10 },
  ];

  // ── 단말기 ──────────────────────────────────────────────────────────
  const endpointSheet = wb.addWorksheet("단말기");
  applyHeader(endpointSheet, ["No", "자산명", "유형", "제조사", "모델", "시리얼/자산태그", "OS", "사용자", "팀명", "구매일", "C", "I", "A", "등급", "상태"]);
  endpoint.forEach((a, i) => {
    const d = a.hardwareDetail;
    const row = endpointSheet.addRow([
      i + 1, a.name, d?.deviceType ?? "", d?.manufacturer ?? "", d?.model ?? "",
      d?.serialNumber ?? d?.assetTag ?? "",
      d?.os ?? "", a.assignee?.name ?? "", a.orgUnit?.name ?? a.assignee?.department ?? "",
      fmt(a.purchaseDate),
      a.ciaC ?? "", a.ciaI ?? "", a.ciaA ?? "",
      CIA_GRADE(a.ciaC, a.ciaI, a.ciaA), a.status,
    ]);
    styleDataRow(row);
  });
  endpointSheet.columns = [
    { width: 5 }, { width: 22 }, { width: 12 }, { width: 12 }, { width: 14 },
    { width: 16 }, { width: 14 }, { width: 12 }, { width: 14 },
    { width: 12 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 10 }, { width: 10 },
  ];

  // ── 소프트웨어·라이선스 ──────────────────────────────────────────────
  const swSheet = wb.addWorksheet("소프트웨어·라이선스");
  applyHeader(swSheet, ["No", "자산명(라이선스)", "유형", "공급업체", "수량", "담당자", "관리부서", "구매일", "만료일", "갱신상태", "월비용"]);
  licenses.forEach((l, i) => {
    const owner = l.adminName ?? "";
    const dept = l.orgUnit?.name ?? "";
    const row = swSheet.addRow([
      i + 1, l.name, l.licenseType, l.vendor ?? "", l.totalQuantity,
      owner, dept, fmt(l.purchaseDate), fmt(l.expiryDate),
      l.renewalStatus, l.totalAmountKRW ? Number(l.totalAmountKRW).toLocaleString() + " KRW" : "",
    ]);
    styleDataRow(row);
  });
  swSheet.columns = [
    { width: 5 }, { width: 28 }, { width: 12 }, { width: 16 }, { width: 8 },
    { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 16 },
  ];

  // ── 도메인·SSL ──────────────────────────────────────────────────────
  const domainSheet = wb.addWorksheet("도메인·SSL");
  applyHeader(domainSheet, ["No", "자산명", "도메인명", "SSL유형", "발급기관", "등록기관", "자동갱신", "만료일", "담당자", "관리부서", "C", "I", "A", "등급"]);
  domainSsl.forEach((a, i) => {
    const d = a.domainDetail;
    const row = domainSheet.addRow([
      i + 1, a.name, d?.domainName ?? "", d?.sslType ?? "", d?.issuer ?? "", d?.registrar ?? "",
      d?.autoRenew ? "Y" : "N", fmt(a.expiryDate),
      a.assignee?.name ?? "", a.orgUnit?.name ?? a.assignee?.department ?? "",
      a.ciaC ?? "", a.ciaI ?? "", a.ciaA ?? "",
      CIA_GRADE(a.ciaC, a.ciaI, a.ciaA),
    ]);
    styleDataRow(row);
  });
  domainSheet.columns = [
    { width: 5 }, { width: 22 }, { width: 24 }, { width: 10 }, { width: 14 }, { width: 14 },
    { width: 8 }, { width: 12 }, { width: 12 }, { width: 14 },
    { width: 4 }, { width: 4 }, { width: 4 }, { width: 10 },
  ];

  const buf = await wb.xlsx.writeBuffer();
  const now = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''%EC%A0%95%EB%B3%B4%EC%9E%90%EC%82%B0%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_${now}.xlsx`,
    },
  });
}
