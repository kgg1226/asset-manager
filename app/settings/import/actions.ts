"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import type { ImportType, ImportResult, RowError } from "@/lib/csv-import";
import { parseDate, parseBoolean, requireField, parseNumber } from "@/lib/csv-import";
import { generateTemplateCsv } from "./templates";
import { templates } from "./templates";
import { syncSeats } from "@/lib/license-seats";
import { writeAuditLog } from "@/lib/audit-log";
import { requireAdmin } from "@/lib/auth";

// ─── Public Server Actions ─────────────────────────────────────────────

export async function getTemplateCsv(type: ImportType): Promise<string> {
  return generateTemplateCsv(type);
}

export async function importCsv(formData: FormData): Promise<ImportResult> {
  const currentUser = await requireAdmin();
  const actor = currentUser.username;
  const type = formData.get("type") as ImportType | null;
  const file = formData.get("file") as File | null;

  const validTypes: ImportType[] = ["licenses", "employees", "groups", "assignments", "seats", "cloud", "domains", "hardware"];
  if (!type || !validTypes.includes(type)) {
    return { success: false, created: 0, updated: 0, errors: [], message: "가져오기 유형을 선택하세요." };
  }
  if (!file || file.size === 0) {
    return { success: false, created: 0, updated: 0, errors: [], message: "CSV 파일을 선택하세요." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, created: 0, updated: 0, errors: [], message: "파일 크기가 5MB를 초과합니다." };
  }
  if (!file.name.endsWith(".csv")) {
    return { success: false, created: 0, updated: 0, errors: [], message: "CSV 파일만 업로드 가능합니다." };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
  });

  if (!parsed.data || parsed.data.length === 0) {
    return { success: false, created: 0, updated: 0, errors: [], message: "CSV 파일에 데이터가 없습니다." };
  }

  // Validate required headers
  const template = templates[type];
  const requiredHeaders = getRequiredHeaders(type);
  const actualHeaders = parsed.meta.fields ?? [];
  const missingHeaders = requiredHeaders.filter((h) => !actualHeaders.includes(h));
  if (missingHeaders.length > 0) {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: [],
      message: `필수 헤더가 없습니다: ${missingHeaders.join(", ")} (필요한 헤더: ${template.headers.join(", ")})`,
    };
  }

  try {
    switch (type) {
      case "licenses":
        return await importLicenses(parsed.data, actor);
      case "employees":
        return await importEmployees(parsed.data, actor);
      case "groups":
        return await importGroups(parsed.data);
      case "assignments":
        return await importAssignments(parsed.data, actor);
      case "seats":
        return await importSeats(parsed.data, actor);
      case "cloud":
        return await importCloudAssets(parsed.data, actor);
      case "domains":
        return await importDomainAssets(parsed.data, actor);
      case "hardware":
        return await importHardwareAssets(parsed.data, actor);
    }
  } catch (error) {
    return {
      success: false,
      created: 0,
      updated: 0,
      errors: [],
      message: error instanceof Error ? error.message : "가져오기 처리 중 오류가 발생했습니다.",
    };
  }
}

