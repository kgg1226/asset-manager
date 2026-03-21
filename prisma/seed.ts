import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// ── 프로덕션 안전장치 ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  console.error("❌  seed는 프로덕션 환경에서 실행할 수 없습니다. (NODE_ENV=production)");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

  if (password.length < 4) {
    console.error("❌  SEED_ADMIN_PASSWORD는 4자 이상이어야 합니다.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  // ── 1. 관리자 계정 ──
  const adminUser = await prisma.user.upsert({
    where: { username },
    update: { password: hash, role: "ADMIN", isActive: true },
    create: { username, password: hash, role: "ADMIN", isActive: true },
  });
  console.log(`✓ 관리자 계정 '${adminUser.username}' (id: ${adminUser.id})`);

  // 일반 사용자
  const userHash = await bcrypt.hash("user1234", 12);
  const normalUser = await prisma.user.upsert({
    where: { username: "user" },
    update: { password: userHash, role: "USER", isActive: true },
    create: { username: "user", password: userHash, role: "USER", isActive: true },
  });
  console.log(`✓ 일반 사용자 '${normalUser.username}' (id: ${normalUser.id})`);

  // ── 2. 회사 ──
  const company = await prisma.orgCompany.upsert({
    where: { name: "테크솔루션즈" },
    update: {},
    create: { name: "테크솔루션즈" },
  });
  console.log(`✓ 회사 '${company.name}'`);

  // ── 3. 조직 (부서) ──
  const depts = [
    { name: "경영지원본부", sortOrder: 1 },
    { name: "개발본부", sortOrder: 2 },
    { name: "사업본부", sortOrder: 3 },
  ];
  const orgUnits: Record<string, { id: number }> = {};
  for (const d of depts) {
    const unit = await prisma.orgUnit.upsert({
      where: { name_companyId: { name: d.name, companyId: company.id } },
      update: { sortOrder: d.sortOrder },
      create: { name: d.name, companyId: company.id, sortOrder: d.sortOrder },
    });
    orgUnits[d.name] = unit;
  }

  // 하위 부서
  const subDepts = [
    { name: "인사팀", parent: "경영지원본부", sortOrder: 1 },
    { name: "재무팀", parent: "경영지원본부", sortOrder: 2 },
    { name: "IT인프라팀", parent: "경영지원본부", sortOrder: 3 },
    { name: "백엔드팀", parent: "개발본부", sortOrder: 1 },
    { name: "프론트엔드팀", parent: "개발본부", sortOrder: 2 },
    { name: "QA팀", parent: "개발본부", sortOrder: 3 },
    { name: "데이터팀", parent: "개발본부", sortOrder: 4 },
    { name: "영업팀", parent: "사업본부", sortOrder: 1 },
    { name: "마케팅팀", parent: "사업본부", sortOrder: 2 },
  ];
  for (const sd of subDepts) {
    const unit = await prisma.orgUnit.upsert({
      where: { name_companyId: { name: sd.name, companyId: company.id } },
      update: { sortOrder: sd.sortOrder, parentId: orgUnits[sd.parent].id },
      create: {
        name: sd.name,
        companyId: company.id,
        parentId: orgUnits[sd.parent].id,
        sortOrder: sd.sortOrder,
      },
    });
    orgUnits[sd.name] = unit;
  }
  console.log(`✓ 조직 ${Object.keys(orgUnits).length}개`);

  // ── 4. 직원 ──
  const employeeData = [
    { name: "김대표", dept: "경영지원본부", email: "ceo@techsol.co.kr", title: "대표이사" },
    { name: "이정호", dept: "인사팀", email: "jh.lee@techsol.co.kr", title: "팀장" },
    { name: "박수진", dept: "재무팀", email: "sj.park@techsol.co.kr", title: "팀장" },
    { name: "최민수", dept: "IT인프라팀", email: "ms.choi@techsol.co.kr", title: "팀장" },
    { name: "정우진", dept: "개발본부", email: "wj.jung@techsol.co.kr", title: "본부장" },
    { name: "한서연", dept: "백엔드팀", email: "sy.han@techsol.co.kr", title: "팀장" },
    { name: "김태현", dept: "백엔드팀", email: "th.kim@techsol.co.kr", title: "시니어" },
    { name: "오지영", dept: "백엔드팀", email: "jy.oh@techsol.co.kr", title: "주니어" },
    { name: "윤다은", dept: "프론트엔드팀", email: "de.yoon@techsol.co.kr", title: "팀장" },
    { name: "서준혁", dept: "프론트엔드팀", email: "jh.seo@techsol.co.kr", title: "시니어" },
    { name: "임하늘", dept: "프론트엔드팀", email: "hn.lim@techsol.co.kr", title: "주니어" },
    { name: "송민호", dept: "QA팀", email: "mh.song@techsol.co.kr", title: "팀장" },
    { name: "강예린", dept: "QA팀", email: "yr.kang@techsol.co.kr", title: "사원" },
    { name: "조현우", dept: "데이터팀", email: "hw.cho@techsol.co.kr", title: "팀장" },
    { name: "배성민", dept: "데이터팀", email: "sm.bae@techsol.co.kr", title: "사원" },
    { name: "노영석", dept: "사업본부", email: "ys.noh@techsol.co.kr", title: "본부장" },
    { name: "문지원", dept: "영업팀", email: "jw.moon@techsol.co.kr", title: "팀장" },
    { name: "장하린", dept: "영업팀", email: "hr.jang@techsol.co.kr", title: "사원" },
    { name: "유승아", dept: "마케팅팀", email: "sa.yoo@techsol.co.kr", title: "팀장" },
    { name: "권도현", dept: "마케팅팀", email: "dh.kwon@techsol.co.kr", title: "사원" },
  ];

  const employees: Record<string, { id: number }> = {};
  for (const e of employeeData) {
    const emp = await prisma.employee.upsert({
      where: { email: e.email },
      update: { name: e.name, department: e.dept, title: e.title, companyId: company.id, orgUnitId: orgUnits[e.dept].id },
      create: {
        name: e.name,
        department: e.dept,
        email: e.email,
        title: e.title,
        companyId: company.id,
        orgUnitId: orgUnits[e.dept].id,
        status: "ACTIVE",
      },
    });
    employees[e.name] = emp;
  }
  console.log(`✓ 직원 ${Object.keys(employees).length}명`);

  // ── 5. 라이선스 그룹 ──
  const devGroup = await prisma.licenseGroup.upsert({
    where: { name: "개발 도구" },
    update: {},
    create: { name: "개발 도구", description: "개발팀 필수 라이선스 묶음" },
  });
  const bizGroup = await prisma.licenseGroup.upsert({
    where: { name: "업무 도구" },
    update: {},
    create: { name: "업무 도구", description: "전사 공통 업무 라이선스" },
  });
  console.log(`✓ 라이선스 그룹 2개`);

  // ── 6. 라이선스 ──
  const now = new Date();
  const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

  const licenseData = [
    {
      name: "Microsoft 365 Business",
      licenseType: "NO_KEY" as const,
      totalQuantity: 20,
      price: 264000,
      purchaseDate: twoYearsAgo,
      expiryDate: oneYearLater,
      vendor: "Microsoft",
      paymentCycle: "YEARLY" as const,
      currency: "KRW" as const,
      unitPrice: 264000,
      quantity: 20,
      totalAmountKRW: 5280000,
      description: "전사 Office 365 라이선스 (E3 플랜)",
    },
    {
      name: "JetBrains All Products Pack",
      licenseType: "KEY_BASED" as const,
      totalQuantity: 8,
      price: 649,
      purchaseDate: sixMonthsAgo,
      expiryDate: oneYearLater,
      vendor: "JetBrains",
      paymentCycle: "YEARLY" as const,
      currency: "USD" as const,
      exchangeRate: 1350,
      unitPrice: 649,
      quantity: 8,
      totalAmountForeign: 5192,
      totalAmountKRW: 7009200,
      description: "IntelliJ, WebStorm, DataGrip 등 전체 패키지",
    },
    {
      name: "Figma Professional",
      licenseType: "NO_KEY" as const,
      totalQuantity: 5,
      price: 15,
      purchaseDate: sixMonthsAgo,
      expiryDate: oneYearLater,
      vendor: "Figma",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      exchangeRate: 1350,
      unitPrice: 15,
      quantity: 5,
      totalAmountForeign: 75,
      totalAmountKRW: 101250,
      description: "디자인 협업 도구 (월 과금)",
    },
    {
      name: "Jira Software Cloud",
      licenseType: "NO_KEY" as const,
      totalQuantity: 20,
      price: 8.15,
      purchaseDate: twoYearsAgo,
      expiryDate: oneYearLater,
      vendor: "Atlassian",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      exchangeRate: 1350,
      unitPrice: 8.15,
      quantity: 20,
      totalAmountForeign: 163,
      totalAmountKRW: 220050,
      description: "프로젝트 관리 도구",
    },
    {
      name: "Slack Business+",
      licenseType: "NO_KEY" as const,
      totalQuantity: 20,
      price: 12.50,
      purchaseDate: twoYearsAgo,
      expiryDate: oneYearLater,
      vendor: "Salesforce",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      exchangeRate: 1350,
      unitPrice: 12.50,
      quantity: 20,
      totalAmountForeign: 250,
      totalAmountKRW: 337500,
      description: "업무 메신저",
    },
    {
      name: "GitHub Enterprise",
      licenseType: "NO_KEY" as const,
      totalQuantity: 12,
      price: 21,
      purchaseDate: sixMonthsAgo,
      expiryDate: oneYearLater,
      vendor: "GitHub (Microsoft)",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      exchangeRate: 1350,
      unitPrice: 21,
      quantity: 12,
      totalAmountForeign: 252,
      totalAmountKRW: 340200,
      description: "코드 저장소 & CI/CD",
    },
    {
      name: "Adobe Creative Cloud",
      licenseType: "NO_KEY" as const,
      totalQuantity: 3,
      price: 79.99,
      purchaseDate: sixMonthsAgo,
      expiryDate: oneYearLater,
      vendor: "Adobe",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      exchangeRate: 1350,
      unitPrice: 79.99,
      quantity: 3,
      totalAmountForeign: 239.97,
      totalAmountKRW: 323960,
      description: "디자인/영상 제작 (마케팅팀)",
    },
    {
      name: "Windows 11 Pro",
      licenseType: "KEY_BASED" as const,
      totalQuantity: 15,
      price: 259000,
      purchaseDate: twoYearsAgo,
      vendor: "Microsoft",
      currency: "KRW" as const,
      unitPrice: 259000,
      quantity: 15,
      totalAmountKRW: 3885000,
      description: "데스크톱 OS 영구 라이선스",
    },
  ];

  const licenses: Record<string, { id: number }> = {};
  for (const ld of licenseData) {
    const lic = await prisma.license.upsert({
      where: { name: ld.name },
      update: {},
      create: ld,
    });
    licenses[ld.name] = lic;
  }
  console.log(`✓ 라이선스 ${Object.keys(licenses).length}개`);

  // 라이선스 그룹 멤버
  const devLicenses = ["JetBrains All Products Pack", "GitHub Enterprise", "Jira Software Cloud"];
  const bizLicenses = ["Microsoft 365 Business", "Slack Business+"];
  for (const name of devLicenses) {
    await prisma.licenseGroupMember.upsert({
      where: { licenseGroupId_licenseId: { licenseGroupId: devGroup.id, licenseId: licenses[name].id } },
      update: {},
      create: { licenseGroupId: devGroup.id, licenseId: licenses[name].id },
    });
  }
  for (const name of bizLicenses) {
    await prisma.licenseGroupMember.upsert({
      where: { licenseGroupId_licenseId: { licenseGroupId: bizGroup.id, licenseId: licenses[name].id } },
      update: {},
      create: { licenseGroupId: bizGroup.id, licenseId: licenses[name].id },
    });
  }

  // ── 7. 라이선스 할당 (일부 직원에게) ──
  const assignmentPairs = [
    // JetBrains → 개발자들
    { license: "JetBrains All Products Pack", employee: "한서연" },
    { license: "JetBrains All Products Pack", employee: "김태현" },
    { license: "JetBrains All Products Pack", employee: "오지영" },
    { license: "JetBrains All Products Pack", employee: "윤다은" },
    { license: "JetBrains All Products Pack", employee: "서준혁" },
    { license: "JetBrains All Products Pack", employee: "임하늘" },
    { license: "JetBrains All Products Pack", employee: "조현우" },
    // Figma → 디자인 관련
    { license: "Figma Professional", employee: "윤다은" },
    { license: "Figma Professional", employee: "서준혁" },
    { license: "Figma Professional", employee: "유승아" },
    // GitHub → 개발자들
    { license: "GitHub Enterprise", employee: "한서연" },
    { license: "GitHub Enterprise", employee: "김태현" },
    { license: "GitHub Enterprise", employee: "오지영" },
    { license: "GitHub Enterprise", employee: "윤다은" },
    { license: "GitHub Enterprise", employee: "서준혁" },
    { license: "GitHub Enterprise", employee: "임하늘" },
    { license: "GitHub Enterprise", employee: "조현우" },
    { license: "GitHub Enterprise", employee: "배성민" },
    { license: "GitHub Enterprise", employee: "송민호" },
    // Adobe → 마케팅
    { license: "Adobe Creative Cloud", employee: "유승아" },
    { license: "Adobe Creative Cloud", employee: "권도현" },
  ];

  let assignCount = 0;
  for (const ap of assignmentPairs) {
    const existing = await prisma.assignment.findFirst({
      where: {
        licenseId: licenses[ap.license].id,
        employeeId: employees[ap.employee].id,
        returnedDate: null,
      },
    });
    if (!existing) {
      await prisma.assignment.create({
        data: {
          licenseId: licenses[ap.license].id,
          employeeId: employees[ap.employee].id,
          assignedDate: sixMonthsAgo,
        },
      });
      assignCount++;
    }
  }
  console.log(`✓ 라이선스 할당 ${assignCount}건`);

  // ── 8. 자산 분류 체계 (대분류 + 소분류) ──
  const majorCategories = [
    { name: "클라우드", code: "CL", abbr: "CLoud", sortOrder: 1 },
    { name: "서버", code: "SVR", abbr: "SerVeR", sortOrder: 2 },
    { name: "네트워크", code: "NET", abbr: "NETwork", sortOrder: 3 },
    { name: "데이터베이스", code: "DB", abbr: "DataBase", sortOrder: 4 },
    { name: "엔드포인트", code: "EP", abbr: "EndPoint", sortOrder: 5 },
    { name: "도메인", code: "DOM", abbr: "DOMain", sortOrder: 6 },
  ];
  const majorMap: Record<string, { id: number }> = {};
  for (const mc of majorCategories) {
    const cat = await prisma.assetMajorCategory.upsert({
      where: { code: mc.code },
      update: { name: mc.name, sortOrder: mc.sortOrder },
      create: mc,
    });
    majorMap[mc.code] = cat;
  }

  const subCategories = [
    { majorCode: "CL", name: "VPC", code: "VPC", isIsmsTarget: true },
    { majorCode: "CL", name: "Security Group", code: "SG", isIsmsTarget: true },
    { majorCode: "CL", name: "S3 Bucket", code: "S3", isIsmsTarget: true },
    { majorCode: "CL", name: "EC2 Instance", code: "EC2", isIsmsTarget: true },
    { majorCode: "CL", name: "RDS Instance", code: "RDS", isIsmsTarget: true },
    { majorCode: "CL", name: "Lambda Function", code: "LAMBDA" },
    { majorCode: "CL", name: "CloudFront", code: "CF" },
    { majorCode: "CL", name: "Route53", code: "R53" },
    { majorCode: "CL", name: "ELB", code: "ELB" },
    { majorCode: "SVR", name: "Linux 서버", code: "LI", isIsmsTarget: true },
    { majorCode: "SVR", name: "Windows 서버", code: "WI", isIsmsTarget: true },
    { majorCode: "NET", name: "방화벽", code: "FW", isIsmsTarget: true },
    { majorCode: "NET", name: "스위치", code: "SW" },
    { majorCode: "NET", name: "라우터", code: "RT" },
    { majorCode: "DB", name: "PostgreSQL", code: "PG", isIsmsTarget: true },
    { majorCode: "DB", name: "MySQL", code: "MY", isIsmsTarget: true },
    { majorCode: "DB", name: "Redis", code: "RD" },
    { majorCode: "EP", name: "노트북", code: "NB" },
    { majorCode: "EP", name: "데스크톱", code: "DT" },
    { majorCode: "EP", name: "모니터", code: "MN" },
    { majorCode: "DOM", name: "도메인", code: "DOMAIN" },
    { majorCode: "DOM", name: "SSL 인증서", code: "SSL" },
  ];
  const subMap: Record<string, { id: number }> = {};
  for (const sc of subCategories) {
    const sub = await prisma.assetSubCategory.upsert({
      where: { code: sc.code },
      update: {},
      create: {
        majorCategoryId: majorMap[sc.majorCode].id,
        name: sc.name,
        code: sc.code,
        isIsmsTarget: sc.isIsmsTarget ?? false,
      },
    });
    subMap[sc.code] = sub;
  }
  console.log(`✓ 자산 분류 대분류 ${majorCategories.length}개, 소분류 ${subCategories.length}개`);

  // ── 9. 클라우드 자산 ──
  const cloudAssets = [
    {
      name: "Production VPC",
      subCategoryCode: "VPC",
      vendor: "AWS",
      status: "IN_USE" as const,
      monthlyCost: 0,
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "Network", resourceType: "VPC", resourceId: "vpc-0abc123def456" },
    },
    {
      name: "API 서버 (Prod)",
      subCategoryCode: "EC2",
      vendor: "AWS",
      status: "IN_USE" as const,
      monthlyCost: 85000,
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "IaaS", resourceType: "EC2", resourceId: "i-0abc123def456", instanceSpec: "t4g.medium", endpoint: "10.0.1.50" },
    },
    {
      name: "API 서버 (Staging)",
      subCategoryCode: "EC2",
      vendor: "AWS",
      status: "IN_USE" as const,
      monthlyCost: 42000,
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "IaaS", resourceType: "EC2", resourceId: "i-0def789ghi012", instanceSpec: "t4g.small", endpoint: "10.0.2.30" },
    },
    {
      name: "메인 DB (PostgreSQL)",
      subCategoryCode: "RDS",
      vendor: "AWS",
      status: "IN_USE" as const,
      monthlyCost: 180000,
      ciaC: 3, ciaI: 3, ciaA: 3,
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "Database", resourceType: "RDS", resourceId: "db-prod-postgres", instanceSpec: "db.r6g.large", storageSize: "100GB", endpoint: "prod-db.abc123.ap-northeast-2.rds.amazonaws.com" },
    },
    {
      name: "정적 파일 S3",
      subCategoryCode: "S3",
      vendor: "AWS",
      status: "IN_USE" as const,
      monthlyCost: 5200,
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "Storage", resourceType: "S3", resourceId: "arn:aws:s3:::techsol-static-prod", storageSize: "50GB" },
    },
    {
      name: "CloudFront CDN",
      subCategoryCode: "CF",
      vendor: "AWS",
      status: "IN_USE" as const,
      monthlyCost: 32000,
      cloud: { platform: "AWS", accountId: "123456789012", region: "global", serviceCategory: "Network", resourceType: "CloudFront", resourceId: "E1ABC2DEF3GH4I" },
    },
    {
      name: "Google Workspace",
      subCategoryCode: "VPC",
      vendor: "Google",
      status: "IN_USE" as const,
      monthlyCost: 280000,
      cloud: { platform: "Google", accountId: "techsol.co.kr", serviceCategory: "SaaS", seatCount: 20, contractTermMonths: 12 },
    },
    {
      name: "Datadog Monitoring",
      subCategoryCode: "LAMBDA",
      vendor: "Datadog",
      status: "IN_USE" as const,
      monthlyCost: 150000,
      cloud: { platform: "Datadog", serviceCategory: "SaaS", seatCount: 5, adminEmail: "ms.choi@techsol.co.kr" },
    },
  ];

  let cloudCount = 0;
  for (const ca of cloudAssets) {
    const existing = await prisma.asset.findFirst({ where: { name: ca.name, type: "CLOUD" } });
    if (!existing) {
      await prisma.asset.create({
        data: {
          type: "CLOUD",
          name: ca.name,
          vendor: ca.vendor,
          status: ca.status,
          subCategoryId: subMap[ca.subCategoryCode]?.id,
          monthlyCost: ca.monthlyCost,
          currency: "KRW",
          companyId: company.id,
          orgUnitId: orgUnits["IT인프라팀"].id,
          ciaC: ca.ciaC,
          ciaI: ca.ciaI,
          ciaA: ca.ciaA,
          cloudDetail: { create: ca.cloud },
        },
      });
      cloudCount++;
    }
  }
  console.log(`✓ 클라우드 자산 ${cloudCount}개`);

  // ── 10. 하드웨어 자산 ──
  const hwAssets = [
    {
      name: "MacBook Pro 16 M4 Pro #1",
      assignee: "한서연",
      hw: { deviceType: "Laptop", manufacturer: "Apple", model: "MacBook Pro 16-inch M4 Pro", serialNumber: "C02XG1T2MD6T", hostname: "sy-han-mbp", os: "macOS", osVersion: "Sequoia 15.4", cpu: "Apple M4 Pro", ram: "36GB", storage: "512GB SSD", displaySize: "16.2인치" },
    },
    {
      name: "MacBook Pro 14 M4 #2",
      assignee: "김태현",
      hw: { deviceType: "Laptop", manufacturer: "Apple", model: "MacBook Pro 14-inch M4", serialNumber: "C02YH2U3NE7U", hostname: "th-kim-mbp", os: "macOS", osVersion: "Sequoia 15.4", cpu: "Apple M4", ram: "24GB", storage: "512GB SSD", displaySize: "14.2인치" },
    },
    {
      name: "MacBook Pro 14 M4 #3",
      assignee: "윤다은",
      hw: { deviceType: "Laptop", manufacturer: "Apple", model: "MacBook Pro 14-inch M4", serialNumber: "C02ZI3V4OF8V", hostname: "de-yoon-mbp", os: "macOS", osVersion: "Sequoia 15.4", cpu: "Apple M4", ram: "24GB", storage: "512GB SSD", displaySize: "14.2인치" },
    },
    {
      name: "MacBook Air 15 M3 #4",
      assignee: "서준혁",
      hw: { deviceType: "Laptop", manufacturer: "Apple", model: "MacBook Air 15-inch M3", serialNumber: "C03AJ4W5PG9W", hostname: "jh-seo-mba", os: "macOS", osVersion: "Sequoia 15.4", cpu: "Apple M3", ram: "16GB", storage: "256GB SSD", displaySize: "15.3인치" },
    },
    {
      name: "ThinkPad X1 Carbon Gen 12 #5",
      assignee: "이정호",
      hw: { deviceType: "Laptop", manufacturer: "Lenovo", model: "ThinkPad X1 Carbon Gen 12", serialNumber: "PF4ABC12", hostname: "jh-lee-tp", os: "Windows", osVersion: "Windows 11 Pro", cpu: "Intel Core Ultra 7 155H", ram: "32GB", storage: "512GB SSD", displaySize: "14인치" },
    },
    {
      name: "Dell Latitude 5550 #6",
      assignee: "문지원",
      hw: { deviceType: "Laptop", manufacturer: "Dell", model: "Latitude 5550", serialNumber: "D3LL5550A1", hostname: "jw-moon-dell", os: "Windows", osVersion: "Windows 11 Pro", cpu: "Intel Core Ultra 5 135U", ram: "16GB", storage: "256GB SSD", displaySize: "15.6인치" },
    },
    {
      name: "Dell OptiPlex 7020 #7",
      assignee: "박수진",
      hw: { deviceType: "Desktop", manufacturer: "Dell", model: "OptiPlex 7020 MT", serialNumber: "D3LL7020B2", hostname: "sj-park-op", os: "Windows", osVersion: "Windows 11 Pro", cpu: "Intel Core i7-14700", ram: "32GB", storage: "1TB SSD" },
    },
    {
      name: "Dell U2723QE 27인치 모니터 #1",
      assignee: "한서연",
      hw: { deviceType: "Peripheral", manufacturer: "Dell", model: "U2723QE", serialNumber: "MN27A001", resolution: "3840x2160" },
    },
    {
      name: "Dell U2723QE 27인치 모니터 #2",
      assignee: "김태현",
      hw: { deviceType: "Peripheral", manufacturer: "Dell", model: "U2723QE", serialNumber: "MN27A002", resolution: "3840x2160" },
    },
    {
      name: "LG 27UK850 27인치 모니터 #3",
      assignee: "윤다은",
      hw: { deviceType: "Peripheral", manufacturer: "LG", model: "27UK850", serialNumber: "MN27B003", resolution: "3840x2160" },
    },
  ];

  let hwCount = 0;
  for (const ha of hwAssets) {
    const existing = await prisma.asset.findFirst({ where: { name: ha.name, type: "HARDWARE" } });
    if (!existing) {
      await prisma.asset.create({
        data: {
          type: "HARDWARE",
          name: ha.name,
          vendor: ha.hw.manufacturer,
          status: "IN_USE",
          companyId: company.id,
          assigneeId: employees[ha.assignee]?.id,
          purchaseDate: sixMonthsAgo,
          subCategoryId: ha.hw.deviceType === "Peripheral" ? subMap["MN"]?.id : subMap["NB"]?.id,
          hardwareDetail: { create: ha.hw },
        },
      });
      hwCount++;
    }
  }
  console.log(`✓ 하드웨어 자산 ${hwCount}개`);

  // ── 11. 도메인 자산 ──
  const domainAssets = [
    {
      name: "techsol.co.kr",
      domain: { domainName: "techsol.co.kr", registrar: "가비아", sslType: "WILDCARD", issuer: "Let's Encrypt", autoRenew: true },
      expiryDate: oneYearLater,
      monthlyCost: 2500,
    },
    {
      name: "techsol-api.com",
      domain: { domainName: "techsol-api.com", registrar: "Route53", sslType: "DV", issuer: "AWS Certificate Manager", autoRenew: true },
      expiryDate: oneYearLater,
      monthlyCost: 1500,
    },
    {
      name: "techsol-admin.internal",
      domain: { domainName: "techsol-admin.internal", registrar: "내부 DNS", sslType: "DV", issuer: "자체 CA", autoRenew: false },
      expiryDate: oneYearLater,
      monthlyCost: 0,
    },
  ];

  let domainCount = 0;
  for (const da of domainAssets) {
    const existing = await prisma.asset.findFirst({ where: { name: da.name, type: "DOMAIN_SSL" } });
    if (!existing) {
      await prisma.asset.create({
        data: {
          type: "DOMAIN_SSL",
          name: da.name,
          status: "IN_USE",
          companyId: company.id,
          orgUnitId: orgUnits["IT인프라팀"].id,
          expiryDate: da.expiryDate,
          monthlyCost: da.monthlyCost,
          currency: "KRW",
          subCategoryId: subMap["DOMAIN"]?.id,
          domainDetail: { create: da.domain },
        },
      });
      domainCount++;
    }
  }
  console.log(`✓ 도메인 자산 ${domainCount}개`);

  // ── 12. 계약 자산 ──
  const contractAssets = [
    {
      name: "AWS 연간 계약 (Enterprise Support)",
      vendor: "AWS",
      monthlyCost: 1500000,
      contract: { contractNumber: "AWS-2024-001", counterparty: "Amazon Web Services", contractType: "SLA", autoRenew: true },
    },
    {
      name: "네트워크 유지보수 계약",
      vendor: "KT",
      monthlyCost: 350000,
      contract: { contractNumber: "KT-NET-2024-012", counterparty: "KT", contractType: "유지보수", autoRenew: true },
    },
    {
      name: "보안 컨설팅 계약",
      vendor: "안랩",
      monthlyCost: 500000,
      contract: { contractNumber: "AHNLAB-2024-SC03", counterparty: "안랩", contractType: "외주", autoRenew: false },
    },
  ];

  let contractCount = 0;
  for (const ca of contractAssets) {
    const existing = await prisma.asset.findFirst({ where: { name: ca.name, type: "CONTRACT" } });
    if (!existing) {
      await prisma.asset.create({
        data: {
          type: "CONTRACT",
          name: ca.name,
          vendor: ca.vendor,
          status: "IN_USE",
          companyId: company.id,
          orgUnitId: orgUnits["IT인프라팀"].id,
          purchaseDate: twoYearsAgo,
          expiryDate: oneYearLater,
          monthlyCost: ca.monthlyCost,
          currency: "KRW",
          billingCycle: "MONTHLY",
          contractDetail: { create: ca.contract },
        },
      });
      contractCount++;
    }
  }
  console.log(`✓ 계약 자산 ${contractCount}개`);

  // ── 13. 감사 로그 (샘플) ──
  const auditLogs = [
    { entityType: "LICENSE", entityId: licenses["JetBrains All Products Pack"].id, action: "CREATE", actor: "admin", details: "JetBrains 전체 패키지 라이선스 등록" },
    { entityType: "LICENSE", entityId: licenses["JetBrains All Products Pack"].id, action: "ASSIGN", actor: "admin", details: "한서연에게 할당" },
    { entityType: "LICENSE", entityId: licenses["Microsoft 365 Business"].id, action: "CREATE", actor: "admin", details: "Microsoft 365 Business 라이선스 등록" },
    { entityType: "EMPLOYEE", entityId: employees["한서연"].id, action: "CREATE", actor: "admin", details: "직원 등록: 한서연 (백엔드팀 팀장)" },
    { entityType: "ASSET", entityId: 1, action: "CREATE", actor: "admin", details: "클라우드 자산 등록: Production VPC" },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }
  console.log(`✓ 감사 로그 ${auditLogs.length}건`);

  // ── 14. 직책별 CIA 등급 매핑 ──
  const ciaMappings = [
    { title: "대표이사", ciaC: 3, ciaI: 3, ciaA: 3 },
    { title: "본부장", ciaC: 3, ciaI: 3, ciaA: 2 },
    { title: "팀장", ciaC: 2, ciaI: 2, ciaA: 2 },
    { title: "시니어", ciaC: 2, ciaI: 2, ciaA: 1 },
    { title: "주니어", ciaC: 1, ciaI: 1, ciaA: 1 },
    { title: "사원", ciaC: 1, ciaI: 1, ciaA: 1 },
  ];
  for (const cm of ciaMappings) {
    await prisma.titleCiaMapping.upsert({
      where: { title: cm.title },
      update: { ciaC: cm.ciaC, ciaI: cm.ciaI, ciaA: cm.ciaA },
      create: cm,
    });
  }
  console.log(`✓ CIA 등급 매핑 ${ciaMappings.length}개`);

  console.log("\n🎉 시연용 더미데이터 시드 완료!");
  console.log("   로그인: admin / changeme123 (관리자) 또는 user / user1234 (일반)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
