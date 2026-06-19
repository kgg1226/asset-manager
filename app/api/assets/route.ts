// BE-021: GET — 자산 목록 조회 (필터/검색/페이지네이션)
// BE-021: POST — 자산 등록

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isLifecycleVisible, maskAssetLifecycle } from "@/lib/lifecycle-visibility";
import { apiError } from "@/lib/api-errors";
import { writeAuditLog } from "@/lib/audit-log";
import { isPiiStage } from "@/lib/pii-stage";
import { isPiiItemKey, piiItemCategory } from "@/lib/pii-items";
import {
  ValidationError,
  handleValidationError,
  handlePrismaError,
  vStrReq,
  vStr,
  vNum,
  vEnum,
  vDate,
} from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

const ASSET_TYPES = ["SOFTWARE", "CLOUD", "HARDWARE", "DOMAIN_SSL", "CONTRACT", "OTHER"] as const;
const ASSET_STATUSES = ["IN_STOCK", "IN_USE", "INACTIVE", "UNUSABLE", "PENDING_DISPOSAL", "DISPOSED"] as const;
const BILLING_CYCLES = ["MONTHLY", "ANNUAL", "ONE_TIME", "USAGE_BASED"] as const;
const SORT_FIELDS = ["name", "type", "status", "cost", "monthlyCost", "purchaseDate", "expiryDate", "createdAt"] as const;

/** PC(Laptop/Desktop) 여부에 따라 감가상각 자동 계산 */
function isPcDeviceType(deviceType: string | null | undefined): boolean {
  return deviceType === "Laptop" || deviceType === "Desktop";
}

// ── GET /api/assets — 자산 목록 조회 ──