function getRequiredHeaders(type: ImportType): string[] {
  switch (type) {
    case "licenses":
      return ["name", "totalQuantity", "purchaseDate"];
    case "employees":
      return ["name", "department"];
    case "groups":
      return ["name"];
    case "assignments":
      return ["licenseName", "employeeEmail"];
    case "seats":
      return ["licenseName", "key"];
    case "cloud":
      return ["name"];
    case "domains":
      return ["name"];
    case "hardware":
      return ["name"];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Resolve company ID by name (null if not found or empty) */
async function resolveCompanyId(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  companyName: string | null
): Promise<number | null> {
  if (!companyName) return null;
  const company = await tx.orgCompany.findUnique({ where: { name: companyName } });
  return company?.id ?? null;
}

/** Resolve orgUnit ID by name (null if not found or empty) */
async function resolveOrgUnitId(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orgUnitName: string | null,
  companyId: number | null
): Promise<number | null> {
  if (!orgUnitName) return null;
  const orgUnit = await tx.orgUnit.findFirst({
    where: { name: orgUnitName, ...(companyId ? { companyId } : {}) },
  });
  return orgUnit?.id ?? null;
}

/** Resolve employee by name (first match) */
async function resolveEmployeeByName(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  name: string | null
): Promise<number | null> {
  if (!name) return null;
  const employee = await tx.employee.findFirst({ where: { name } });
  return employee?.id ?? null;
}

/** Parse and validate CIA score (1-3) */
function parseCiaScore(
  value: string | undefined,
  row: number,
  column: string,
  errors: RowError[]
): number | null {
  if (!value?.trim()) return null;
  const n = Number(value.trim());
  if (isNaN(n) || !Number.isInteger(n) || n < 1 || n > 3) {
    errors.push({ row, column, message: `CIA 점수는 1~3 정수여야 합니다: "${value}"` });
    return null;
  }
  return n;
}

/** Validate company/orgUnit names exist in DB. Adds errors if not found. */
async function validateCompanyOrgNames(
  validated: Array<{ companyName: string | null; orgUnitName: string | null; rowNum: number }>,
  errors: RowError[]
): Promise<boolean> {
  const uniqueCompanyNames = [...new Set(validated.map((r) => r.companyName).filter(Boolean))] as string[];
  if (uniqueCompanyNames.length > 0) {
    const existingCompanies = await prisma.orgCompany.findMany({
      where: { name: { in: uniqueCompanyNames } },
      select: { name: true },
    });
    const existingCompanySet = new Set(existingCompanies.map((c) => c.name));
    for (const row of validated) {
      if (row.companyName && !existingCompanySet.has(row.companyName)) {
        errors.push({ row: row.rowNum, column: "companyName", message: `존재하지 않는 회사입니다: "${row.companyName}"` });
      }
    }
    if (errors.length > 0) return false;
  }

  const uniqueOrgUnitNames = [...new Set(validated.map((r) => r.orgUnitName).filter(Boolean))] as string[];
  if (uniqueOrgUnitNames.length > 0) {
    const existingOrgUnits = await prisma.orgUnit.findMany({
      where: { name: { in: uniqueOrgUnitNames } },
      select: { name: true },
    });
    const existingOrgUnitSet = new Set(existingOrgUnits.map((o) => o.name));
    for (const row of validated) {
      if (row.orgUnitName && !existingOrgUnitSet.has(row.orgUnitName)) {
        errors.push({ row: row.rowNum, column: "orgUnitName", message: `존재하지 않는 조직입니다: "${row.orgUnitName}"` });
      }
    }
    if (errors.length > 0) return false;
  }

  return true;
}

// ─── License Import ────────────────────────────────────────────────────

async function importLicenses(rows: Record<string, string>[], actor: string): Promise<ImportResult> {
  const errors: RowError[] = [];

  // Phase 1: 필드 파싱 & 기본 검증
  const validated = rows.map((row, i) => {
    const rowNum = i + 2; // 1-indexed + header
    const name = requireField(row.name, rowNum, "name", errors);
    const totalQuantity = parseNumber(row.totalQuantity, rowNum, "totalQuantity", errors, true);
    const purchaseDate = parseDate(row.purchaseDate, rowNum, "purchaseDate", errors, true);
    const key = row.key?.trim() || null;
    const rawType = row.licenseType?.trim().toUpperCase();
    const licenseType = (["NO_KEY", "KEY_BASED", "VOLUME"].includes(rawType) ? rawType : "KEY_BASED") as "NO_KEY" | "KEY_BASED" | "VOLUME";
    const price = parseNumber(row.price, rowNum, "price", errors);
    const expiryDate = parseDate(row.expiryDate, rowNum, "expiryDate", errors);
    const noticePeriodDays = parseNumber(row.noticePeriodDays, rowNum, "noticePeriodDays", errors);
    const adminName = row.adminName?.trim() || null;
    const description = row.description?.trim() || null;
    const parentLicenseName = row.parentLicenseName?.trim() || null;

    // 추가 비용 필드
    const vendor = row.vendor?.trim() || null;
    const rawPaymentCycle = row.paymentCycle?.trim().toUpperCase();
    const paymentCycle = (["MONTHLY", "YEARLY"].includes(rawPaymentCycle) ? rawPaymentCycle : null) as "MONTHLY" | "YEARLY" | null;
    const unitPrice = parseNumber(row.unitPrice, rowNum, "unitPrice", errors);
    const rawCurrency = row.currency?.trim().toUpperCase();
    const currency = (["KRW", "USD", "EUR", "JPY", "GBP", "CNY"].includes(rawCurrency) ? rawCurrency : "KRW") as string;
    const exchangeRate = parseNumber(row.exchangeRate, rowNum, "exchangeRate", errors);

    return {
      rowNum, name, totalQuantity, purchaseDate, key, licenseType,
      price, expiryDate, noticePeriodDays, adminName, description, parentLicenseName,
      vendor, paymentCycle, unitPrice, currency, exchangeRate,
    };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // Phase 1.5: 키 중복 검사 (CSV 내부)
  const keysInCsv = new Map<string, number>(); // key → first rowNum
  for (const row of validated) {
    if (row.key) {
      const prev = keysInCsv.get(row.key);
      if (prev !== undefined) {
        errors.push({ row: row.rowNum, column: "key", message: `CSV 내 키 중복: "${row.key}" (행 ${prev}과 중복)` });
      } else {
        keysInCsv.set(row.key, row.rowNum);
      }
    }
  }

  // Phase 1.5: 키 중복 검사 (DB — 다른 이름의 라이선스)
  const csvKeys = [...keysInCsv.keys()];
  if (csvKeys.length > 0) {
    const dbLicensesWithKeys = await prisma.license.findMany({
      where: { key: { in: csvKeys } },
      select: { name: true, key: true },
    });
    const csvNameSet = new Set(validated.map((r) => r.name));
    for (const dbLicense of dbLicensesWithKeys) {
      if (dbLicense.key && !csvNameSet.has(dbLicense.name)) {
        const conflictRow = keysInCsv.get(dbLicense.key);
        if (conflictRow !== undefined) {
          errors.push({
            row: conflictRow,
            column: "key",
            message: `키 "${dbLicense.key}"이(가) 이미 다른 라이선스 "${dbLicense.name}"에 등록되어 있습니다.`,
          });
        }
      }
    }
  }

  // Phase 1.5: parentLicenseName 검증
  {
    const csvLicenseNames = new Set(validated.map((r) => r.name).filter(Boolean) as string[]);

    // 자기 참조 검사
    for (const row of validated) {
      if (row.parentLicenseName && row.parentLicenseName === row.name) {
        errors.push({ row: row.rowNum, column: "parentLicenseName", message: "자신을 상위 라이선스로 설정할 수 없습니다." });
      }
    }

    // CSV에도 없고 DB에도 없는 상위 라이선스명 검사
    const parentNames = [...new Set(validated.map((r) => r.parentLicenseName).filter(Boolean))] as string[];
    const externalParentNames = parentNames.filter((n) => !csvLicenseNames.has(n));
    if (externalParentNames.length > 0) {
      const dbParents = await prisma.license.findMany({
        where: { name: { in: externalParentNames } },
        select: { name: true },
      });
      const dbParentSet = new Set(dbParents.map((p) => p.name));
      for (const row of validated) {
        if (row.parentLicenseName && !csvLicenseNames.has(row.parentLicenseName) && !dbParentSet.has(row.parentLicenseName)) {
          errors.push({ row: row.rowNum, column: "parentLicenseName", message: `상위 라이선스 "${row.parentLicenseName}"을(를) 찾을 수 없습니다.` });
        }
      }
    }

    // CSV 내 순환 참조 검사
    const parentMap = new Map<string, string>(); // childName → parentName
    for (const row of validated) {
      if (row.name && row.parentLicenseName) {
        parentMap.set(row.name, row.parentLicenseName);
      }
    }
    for (const row of validated) {
      if (!row.name || !row.parentLicenseName) continue;
      const visited = new Set<string>([row.name]);
      let cursor: string | undefined = row.parentLicenseName;
      while (cursor && parentMap.has(cursor)) {
        if (visited.has(cursor)) {
          errors.push({ row: row.rowNum, column: "parentLicenseName", message: "CSV 내 순환 참조가 발생합니다." });
          break;
        }
        visited.add(cursor);
        cursor = parentMap.get(cursor);
      }
    }
  }

  // Phase 1.5: 기존 라이선스의 수량 축소 사전 검증
  const uniqueNames = [...new Set(validated.map((r) => r.name).filter(Boolean))] as string[];
  if (uniqueNames.length > 0) {
    const existingLicenses = await prisma.license.findMany({
      where: { name: { in: uniqueNames } },
      include: {
        seats: {
          include: {
            assignments: {
              where: { returnedDate: null },
              select: { id: true },
            },
          },
        },
        _count: {
          select: { assignments: { where: { returnedDate: null } } },
        },
      },
    });

    const licenseMap = new Map(existingLicenses.map((l) => [l.name, l]));

    for (const row of validated) {
      if (!row.name || row.totalQuantity == null) continue;
      const existing = licenseMap.get(row.name);
      if (!existing) continue;

      const effectiveType = row.licenseType ?? existing.licenseType;
      const activeAssignments = existing._count.assignments;

      if (effectiveType !== "KEY_BASED") {
        if (row.totalQuantity < activeAssignments) {
          errors.push({
            row: row.rowNum,
            column: "totalQuantity",
            message: `현재 활성 할당 ${activeAssignments}건이 있어 수량을 ${activeAssignments} 미만으로 설정할 수 없습니다. (입력값: ${row.totalQuantity})`,
          });
        }
      } else {
        const assignedSeatCount = existing.seats.filter(
          (s) => s.assignments.length > 0
        ).length;
        if (assignedSeatCount > 0 && row.totalQuantity < assignedSeatCount) {
          errors.push({
            row: row.rowNum,
            column: "totalQuantity",
            message: `현재 ${assignedSeatCount}개 시트가 할당 중이어서 수량을 ${assignedSeatCount} 미만으로 줄일 수 없습니다. (입력값: ${row.totalQuantity})`,
          });
        }
      }
    }
  }

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // Phase 2: 부모→자식 순서로 정렬 (위상 정렬)
  const nameToRow = new Map(validated.map((r) => [r.name, r]));
  const sorted: typeof validated = [];
  const visitedNames = new Set<string>();

  function visit(row: (typeof validated)[0]) {
    if (!row.name || visitedNames.has(row.name)) return;
    if (row.parentLicenseName && nameToRow.has(row.parentLicenseName)) {
      visit(nameToRow.get(row.parentLicenseName)!);
    }
    visitedNames.add(row.name);
    sorted.push(row);
  }
  for (const row of validated) visit(row);

  // Phase 3: 트랜잭션 실행
  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    const createdLicenseIds = new Map<string, number>(); // name → id

    for (const row of sorted) {
      const licenseType = row.licenseType;

      // parentId 결정
      let parentId: number | null = null;
      if (row.parentLicenseName) {
        const txId = createdLicenseIds.get(row.parentLicenseName);
        if (txId) {
          parentId = txId;
        } else {
          const dbParent = await tx.license.findFirst({ where: { name: row.parentLicenseName } });
          if (dbParent) parentId = dbParent.id;
        }
      }

      const data = {
        name: row.name!,
        totalQuantity: row.totalQuantity!,
        purchaseDate: row.purchaseDate!,
        key: licenseType === "VOLUME" ? row.key : null,
        licenseType,
        price: row.price,
        expiryDate: row.expiryDate,
        noticePeriodDays: row.noticePeriodDays ? Math.round(row.noticePeriodDays) : null,
        adminName: row.adminName,
        description: row.description,
        parentId,
        vendor: row.vendor,
        paymentCycle: row.paymentCycle,
        unitPrice: row.unitPrice,
        currency: row.currency as "KRW" | "USD" | "EUR" | "JPY" | "GBP" | "CNY",
        exchangeRate: row.exchangeRate ?? 1.0,
      };

      const existing = await tx.license.findFirst({ where: { name: row.name! } });
      if (existing) {
        await tx.license.update({ where: { id: existing.id }, data });
        if (licenseType === "KEY_BASED") {
          await syncSeats(tx, existing.id, data.totalQuantity);
        }
        createdLicenseIds.set(row.name!, existing.id);
        updated++;
      } else {
        const license = await tx.license.create({ data });
        if (licenseType === "KEY_BASED") {
          await syncSeats(tx, license.id, data.totalQuantity);
        }
        createdLicenseIds.set(row.name!, license.id);
        created++;
      }
    }
  });

  revalidatePath("/licenses");

  if (created + updated > 0) {
    await prisma.auditLog.create({
      data: {
        entityType: "LICENSE",
        entityId: 0,
        action: "IMPORTED",
        actor,
        details: JSON.stringify({ summary: `라이선스 CSV 가져오기: ${created}건 생성, ${updated}건 수정` }),
      },
    });
  }

  return { success: true, created, updated, errors: [] };
}

// ─── Employee Import ───────────────────────────────────────────────────

async function importEmployees(rows: Record<string, string>[], actor: string): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const name = requireField(row.name, rowNum, "name", errors);
    const department = requireField(row.department, rowNum, "department", errors);
    const email = row.email?.trim() || null;
    const title = row.title?.trim() || null;
    const companyName = row.companyName?.trim() || null;
    const orgUnitName = row.orgUnitName?.trim() || null;
    const groupName = row.groupName?.trim() || null;
    return { name, department, email, title, companyName, orgUnitName, groupName, rowNum };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // Validate company/org names
  const valid = await validateCompanyOrgNames(validated, errors);
  if (!valid) return { success: false, created: 0, updated: 0, errors };

  // Phase 1.5: Validate group names exist in DB before writing
  const uniqueGroupNames = [...new Set(validated.map((r) => r.groupName).filter(Boolean))] as string[];
  if (uniqueGroupNames.length > 0) {
    const existingGroups = await prisma.licenseGroup.findMany({
      where: { name: { in: uniqueGroupNames } },
      select: { name: true },
    });
    const existingSet = new Set(existingGroups.map((g) => g.name));
    for (const row of validated) {
      if (row.groupName && !existingSet.has(row.groupName)) {
        errors.push({ row: row.rowNum, column: "groupName", message: `존재하지 않는 그룹입니다: "${row.groupName}"` });
      }
    }
    if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };
  }

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of validated) {
      const companyId = await resolveCompanyId(tx, row.companyName);
      const orgUnitId = await resolveOrgUnitId(tx, row.orgUnitName, companyId);

      const employeeData = {
        name: row.name!,
        department: row.department!,
        email: row.email || null,
        title: row.title || null,
        companyId,
        orgUnitId,
      };

      let employee;
      let isUpdate = false;
      let prevTitle: string | null = null;

      if (row.email) {
        const existing = await tx.employee.findUnique({ where: { email: row.email } });
        if (existing) {
          prevTitle = existing.title;
          employee = await tx.employee.update({ where: { id: existing.id }, data: employeeData });
          isUpdate = true;
          updated++;
        } else {
          employee = await tx.employee.create({ data: employeeData });
          created++;
        }
      } else {
        employee = await tx.employee.create({ data: employeeData });
        created++;
      }

      // CIA 캐스케이드: 직책 변경 시 배정된 하드웨어 자산의 CIA 자동 업데이트
      if (row.title && (isUpdate ? prevTitle !== row.title : true)) {
        const hwAssets = await tx.asset.findMany({
          where: { assigneeId: employee.id, type: "HARDWARE" },
          select: { id: true },
        });
        if (hwAssets.length > 0) {
          const mapping = await tx.titleCiaMapping.findUnique({ where: { title: row.title } });
          if (mapping) {
            await tx.asset.updateMany({
              where: { id: { in: hwAssets.map((a) => a.id) } },
              data: { ciaC: mapping.ciaC, ciaI: mapping.ciaI, ciaA: mapping.ciaA },
            });
          }
        }
      }

      // Auto-assign group licenses if groupName is provided
      if (row.groupName) {
        const group = await tx.licenseGroup.findUnique({
          where: { name: row.groupName },
          include: { members: { include: { license: true } } },
        });

        if (!group) {
          throw new Error(`그룹 "${row.groupName}"을(를) 찾을 수 없습니다.`);
        }

        for (const member of group.members) {
          const license = member.license;
          const activeAssignments = await tx.assignment.findMany({
            where: { licenseId: license.id, returnedDate: null },
            select: { employeeId: true },
          });

          if (activeAssignments.some((a) => a.employeeId === employee.id)) continue;

          let seatId: number | null = null;

          if (license.licenseType === "KEY_BASED") {
            const availableSeats = await tx.licenseSeat.findMany({
              where: {
                licenseId: license.id,
                assignments: { none: { returnedDate: null } },
              },
              orderBy: { id: "asc" },
            });
            const sorted = [
              ...availableSeats.filter((s) => s.key !== null),
              ...availableSeats.filter((s) => s.key === null),
            ];
            if (sorted.length === 0) continue;
            seatId = sorted[0].id;
          } else {
            if (activeAssignments.length >= license.totalQuantity) continue;
          }

          const keyType = license.licenseType === "VOLUME" ? "Volume Key" : license.licenseType === "KEY_BASED" ? "Individual Key" : "No Key";
          const reason = `CSV Import - Auto-assigned via Group: ${group.name} (${keyType})`;
          const assignment = await tx.assignment.create({
            data: { licenseId: license.id, employeeId: employee.id, seatId, reason },
          });
          await tx.assignmentHistory.create({
            data: {
              assignmentId: assignment.id,
              licenseId: license.id,
              employeeId: employee.id,
              action: "ASSIGNED",
              reason,
            },
          });
        }
      }
    }
  });

  revalidatePath("/employees");
  revalidatePath("/licenses");

  if (created + updated > 0) {
    await prisma.auditLog.create({
      data: {
        entityType: "EMPLOYEE",
        entityId: 0,
        action: "IMPORTED",
        actor,
        details: JSON.stringify({ summary: `조직원 CSV 가져오기: ${created}건 생성, ${updated}건 수정` }),
      },
    });
  }

  return { success: true, created, updated, errors: [] };
}

