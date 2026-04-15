// BE-ORG-001: PUT — 회사 이름 + ISMS 필드 수정
// BE-ORG-002: DELETE — 회사 삭제
// BE-ORG-003: GET — 회사 상세 조회

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
  handleValidationError,
  handlePrismaError,
  vStr,
  vStrReq,
  vNum,
  vEnum,
} from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const ISMS_STAFF_TYPES = ["INTERNAL_ONLY", "EXTERNAL_ONLY", "MIXED"] as const;
const CONSULTING_COST_RANGES = [
  "NONE", "UNDER_30M", "30M_50M", "50M_100M", "100M_200M", "OVER_200M",
] as const;
const IMPROVEMENT_OPTIONS = [
  "BUDGET", "EXEC_AWARENESS", "NEW_ORG", "EMPLOYEE_AWARENESS",
  "LOWER_RISK", "CUSTOMER_TRUST", "OTHER",
] as const;
const BENEFIT_OPTIONS = [
  "COMPLIANCE", "SECURITY_LEVEL", "ORG_AUTHORITY", "CUSTOMER_TRUST", "OTHER",
] as const;

// ── GET /api/org/companies/[id] — 회사 상세 조회 ──

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const company = await prisma.orgCompany.findUnique({
      where: { id: Number(id) },
    });
    if (!company) {
      return NextResponse.json({ error: "회사를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(company);
  } catch (error) {
    console.error("Failed to fetch company:", error);
    return NextResponse.json({ error: "회사 조회에 실패했습니다." }, { status: 500 });
  }
}

// ── PUT /api/org/companies/[id] — 회사 이름 수정 ──

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const companyId = Number(id);
    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};

    // 회사명 (기존)
    if ("name" in body) data.name = vStrReq(body.name, "회사명", 200);

    // 인력 현황
    if ("totalEmployees" in body)
      data.totalEmployees = vNum(body.totalEmployees, { min: 0, integer: true });
    if ("itEmployees" in body)
      data.itEmployees = vNum(body.itEmployees, { min: 0, integer: true });
    if ("securityEmployees" in body)
      data.securityEmployees = vNum(body.securityEmployees, { min: 0, integer: true });
    if ("privacyEmployees" in body)
      data.privacyEmployees = vNum(body.privacyEmployees, { min: 0, integer: true });

    // Q5: 예산 비율
    if ("budgetItPercent" in body)
      data.budgetItPercent = vNum(body.budgetItPercent, { min: 0, max: 100 });
    if ("budgetSecurityPercent" in body)
      data.budgetSecurityPercent = vNum(body.budgetSecurityPercent, { min: 0, max: 100 });
    if ("budgetPrivacyPercent" in body)
      data.budgetPrivacyPercent = vNum(body.budgetPrivacyPercent, { min: 0, max: 100 });

    // Q6: 인증 수행 인력/기간
    if ("certStaffCount" in body)
      data.certStaffCount = vNum(body.certStaffCount, { min: 0, integer: true });
    if ("certDurationDays" in body)
      data.certDurationDays = vNum(body.certDurationDays, { min: 0, integer: true });

    // Q7: 관리체계 인력구성
    if ("ismsStaffType" in body)
      data.ismsStaffType = vEnum(body.ismsStaffType, ISMS_STAFF_TYPES);

    // Q8: 관리체계 구축 비용
    if ("consultingCostRange" in body)
      data.consultingCostRange = vEnum(body.consultingCostRange, CONSULTING_COST_RANGES);
    if ("systemPurchaseCost" in body)
      data.systemPurchaseCost = vNum(body.systemPurchaseCost, { min: 0 });

    // Q9: 정보보호 활동 공개
    if ("disclosesSecurityActivity" in body)
      data.disclosesSecurityActivity =
        body.disclosesSecurityActivity == null ? null : Boolean(body.disclosesSecurityActivity);

    // Q10: 타 인증 보유
    if ("hasPiaDiagnosis" in body) data.hasPiaDiagnosis = Boolean(body.hasPiaDiagnosis);
    if ("hasPia" in body) data.hasPia = Boolean(body.hasPia);
    if ("hasIso27001" in body) data.hasIso27001 = Boolean(body.hasIso27001);
    if ("hasCriticalInfra" in body) data.hasCriticalInfra = Boolean(body.hasCriticalInfra);
    if ("otherCertifications" in body)
      data.otherCertifications = vStr(body.otherCertifications, 500);

    // Q11: ISMS 최대 개선사항
    if ("ismsBiggestImprovement" in body)
      data.ismsBiggestImprovement = vEnum(body.ismsBiggestImprovement, IMPROVEMENT_OPTIONS);
    if ("ismsBiggestImprovementOther" in body)
      data.ismsBiggestImprovementOther = vStr(body.ismsBiggestImprovementOther, 500);

    // Q12: ISMS 기대효과
    if ("ismsExpectedBenefit" in body)
      data.ismsExpectedBenefit = vEnum(body.ismsExpectedBenefit, BENEFIT_OPTIONS);
    if ("ismsExpectedBenefitOther" in body)
      data.ismsExpectedBenefitOther = vStr(body.ismsExpectedBenefitOther, 500);

    // Q13: ISMS 제도 의견
    if ("ismsOpinion" in body) data.ismsOpinion = vStr(body.ismsOpinion, 2000);

    const company = await prisma.$transaction(async (tx) => {
      const updated = await tx.orgCompany.update({
        where: { id: companyId },
        data,
      });

      await writeAuditLog(tx, {
        entityType: "ORG_COMPANY",
        entityId: updated.id,
        action: "UPDATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: data,
      });

      return updated;
    });

    return NextResponse.json(company);
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    const pErr = handlePrismaError(error, {
      uniqueMessage: "이미 존재하는 회사명입니다.",
      notFoundMessage: "회사를 찾을 수 없습니다.",
    });
    if (pErr) return pErr;
    console.error("Failed to update company:", error);
    return NextResponse.json(
      { error: "회사 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── DELETE /api/org/companies/[id] — 회사 삭제 ──

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  try {
    const { id } = await params;
    const companyId = Number(id);

    // 회사 존재 확인
    const company = await prisma.orgCompany.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json(
        { error: "회사를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 소속 부서 존재 여부 확인 — 있으면 삭제 불가
    const unitCount = await prisma.orgUnit.count({
      where: { companyId },
    });
    if (unitCount > 0) {
      return NextResponse.json(
        { error: "소속 부서가 있어 삭제할 수 없습니다." },
        { status: 409 },
      );
    }

    // 삭제 + AuditLog (트랜잭션)
    await prisma.$transaction(async (tx) => {
      await tx.orgCompany.delete({
        where: { id: companyId },
      });

      await writeAuditLog(tx, {
        entityType: "ORG_COMPANY",
        entityId: companyId,
        action: "DELETED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: company.name },
      });
    });

    return NextResponse.json({ message: "회사가 삭제되었습니다." });
  } catch (error) {
    const pErr = handlePrismaError(error);
    if (pErr) return pErr;
    console.error("Failed to delete company:", error);
    return NextResponse.json(
      { error: "회사 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
