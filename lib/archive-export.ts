// 증적(Archive) Excel 워크북 생성 코어 (dev-034)
// — GDrive 업로드(POST)와 직접 다운로드(GET)가 공유하는 단일 출처.
//   기존 export 라우트의 시트 구성을 그대로 추출(동작 불변).

type ArchiveDataRow = { dataType: string; payload: unknown };

export type ArchiveForExport = {
  yearMonth: string;
  createdAt: Date;
  completedAt: Date | null;
  data: ArchiveDataRow[];
};

export async function buildArchiveWorkbook(
  archive: ArchiveForExport,
): Promise<{ buffer: Buffer; fileName: string }> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Asset Manager";
  workbook.created = new Date();

  // Sheet 1: 요약
  const summarySheet = workbook.addWorksheet("요약");
  summarySheet.addRow(["기간", archive.yearMonth]);
  summarySheet.addRow(["생성일", new Date(archive.createdAt).toLocaleDateString("ko-KR")]);
  summarySheet.addRow(["완료일", archive.completedAt ? new Date(archive.completedAt).toLocaleDateString("ko-KR") : "-"]);

  // Sheet 2: 라이선스
  const licData = archive.data.find((d) => d.dataType === "licenses");
  if (licData) {
    const licSheet = workbook.addWorksheet("라이선스");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const licenses = licData.payload as any[];
    if (licenses.length > 0) {
      licSheet.addRow(["ID", "라이선스명", "유형", "수량", "배정수", "단가", "통화", "납부주기", "연간비용(KRW)", "갱신상태", "만료일", "담당자"]);
      for (const l of licenses) {
        licSheet.addRow([
          l.id, l.name, l.licenseType, l.totalQuantity, l.assignedCount ?? 0,
          l.unitPrice ?? "", l.currency ?? "KRW", l.paymentCycle ?? "",
          l.totalAmountKRW ?? "", l.renewalStatus ?? "", l.expiryDate ?? "", l.adminName ?? "",
        ]);
      }
    }
  }

  // Sheet 3: 조직원
  const empData = archive.data.find((d) => d.dataType === "employees");
  if (empData) {
    const empSheet = workbook.addWorksheet("조직원");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employees = empData.payload as any[];
    if (employees.length > 0) {
      empSheet.addRow(["ID", "이름", "부서", "이메일", "상태"]);
      for (const e of employees) {
        empSheet.addRow([e.id, e.name, e.department, e.email ?? "", e.status]);
      }
    }
  }

  // Sheet 4: 변경 이력
  const auditData = archive.data.find((d) => d.dataType === "audit_logs");
  if (auditData) {
    const histSheet = workbook.addWorksheet("변경이력");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs = auditData.payload as any[];
    if (logs.length > 0) {
      histSheet.addRow(["ID", "엔티티타입", "엔티티ID", "액션", "행위자", "일시"]);
      for (const l of logs) {
        histSheet.addRow([l.id, l.entityType, l.entityId, l.action, l.actor ?? "", l.createdAt]);
      }
    }
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const fileName = `asset-archive-${archive.yearMonth}.xlsx`;
  return { buffer, fileName };
}