// ─── Group Import ──────────────────────────────────────────────────────

async function importGroups(rows: Record<string, string>[]): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const name = requireField(row.name, rowNum, "name", errors);
    const description = row.description?.trim() || null;
    const isDefault = parseBoolean(row.isDefault, rowNum, "isDefault", errors);
    const licenseNames = row.licenseNames?.trim()
      ? row.licenseNames.split(";").map((n) => n.trim()).filter(Boolean)
      : [];
    return { name, description, isDefault, licenseNames };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of validated) {
      const groupData = {
        name: row.name!,
        description: row.description,
        isDefault: row.isDefault ?? false,
      };

      const existing = await tx.licenseGroup.findUnique({ where: { name: row.name! } });
      let groupId: number;

      if (existing) {
        await tx.licenseGroup.update({ where: { id: existing.id }, data: groupData });
        groupId = existing.id;
        updated++;
      } else {
        const newGroup = await tx.licenseGroup.create({ data: groupData });
        groupId = newGroup.id;
        created++;
      }

      if (row.licenseNames.length > 0) {
        const licenseIds: number[] = [];
        for (const licenseName of row.licenseNames) {
          const license = await tx.license.findFirst({ where: { name: licenseName } });
          if (!license) {
            throw new Error(`그룹 "${row.name}"의 라이선스 "${licenseName}"을(를) 찾을 수 없습니다.`);
          }
          licenseIds.push(license.id);
        }

        await tx.licenseGroupMember.deleteMany({ where: { licenseGroupId: groupId } });
        await tx.licenseGroupMember.createMany({
          data: licenseIds.map((licenseId) => ({ licenseGroupId: groupId, licenseId })),
        });
      }
    }
  });

  revalidatePath("/settings/groups");
  return { success: true, created, updated, errors: [] };
}