export async function GET(request: NextRequest) {

  try {
    const url = request.nextUrl;
    const type = vEnum(url.searchParams.get("type"), ASSET_TYPES);
    const status = vEnum(url.searchParams.get("status"), ASSET_STATUSES);
    const search = vStr(url.searchParams.get("search"), 200);
    const companyId = vNum(url.searchParams.get("companyId"), { min: 1, integer: true });
    const orgUnitId = vNum(url.searchParams.get("orgUnitId"), { min: 1, integer: true });
    const assigneeId = vNum(url.searchParams.get("assigneeId"), { min: 1, integer: true });
    const subCategoryId = vNum(url.searchParams.get("subCategoryId"), { min: 1, integer: true });
    const majorCategoryId = vNum(url.searchParams.get("majorCategoryId"), { min: 1, integer: true });

    const page = vNum(url.searchParams.get("page"), { min: 1, integer: true }) ?? 1;
    const limit = vNum(url.searchParams.get("limit"), { min: 1, max: 100, integer: true }) ?? 20;
    const sortBy = vEnum(url.searchParams.get("sortBy"), SORT_FIELDS) ?? "createdAt";
    const sortOrder = vEnum(url.searchParams.get("sortOrder"), ["asc", "desc"] as const) ?? "desc";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (orgUnitId) where.orgUnitId = orgUnitId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (majorCategoryId) where.subCategory = { majorCategoryId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [assets, total, user] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true } },
          orgUnit: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          subCategory: { include: { majorCategory: { select: { id: true, name: true, code: true } } } },
          hardwareDetail: true,
          cloudDetail: true,
          domainDetail: true,
          contractDetail: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.asset.count({ where }),
      getCurrentUser(),
    ]);

    // 내용연수·감가상각 노출 정책(dev-022) 서버 강제 — 비권한 사용자에게는 페이로드에서 제거
    const visible = await isLifecycleVisible(user);
    for (const a of assets) maskAssetLifecycle(a, visible);

    return NextResponse.json({
      assets,
      total,
      page,
      limit,
    });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    console.error("Failed to fetch assets:", error);
    return NextResponse.json(
      { error: "자산 목록 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}

// ── POST /api/assets — 자산 등록 ──

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json();

    // ── 필수 필드 검증 ──
    const nameVal = vStrReq(body.name, "자산명", 255);
    const typeVal = vEnum(body.type, ASSET_TYPES);
    if (!typeVal) throw new ValidationError("자산 유형은 필수입니다. 허용값: " + ASSET_TYPES.join(", "));

    // ── 선택 필드 검증 ──
    const vendorVal = vStr(body.vendor, 255);
    const descriptionVal = vStr(body.description, 2000);
    const costVal = vNum(body.cost, { min: 0 });
    const currencyVal = vStr(body.currency, 10);
    const billingCycleVal = body.billingCycle ? vEnum(body.billingCycle, BILLING_CYCLES) : null;
    const purchaseDateVal = vDate(body.purchaseDate);
    const expiryDateVal = vDate(body.expiryDate);
    const renewalDateVal = vDate(body.renewalDate);
    const subCategoryIdVal = vNum(body.subCategoryId, { min: 1, integer: true });
    const companyIdVal = vNum(body.companyId, { min: 1, integer: true });
    const orgUnitIdVal = vNum(body.orgUnitId, { min: 1, integer: true });
    const assigneeIdVal = vNum(body.assigneeId, { min: 1, integer: true });
    const ciaCVal = vNum(body.ciaC, { min: 1, max: 3, integer: true });
    const ciaIVal = vNum(body.ciaI, { min: 1, max: 3, integer: true });
    const ciaAVal = vNum(body.ciaA, { min: 1, max: 3, integer: true });

    // PC(Laptop/Desktop) 감가상각 자동 계산
    let finalBillingCycle = billingCycleVal as string | null;
    let monthlyCostVal = vNum(body.monthlyCost, { min: 0 });

    const hdDeviceType = body.hardwareDetail?.deviceType;
    if (typeVal === "HARDWARE" && isPcDeviceType(hdDeviceType)) {
      // PC 자산: billingCycle = DEPRECIATION, monthlyCost 자동 계산
      finalBillingCycle = "DEPRECIATION";
      const usefulLife = vNum(body.hardwareDetail?.usefulLifeYears, { min: 1, max: 50, integer: true }) ?? 5;
      if (costVal != null) {
        monthlyCostVal = Math.floor(costVal / usefulLife / 12);
      } else {
        monthlyCostVal = null;
      }
    } else if (monthlyCostVal == null && costVal != null && billingCycleVal) {
      // 비PC 자산: 기존 로직
      switch (billingCycleVal) {
        case "MONTHLY":
          monthlyCostVal = costVal;
          break;
        case "ANNUAL":
          monthlyCostVal = Math.round(costVal / 12);
          break;
        case "ONE_TIME":
          monthlyCostVal = 0;
          break;
        case "USAGE_BASED":
          monthlyCostVal = costVal;
          break;
      }
    }

    // ── unique 키 중복 사전 검증 (개별 생성은 중복 시 거부) ──
    // CSV import 는 동일 키면 update (app/settings/import/actions.ts),
    // 개별 생성은 사용자 의도가 명확한 신규 등록이므로 중복 시 차단한다.
    if (typeVal === "HARDWARE" && body.hardwareDetail?.assetTag) {
      const tag = vStr(body.hardwareDetail.assetTag, 100);
      if (tag) {
        const existing = await prisma.hardwareDetail.findFirst({
          where: { assetTag: tag },
          select: { assetId: true },
        });
        if (existing) {
          return apiError("DUPLICATE", {
            message: `이미 등록된 자산 태그입니다: ${tag}`,
          });
        }
      }
    }
    if (typeVal === "DOMAIN_SSL" && body.domainDetail?.domainName) {
      const dn = vStr(body.domainDetail.domainName, 255);
      if (dn) {
        const existing = await prisma.domainDetail.findFirst({
          where: { domainName: dn },
          select: { assetId: true },
        });
        if (existing) {
          return apiError("DUPLICATE", {
            message: `이미 등록된 도메인입니다: ${dn}`,
          });
        }
      }
    }
    if (typeVal === "CONTRACT" && nameVal) {
      const existing = await prisma.asset.findFirst({
        where: { type: "CONTRACT", name: nameVal },
        select: { id: true },
      });
      if (existing) {
        return apiError("DUPLICATE", {
          message: `이미 등록된 계약명입니다: ${nameVal}`,
        });
      }
    }

    const asset = await prisma.$transaction(async (tx) => {
      // FK 존재 검증
      if (companyIdVal) {
        const company = await tx.orgCompany.findUnique({ where: { id: companyIdVal }, select: { id: true } });
        if (!company) throw new ValidationError("존재하지 않는 회사입니다.");
      }
      if (orgUnitIdVal) {
        const unit = await tx.orgUnit.findUnique({ where: { id: orgUnitIdVal }, select: { id: true } });
        if (!unit) throw new ValidationError("존재하지 않는 조직입니다.");
      }
      if (assigneeIdVal) {
        const emp = await tx.employee.findUnique({ where: { id: assigneeIdVal }, select: { id: true } });
        if (!emp) throw new ValidationError("존재하지 않는 조직원입니다.");
      }
      if (subCategoryIdVal) {
        const sub = await tx.assetSubCategory.findUnique({ where: { id: subCategoryIdVal }, select: { id: true } });
        if (!sub) throw new ValidationError("존재하지 않는 자산 소분류입니다.");
      }

      // ── Asset 생성 ──
      const assetData: Prisma.AssetCreateInput = {
        name: nameVal,
        type: typeVal,
        // 생성 시 상태 지정 허용 (dev-036 — 도메인은 등록 시점부터 "운영 중"인 경우가 일반적).
        // 미지정 시 기존처럼 스키마 기본값(IN_STOCK).
        ...(vEnum(body.status, ASSET_STATUSES) ? { status: vEnum(body.status, ASSET_STATUSES)! } : {}),
        vendor: vendorVal,
        description: descriptionVal,
        cost: costVal,
        monthlyCost: monthlyCostVal,
        currency: currencyVal ?? "KRW",
        billingCycle: finalBillingCycle,
        purchaseDate: purchaseDateVal,
        expiryDate: expiryDateVal,
        renewalDate: renewalDateVal,
        ciaC: ciaCVal,
        ciaI: ciaIVal,
        ciaA: ciaAVal,
        // 개인정보 처리 단계 (dev-039) — 미지정 시 null. 자산맵 흐름도 배치 기준.
        piiStage: isPiiStage(body.piiStage) ? body.piiStage : null,
        createdBy: user.id,
        ...(subCategoryIdVal && { subCategory: { connect: { id: subCategoryIdVal } } }),
        ...(companyIdVal && { company: { connect: { id: companyIdVal } } }),
        ...(orgUnitIdVal && { orgUnit: { connect: { id: orgUnitIdVal } } }),
        ...(assigneeIdVal && { assignee: { connect: { id: assigneeIdVal } } }),
      };

      const created = await tx.asset.create({ data: assetData });

      // ── 개인정보 항목 인벤토리 (dev-047) — 카탈로그 검증 후 category 서버 도출 ──
      if (Array.isArray(body.piiItems)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const valid = (body.piiItems as any[]).filter((p) => isPiiItemKey(p?.itemKey));
        if (valid.length > 0) {
          await tx.assetPiiItem.createMany({
            data: valid.map((p) => ({
              assetId: created.id,
              itemKey: p.itemKey,
              category: piiItemCategory(p.itemKey)!,
              lifecycleStages: Array.isArray(p.lifecycleStages) ? JSON.stringify(p.lifecycleStages) : null,
              legalBasis: vStr(p.legalBasis, 255),
              retentionPeriod: vStr(p.retentionPeriod, 255),
              destructionMethod: vStr(p.destructionMethod, 255),
              note: vStr(p.note, 500),
            })),
          });
        }
      }

      // ── 유형별 상세 생성 ──
      if (typeVal === "HARDWARE" && body.hardwareDetail) {
        const hd = body.hardwareDetail;
        await tx.hardwareDetail.create({
          data: {
            assetId: created.id,
            assetTag: vStr(hd.assetTag, 100),
            deviceType: vStr(hd.deviceType, 50),
            manufacturer: vStr(hd.manufacturer, 255),
            model: vStr(hd.model, 255),
            serialNumber: vStr(hd.serialNumber, 255),
            hostname: vStr(hd.hostname, 255),
            macAddress: vStr(hd.macAddress, 50),
            ipAddress: vStr(hd.ipAddress, 50),
            os: vStr(hd.os, 50),
            osVersion: vStr(hd.osVersion, 100),
            location: vStr(hd.location, 500),
            cpu: vStr(hd.cpu, 255),
            ram: vStr(hd.ram, 255),
            storage: vStr(hd.storage, 255),
            gpu: vStr(hd.gpu, 255),
            displaySize: vStr(hd.displaySize, 100),
            usefulLifeYears: vNum(hd.usefulLifeYears, { min: 1, max: 50, integer: true }) ?? 5,
            // Phase 5 추가 필드
            storageType: vStr(hd.storageType, 20),
            imei: vStr(hd.imei, 50),
            phoneNumber: vStr(hd.phoneNumber, 30),
            connectionType: vStr(hd.connectionType, 50),
            resolution: vStr(hd.resolution, 50),
            // 보증/구매 관리
            warrantyEndDate: hd.warrantyEndDate ? new Date(hd.warrantyEndDate) : null,
            warrantyProvider: vStr(hd.warrantyProvider, 255),
            purchaseOrderNumber: vStr(hd.purchaseOrderNumber, 100),
            invoiceNumber: vStr(hd.invoiceNumber, 100),
            condition: vStr(hd.condition, 1),
            notes: vStr(hd.notes, 2000),
            // 네트워크/인프라
            secondaryIp: vStr(hd.secondaryIp, 50),
            subnetMask: vStr(hd.subnetMask, 50),
            gateway: vStr(hd.gateway, 50),
            vlanId: vStr(hd.vlanId, 20),
            dnsName: vStr(hd.dnsName, 255),
            portCount: vNum(hd.portCount, { min: 0, max: 10000, integer: true }),
            firmwareVersion: vStr(hd.firmwareVersion, 100),
          },
        });
      }

      if (typeVal === "CLOUD" && body.cloudDetail) {
        const cd = body.cloudDetail;
        await tx.cloudDetail.create({
          data: {
            assetId: created.id,
            platform: vStr(cd.platform, 100),
            accountId: vStr(cd.accountId, 255),
            region: vStr(cd.region, 100),
            seatCount: vNum(cd.seatCount, { min: 0, integer: true }),
            // 서비스 분류
            serviceCategory: vStr(cd.serviceCategory, 50),
            resourceType: vStr(cd.resourceType, 100),
            resourceId: vStr(cd.resourceId, 500),
            // 인프라 상세
            instanceSpec: vStr(cd.instanceSpec, 100),
            storageSize: vStr(cd.storageSize, 100),
            endpoint: vStr(cd.endpoint, 500),
            vpcId: vStr(cd.vpcId, 50),
            availabilityZone: vStr(cd.availabilityZone, 50),
            // 계약/구독 관리
            contractStartDate: cd.contractStartDate ? new Date(cd.contractStartDate) : null,
            contractTermMonths: vNum(cd.contractTermMonths, { min: 1, max: 120, integer: true }),
            renewalDate: cd.renewalDate ? new Date(cd.renewalDate) : null,
            cancellationNoticeDate: cd.cancellationNoticeDate ? new Date(cd.cancellationNoticeDate) : null,
            cancellationNoticeDays: vNum(cd.cancellationNoticeDays, { min: 1, max: 365, integer: true }),
            paymentMethod: vStr(cd.paymentMethod, 50),
            contractNumber: vStr(cd.contractNumber, 255),
            // 관리 정보
            adminEmail: vStr(cd.adminEmail, 255),
            adminSlackId: vStr(cd.adminSlackId, 50),
            notifyChannels: vStr(cd.notifyChannels, 10),
            autoRenew: cd.autoRenew != null ? Boolean(cd.autoRenew) : null,
            notes: vStr(cd.notes, 2000),
          },
        });
      }

      if (typeVal === "CONTRACT" && body.contractDetail) {
        const ct = body.contractDetail;
        await tx.contractDetail.create({
          data: {
            assetId: created.id,
            contractNumber: vStr(ct.contractNumber, 255),
            counterparty: vStr(ct.counterparty, 255),
            contractType: vStr(ct.contractType, 100),
            autoRenew: ct.autoRenew === true,
          },
        });
      }

      if (typeVal === "DOMAIN_SSL" && body.domainDetail) {
        const dd = body.domainDetail;
        const billingCycleMonths = vNum(dd.billingCycleMonths, { min: 1, max: 120, integer: true }) ?? 12;
        await tx.domainDetail.create({
          data: {
            assetId: created.id,
            domainName: vStr(dd.domainName, 255),
            registrar: vStr(dd.registrar, 255),
            sslType: vStr(dd.sslType, 50),
            issuer: vStr(dd.issuer, 255),
            billingCycleMonths,
            autoRenew: dd.autoRenew !== false,
          },
        });
        // 도메인/SSL 월 환산 비용 자동 계산
        if (costVal != null && !monthlyCostVal) {
          monthlyCostVal = Math.round(costVal / billingCycleMonths);
          await tx.asset.update({
            where: { id: created.id },
            data: { monthlyCost: monthlyCostVal },
          });
        }
      }

      // ── AuditLog ──
      await writeAuditLog(tx, {
        entityType: "ASSET",
        entityId: created.id,
        action: "CREATED",
        actor: user.username,
        actorType: "USER",
        actorId: user.id,
        details: { name: nameVal, type: typeVal, cost: costVal },
      });

      // 전체 데이터 반환
      return tx.asset.findUnique({
        where: { id: created.id },
        include: {
          assignee: { select: { id: true, name: true } },
          orgUnit: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          hardwareDetail: true,
          cloudDetail: true,
          domainDetail: true,
          contractDetail: true,
        },
      });
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    const vErr = handleValidationError(error);
    if (vErr) return vErr;
    // 사전 중복 체크를 통과해도 동시 요청 레이스는 DB unique(assetTag)가 막는다 → 409 (dev-030)
    const pErr = handlePrismaError(error, {
      uniqueMessage: "이미 사용 중인 자산 태그입니다.",
    });
    if (pErr) return pErr;
    console.error("Failed to create asset:", error);
    return NextResponse.json(
      { error: "자산 등록에 실패했습니다." },
      { status: 500 },
    );
  }
}