// ─── Assignment Import ─────────────────────────────────────────────────

async function importAssignments(rows: Record<string, string>[], actor: string): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const licenseName = requireField(row.licenseName, rowNum, "licenseName", errors);
    const employeeEmail = requireField(row.employeeEmail, rowNum, "employeeEmail", errors);
    const assignedDate = parseDate(row.assignedDate, rowNum, "assignedDate", errors);
    const reason = row.reason?.trim() || null;
    return { licenseName, employeeEmail, assignedDate, reason };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < validated.length; i++) {
      const row = validated[i];
      const rowNum = i + 2;

      const license = await tx.license.findFirst({ where: { name: row.licenseName! } });
      if (!license) {
        throw new Error(`행 ${rowNum}: 라이선스 "${row.licenseName}"을(를) 찾을 수 없습니다.`);
      }

      const employee = await tx.employee.findUnique({ where: { email: row.employeeEmail! } });
      if (!employee) {
        throw new Error(`행 ${rowNum}: 이메일 "${row.employeeEmail}"의 조직원을 찾을 수 없습니다.`);
      }

      const existing = await tx.assignment.findFirst({
        where: { licenseId: license.id, employeeId: employee.id, returnedDate: null },
      });
      if (existing) {
        throw new Error(
          `행 ${rowNum}: "${row.licenseName}"이(가) 이미 "${employee.name}"에게 할당되어 있습니다.`
        );
      }

      let seatId: number | null = null;
      const reason = row.reason || "CSV Import";

      if (license.licenseType === "KEY_BASED") {
        const availableSeats = await tx.licenseSeat.findMany({
          where: {
            licenseId: license.id,
            assignments: { none: { returnedDate: null } },
          },
          orderBy: { id: "asc" },
        });
        const sorted = [
          ...availableSeats.filter((s) => s.key !== null),
          ...availableSeats.filter((s) => s.key === null),
        ];
        if (sorted.length === 0) {
          const totalSeats = await tx.licenseSeat.count({ where: { licenseId: license.id } });
          throw new Error(
            `행 ${rowNum}: 개별 라이선스 "${row.licenseName}"의 잔여 시트가 없습니다. (전체 ${totalSeats}개 모두 할당 중)`
          );
        }
        seatId = sorted[0].id;
      } else {
        const activeCount = await tx.assignment.count({
          where: { licenseId: license.id, returnedDate: null },
        });
        if (activeCount >= license.totalQuantity) {
          throw new Error(
            `행 ${rowNum}: 라이선스 "${row.licenseName}"의 잔여 수량이 없습니다. (${activeCount}/${license.totalQuantity} 할당 중)`
          );
        }
      }

      const assignment = await tx.assignment.create({
        data: {
          licenseId: license.id,
          employeeId: employee.id,
          seatId,
          assignedDate: row.assignedDate ?? new Date(),
          reason,
        },
      });

      await tx.assignmentHistory.create({
        data: {
          assignmentId: assignment.id,
          licenseId: license.id,
          employeeId: employee.id,
          action: "ASSIGNED",
          reason,
        },
      });

      created++;
    }
  });

  revalidatePath("/licenses");
  revalidatePath("/employees");

  if (created > 0) {
    await prisma.auditLog.create({
      data: {
        entityType: "ASSIGNMENT",
        entityId: 0,
        action: "IMPORTED",
        actor,
        details: JSON.stringify({ summary: `배정 CSV 가져오기: ${created}건 생성` }),
      },
    });
  }

  return { success: true, created, updated: 0, errors: [] };
}

// ─── Seats (Key) Import ─────────────────────────────────────────────

async function importSeats(rows: Record<string, string>[], actor: string): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const licenseName = requireField(row.licenseName, rowNum, "licenseName", errors);
    const key = requireField(row.key, rowNum, "key", errors);
    return { licenseName, key, rowNum };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // 키 중복 검사 (CSV 내부)
  const keysInCsv = new Map<string, number>();
  for (const row of validated) {
    if (row.key) {
      const prev = keysInCsv.get(row.key);
      if (prev !== undefined) {
        errors.push({
          row: row.rowNum,
          column: "key",
          message: `CSV 내 키 중복: "${row.key}" (행 ${prev}에서 처음 등장)`,
        });
      } else {
        keysInCsv.set(row.key, row.rowNum);
      }
    }
  }

  // 키 중복 검사 (DB)
  const csvKeys = [...keysInCsv.keys()];
  if (csvKeys.length > 0) {
    const dbSeats = await prisma.licenseSeat.findMany({
      where: { key: { in: csvKeys } },
      select: { key: true, license: { select: { name: true } } },
    });
    for (const dbSeat of dbSeats) {
      if (dbSeat.key) {
        const conflictRow = keysInCsv.get(dbSeat.key);
        if (conflictRow !== undefined) {
          errors.push({
            row: conflictRow,
            column: "key",
            message: `키 "${dbSeat.key}"이(가) 이미 라이선스 "${dbSeat.license.name}"의 시트에 등록되어 있습니다.`,
          });
        }
      }
    }
  }

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // 라이선스별 그룹화
  const byLicense = new Map<string, { key: string; rowNum: number }[]>();
  for (const row of validated) {
    if (!row.licenseName || !row.key) continue;
    const list = byLicense.get(row.licenseName) ?? [];
    list.push({ key: row.key, rowNum: row.rowNum });
    byLicense.set(row.licenseName, list);
  }

  // 라이선스 존재·유형·빈시트 사전 검증
  for (const [licenseName, keys] of byLicense) {
    const license = await prisma.license.findFirst({
      where: { name: licenseName },
      select: { id: true, licenseType: true, totalQuantity: true },
    });

    if (!license) {
      for (const k of keys) {
        errors.push({
          row: k.rowNum,
          column: "licenseName",
          message: `라이선스 "${licenseName}"을(를) 찾을 수 없습니다.`,
        });
      }
      continue;
    }

    if (license.licenseType !== "KEY_BASED") {
      for (const k of keys) {
        errors.push({
          row: k.rowNum,
          column: "licenseName",
          message: `"${licenseName}"은(는) 개별 키 라이선스가 아닙니다. 시트(키) 가져오기는 KEY_BASED 라이선스만 지원합니다.`,
        });
      }
      continue;
    }

    const emptySeatsCount = await prisma.licenseSeat.count({
      where: { licenseId: license.id, key: null },
    });

    if (emptySeatsCount < keys.length) {
      for (let i = emptySeatsCount; i < keys.length; i++) {
        errors.push({
          row: keys[i].rowNum,
          column: "key",
          message: `"${licenseName}": 빈 시트 ${emptySeatsCount}개 중 ${i + 1}번째 키 — 할당할 빈 시트가 없습니다. (총 ${keys.length}개 요청, 빈 시트 ${emptySeatsCount}개)`,
        });
      }
    }
  }

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  // 트랜잭션 실행
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const [licenseName, keys] of byLicense) {
      const license = await tx.license.findFirst({ where: { name: licenseName } });
      if (!license) continue;

      const emptySeats = await tx.licenseSeat.findMany({
        where: { licenseId: license.id, key: null },
        orderBy: { id: "asc" },
      });

      for (let i = 0; i < keys.length; i++) {
        await tx.licenseSeat.update({
          where: { id: emptySeats[i].id },
          data: { key: keys[i].key },
        });
        updated++;
      }
    }
  });

  revalidatePath("/licenses");

  if (updated > 0) {
    await prisma.auditLog.create({
      data: {
        entityType: "SEAT",
        entityId: 0,
        action: "IMPORTED",
        actor,
        details: JSON.stringify({ summary: `시트 키 CSV 가져오기: ${updated}건 등록` }),
      },
    });
  }

  return { success: true, created: 0, updated, errors: [] };
}

// ─── Cloud Asset Import ────────────────────────────────────────────────

async function importCloudAssets(rows: Record<string, string>[], actor: string): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const name = requireField(row.name, rowNum, "name", errors);
    const vendor = row.vendor?.trim() || null;
    const platform = row.platform?.trim() || null;
    const accountId = row.accountId?.trim() || null;
    const region = row.region?.trim() || null;
    const serviceCategory = row.serviceCategory?.trim() || null;
    const resourceType = row.resourceType?.trim() || null;
    const resourceId = row.resourceId?.trim() || null;
    const instanceSpec = row.instanceSpec?.trim() || null;
    const monthlyCost = parseNumber(row.monthlyCost, rowNum, "monthlyCost", errors);
    const currency = row.currency?.trim().toUpperCase() || "KRW";
    const billingCycle = row.billingCycle?.trim().toUpperCase() || null;
    const purchaseDate = parseDate(row.purchaseDate, rowNum, "purchaseDate", errors);
    const expiryDate = parseDate(row.expiryDate, rowNum, "expiryDate", errors);
    const description = row.description?.trim() || null;
    const assigneeName = row.assigneeName?.trim() || null;
    const companyName = row.companyName?.trim() || null;
    const orgUnitName = row.orgUnitName?.trim() || null;
    return {
      rowNum, name, vendor, platform, accountId, region,
      serviceCategory, resourceType, resourceId, instanceSpec,
      monthlyCost, currency, billingCycle, purchaseDate, expiryDate,
      description, assigneeName, companyName, orgUnitName,
    };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  const valid = await validateCompanyOrgNames(validated, errors);
  if (!valid) return { success: false, created: 0, updated: 0, errors };

  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of validated) {
      const companyId = await resolveCompanyId(tx, row.companyName);
      const orgUnitId = await resolveOrgUnitId(tx, row.orgUnitName, companyId);
      const assigneeId = await resolveEmployeeByName(tx, row.assigneeName);

      const asset = await tx.asset.create({
        data: {
          type: "CLOUD",
          name: row.name!,
          vendor: row.vendor,
          description: row.description,
          monthlyCost: row.monthlyCost != null ? row.monthlyCost : undefined,
          cost: row.monthlyCost != null ? row.monthlyCost : undefined,
          currency: row.currency,
          billingCycle: row.billingCycle,
          purchaseDate: row.purchaseDate,
          expiryDate: row.expiryDate,
          companyId,
          orgUnitId,
          assigneeId,
          status: assigneeId ? "IN_USE" : "IN_STOCK",
          cloudDetail: {
            create: {
              platform: row.platform,
              accountId: row.accountId,
              region: row.region,
              serviceCategory: row.serviceCategory,
              resourceType: row.resourceType,
              resourceId: row.resourceId,
              instanceSpec: row.instanceSpec,
            },
          },
        },
      });

      if (assigneeId) {
        await tx.assetAssignmentHistory.create({
          data: {
            assetId: asset.id,
            employeeId: assigneeId,
            action: "ASSIGNED",
            reason: "CSV Import",
          },
        });
      }

      created++;
    }
  });

  revalidatePath("/cloud");

  if (created > 0) {
    await prisma.auditLog.create({
      data: {
        entityType: "ASSET",
        entityId: 0,
        action: "IMPORTED",
        actor,
        details: JSON.stringify({ summary: `클라우드 자산 CSV 가져오기: ${created}건 생성` }),
      },
    });
  }

  return { success: true, created, updated: 0, errors: [] };
}

// ─── Domain/SSL Asset Import ───────────────────────────────────────────

async function importDomainAssets(rows: Record<string, string>[], actor: string): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const name = requireField(row.name, rowNum, "name", errors);
    const domainName = row.domainName?.trim() || null;
    const registrar = row.registrar?.trim() || null;
    const sslType = row.sslType?.trim().toUpperCase() || null;
    const issuer = row.issuer?.trim() || null;
    const cost = parseNumber(row.cost, rowNum, "cost", errors);
    const currency = row.currency?.trim().toUpperCase() || "KRW";
    const purchaseDate = parseDate(row.purchaseDate, rowNum, "purchaseDate", errors);
    const expiryDate = parseDate(row.expiryDate, rowNum, "expiryDate", errors);
    const autoRenew = parseBoolean(row.autoRenew, rowNum, "autoRenew", errors);
    const description = row.description?.trim() || null;
    const companyName = row.companyName?.trim() || null;
    const orgUnitName = row.orgUnitName?.trim() || null;
    return {
      rowNum, name, domainName, registrar, sslType, issuer,
      cost, currency, purchaseDate, expiryDate, autoRenew,
      description, companyName, orgUnitName,
    };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  const valid = await validateCompanyOrgNames(validated, errors);
  if (!valid) return { success: false, created: 0, updated: 0, errors };

  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of validated) {
      const companyId = await resolveCompanyId(tx, row.companyName);
      const orgUnitId = await resolveOrgUnitId(tx, row.orgUnitName, companyId);

      await tx.asset.create({
        data: {
          type: "DOMAIN_SSL",
          name: row.name!,
          vendor: row.registrar,
          description: row.description,
          cost: row.cost != null ? row.cost : undefined,
          currency: row.currency,
          purchaseDate: row.purchaseDate,
          expiryDate: row.expiryDate,
          companyId,
          orgUnitId,
          domainDetail: {
            create: {
              domainName: row.domainName,
              registrar: row.registrar,
              sslType: row.sslType,
              issuer: row.issuer,
              autoRenew: row.autoRenew ?? true,
            },
          },
        },
      });

      created++;
    }
  });

  revalidatePath("/domains");

  if (created > 0) {
    await prisma.auditLog.create({
      data: {
        entityType: "ASSET",
        entityId: 0,
        action: "IMPORTED",
        actor,
        details: JSON.stringify({ summary: `도메인·SSL CSV 가져오기: ${created}건 생성` }),
      },
    });
  }

  return { success: true, created, updated: 0, errors: [] };
}

// ─── Hardware Asset Import ─────────────────────────────────────────────

async function importHardwareAssets(rows: Record<string, string>[], actor: string): Promise<ImportResult> {
  const errors: RowError[] = [];

  const validated = rows.map((row, i) => {
    const rowNum = i + 2;
    const name = requireField(row.name, rowNum, "name", errors);
    const deviceType = row.deviceType?.trim() || null;
    const manufacturer = row.manufacturer?.trim() || null;
    const model = row.model?.trim() || null;
    const serialNumber = row.serialNumber?.trim() || null;
    const assetTag = row.assetTag?.trim() || null;
    const hostname = row.hostname?.trim() || null;
    const os = row.os?.trim() || null;
    const osVersion = row.osVersion?.trim() || null;
    const cpu = row.cpu?.trim() || null;
    const ram = row.ram?.trim() || null;
    const storage = row.storage?.trim() || null;
    const location = row.location?.trim() || null;
    const cost = parseNumber(row.cost, rowNum, "cost", errors);
    const currency = row.currency?.trim().toUpperCase() || "KRW";
    const purchaseDate = parseDate(row.purchaseDate, rowNum, "purchaseDate", errors);
    const warrantyEndDate = parseDate(row.warrantyEndDate, rowNum, "warrantyEndDate", errors);
    const condition = row.condition?.trim() || null;
    const description = row.description?.trim() || null;
    const assigneeName = row.assigneeName?.trim() || null;
    const companyName = row.companyName?.trim() || null;
    const orgUnitName = row.orgUnitName?.trim() || null;
    const ciaC = parseCiaScore(row.ciaC, rowNum, "ciaC", errors);
    const ciaI = parseCiaScore(row.ciaI, rowNum, "ciaI", errors);
    const ciaA = parseCiaScore(row.ciaA, rowNum, "ciaA", errors);
    return {
      rowNum, name, deviceType, manufacturer, model, serialNumber,
      assetTag, hostname, os, osVersion, cpu, ram, storage, location,
      cost, currency, purchaseDate, warrantyEndDate, condition,
      description, assigneeName, companyName, orgUnitName,
      ciaC, ciaI, ciaA,
    };
  });

  if (errors.length > 0) return { success: false, created: 0, updated: 0, errors };

  const valid = await validateCompanyOrgNames(validated, errors);
  if (!valid) return { success: false, created: 0, updated: 0, errors };

  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of validated) {
      const companyId = await resolveCompanyId(tx, row.companyName);
      const orgUnitId = await resolveOrgUnitId(tx, row.orgUnitName, companyId);
      const assigneeId = await resolveEmployeeByName(tx, row.assigneeName);

      // CIA: CSV에 직접 입력된 값 우선, 없으면 배정자 직책 매핑 적용
      let finalCiaC = row.ciaC;
      let finalCiaI = row.ciaI;
      let finalCiaA = row.ciaA;

      if (assigneeId && finalCiaC == null && finalCiaI == null && finalCiaA == null) {
        const employee = await tx.employee.findUnique({
          where: { id: assigneeId },
          select: { title: true },
        });
        if (employee?.title) {
          const mapping = await tx.titleCiaMapping.findUnique({ where: { title: employee.title } });
          if (mapping) {
            finalCiaC = mapping.ciaC;
            finalCiaI = mapping.ciaI;
            finalCiaA = mapping.ciaA;
          }
        }
      }

      const asset = await tx.asset.create({
        data: {
          type: "HARDWARE",
          name: row.name!,
          vendor: row.manufacturer,
          description: row.description,
          cost: row.cost != null ? row.cost : undefined,
          currency: row.currency,
          purchaseDate: row.purchaseDate,
          companyId,
          orgUnitId,
          assigneeId,
          status: assigneeId ? "IN_USE" : "IN_STOCK",
          ciaC: finalCiaC,
          ciaI: finalCiaI,
          ciaA: finalCiaA,
          hardwareDetail: {
            create: {
              deviceType: row.deviceType,
              manufacturer: row.manufacturer,
              model: row.model,
              serialNumber: row.serialNumber,
              assetTag: row.assetTag,
              hostname: row.hostname,
              os: row.os,
              osVersion: row.osVersion,
              cpu: row.cpu,
              ram: row.ram,
              storage: row.storage,
              location: row.location,
              warrantyEndDate: row.warrantyEndDate,
              condition: row.condition,
            },
          },
        },
      });

      if (assigneeId) {
        await tx.assetAssignmentHistory.create({
          data: {
            assetId: asset.id,
            employeeId: assigneeId,
            action: "ASSIGNED",
            reason: "CSV Import",
          },
        });
      }

      created++;
    }
  });

  revalidatePath("/hardware");

  if (created > 0) {
    await prisma.auditLog.create({
      data: {
        entityType: "ASSET",
        entityId: 0,
        action: "IMPORTED",
        actor,
        details: JSON.stringify({ summary: `하드웨어 자산 CSV 가져오기: ${created}건 생성` }),
      },
    });
  }

  return { success: true, created, updated: 0, errors: [] };
}
