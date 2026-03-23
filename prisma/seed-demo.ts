/**
 * 로컬 전용 더미 데이터 시드
 * 실행: npx tsx prisma/seed-demo.ts
 *
 * ⚠️ 기존 데이터를 삭제하지 않고, upsert 또는 create 방식으로 추가합니다.
 *    이미 존재하는 unique 키는 건너뜁니다.
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// ── 프로덕션 안전장치 ──
if (process.env.NODE_ENV === "production") {
  console.error("❌  seed-demo는 프로덕션 환경에서 실행할 수 없습니다.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 더미 데이터 시드 시작...\n");

  // ────────────────────────────────────────────
  // 1. 사용자
  // ────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin1234", 12);
  const userHash = await bcrypt.hash("user1234", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: adminHash, role: "ADMIN", isActive: true },
  });
  const viewer = await prisma.user.upsert({
    where: { username: "viewer" },
    update: {},
    create: { username: "viewer", password: userHash, role: "USER", isActive: true },
  });
  console.log("✓ 사용자 2명");

  // ────────────────────────────────────────────
  // 2. 회사 + 조직
  // ────────────────────────────────────────────
  const company = await prisma.orgCompany.upsert({
    where: { name: "데모 주식회사" },
    update: {},
    create: { name: "데모 주식회사" },
  });

  const deptNames = ["경영지원팀", "개발팀", "인프라팀", "보안팀", "디자인팀"];
  const depts: Record<string, { id: number }> = {};
  for (let i = 0; i < deptNames.length; i++) {
    depts[deptNames[i]] = await prisma.orgUnit.upsert({
      where: { name_companyId: { name: deptNames[i], companyId: company.id } },
      update: {},
      create: { name: deptNames[i], companyId: company.id, sortOrder: i },
    });
  }
  console.log(`✓ 회사 1개, 부서 ${deptNames.length}개`);

  // ────────────────────────────────────────────
  // 3. 조직원
  // ────────────────────────────────────────────
  const employeeData = [
    { name: "김철수", dept: "경영지원팀", email: "cs.kim@demo.co.kr", title: "팀장" },
    { name: "이영희", dept: "개발팀", email: "yh.lee@demo.co.kr", title: "팀장" },
    { name: "박민수", dept: "개발팀", email: "ms.park@demo.co.kr", title: "선임" },
    { name: "최지은", dept: "개발팀", email: "je.choi@demo.co.kr", title: "사원" },
    { name: "정하늘", dept: "인프라팀", email: "hn.jung@demo.co.kr", title: "팀장" },
    { name: "한서윤", dept: "인프라팀", email: "sy.han@demo.co.kr", title: "선임" },
    { name: "윤도현", dept: "보안팀", email: "dh.yoon@demo.co.kr", title: "팀장" },
    { name: "조은비", dept: "보안팀", email: "eb.cho@demo.co.kr", title: "사원" },
    { name: "강예린", dept: "디자인팀", email: "yr.kang@demo.co.kr", title: "팀장" },
    { name: "임준호", dept: "디자인팀", email: "jh.lim@demo.co.kr", title: "사원" },
    { name: "오세진", dept: "경영지원팀", email: "sj.oh@demo.co.kr", title: "대리" },
    { name: "송미래", dept: "개발팀", email: "mr.song@demo.co.kr", title: "사원" },
  ];

  const employees: { id: number; name: string; dept: string }[] = [];
  for (const e of employeeData) {
    const emp = await prisma.employee.upsert({
      where: { email: e.email },
      update: {},
      create: {
        name: e.name,
        department: e.dept,
        email: e.email,
        title: e.title,
        companyId: company.id,
        orgUnitId: depts[e.dept].id,
        status: "ACTIVE",
      },
    });
    employees.push({ id: emp.id, name: emp.name, dept: e.dept });
  }
  console.log(`✓ 조직원 ${employees.length}명`);

  // ────────────────────────────────────────────
  // 4. 라이선스
  // ────────────────────────────────────────────
  const licenseData = [
    {
      name: "Microsoft 365 Business",
      licenseType: "KEY_BASED" as const,
      totalQuantity: 20,
      price: 15000,
      vendor: "Microsoft",
      paymentCycle: "MONTHLY" as const,
      currency: "KRW" as const,
      unitPrice: 15000,
      quantity: 20,
      purchaseDate: new Date("2025-01-15"),
      expiryDate: new Date("2026-01-14"),
    },
    {
      name: "Adobe Creative Cloud",
      licenseType: "KEY_BASED" as const,
      totalQuantity: 5,
      price: 59.99,
      vendor: "Adobe",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      unitPrice: 59.99,
      quantity: 5,
      exchangeRate: 1350,
      purchaseDate: new Date("2025-03-01"),
      expiryDate: new Date("2026-02-28"),
    },
    {
      name: "JetBrains All Products",
      licenseType: "KEY_BASED" as const,
      totalQuantity: 8,
      price: 649,
      vendor: "JetBrains",
      paymentCycle: "YEARLY" as const,
      currency: "USD" as const,
      unitPrice: 649,
      quantity: 8,
      exchangeRate: 1350,
      purchaseDate: new Date("2025-06-01"),
      expiryDate: new Date("2026-05-31"),
    },
    {
      name: "Slack Business+",
      licenseType: "NO_KEY" as const,
      totalQuantity: 15,
      price: 12.5,
      vendor: "Slack",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      unitPrice: 12.5,
      quantity: 15,
      exchangeRate: 1350,
      purchaseDate: new Date("2025-02-01"),
      expiryDate: new Date("2026-01-31"),
    },
    {
      name: "Notion Team",
      licenseType: "NO_KEY" as const,
      totalQuantity: 12,
      price: 10,
      vendor: "Notion",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      unitPrice: 10,
      quantity: 12,
      exchangeRate: 1350,
      purchaseDate: new Date("2025-04-01"),
      expiryDate: new Date("2026-03-31"),
    },
    {
      name: "Figma Organization",
      licenseType: "NO_KEY" as const,
      totalQuantity: 5,
      price: 75,
      vendor: "Figma",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      unitPrice: 75,
      quantity: 5,
      exchangeRate: 1350,
      purchaseDate: new Date("2025-05-01"),
      expiryDate: new Date("2026-04-30"),
    },
    {
      name: "Windows Server 2022 Standard",
      licenseType: "VOLUME" as const,
      totalQuantity: 3,
      price: 1069,
      vendor: "Microsoft",
      paymentCycle: "YEARLY" as const,
      currency: "USD" as const,
      unitPrice: 1069,
      quantity: 3,
      exchangeRate: 1350,
      purchaseDate: new Date("2024-07-01"),
      expiryDate: new Date("2027-06-30"),
    },
    {
      name: "GitHub Enterprise",
      licenseType: "NO_KEY" as const,
      totalQuantity: 10,
      price: 21,
      vendor: "GitHub",
      paymentCycle: "MONTHLY" as const,
      currency: "USD" as const,
      unitPrice: 21,
      quantity: 10,
      exchangeRate: 1350,
      purchaseDate: new Date("2025-01-01"),
      expiryDate: new Date("2025-12-31"),
    },
  ];

  const licenses: { id: number; name: string }[] = [];
  for (const lic of licenseData) {
    const l = await prisma.license.upsert({
      where: { name: lic.name },
      update: {},
      create: {
        ...lic,
        totalAmountKRW:
          (lic.unitPrice ?? 0) * (lic.quantity ?? 0) * (lic.exchangeRate ?? 1),
        totalAmountForeign: (lic.unitPrice ?? 0) * (lic.quantity ?? 0),
        isVatIncluded: false,
        exchangeRate: lic.exchangeRate ?? 1,
      },
    });
    licenses.push({ id: l.id, name: l.name });
  }
  console.log(`✓ 라이선스 ${licenses.length}개`);

  // ────────────────────────────────────────────
  // 5. 라이선스 ↔ 조직원 할당
  // ────────────────────────────────────────────
  const assignmentMap = [
    { lic: "Microsoft 365 Business", empIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { lic: "Adobe Creative Cloud", empIndices: [8, 9, 3] },
    { lic: "JetBrains All Products", empIndices: [1, 2, 3, 11] },
    { lic: "Slack Business+", empIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    { lic: "Notion Team", empIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { lic: "Figma Organization", empIndices: [8, 9, 2] },
    { lic: "GitHub Enterprise", empIndices: [1, 2, 3, 4, 5, 11] },
  ];

  let assignCount = 0;
  for (const am of assignmentMap) {
    const lic = licenses.find((l) => l.name === am.lic);
    if (!lic) continue;
    for (const idx of am.empIndices) {
      const emp = employees[idx];
      if (!emp) continue;
      const existing = await prisma.assignment.findFirst({
        where: { licenseId: lic.id, employeeId: emp.id, returnedDate: null },
      });
      if (!existing) {
        await prisma.assignment.create({
          data: { licenseId: lic.id, employeeId: emp.id },
        });
        assignCount++;
      }
    }
  }
  console.log(`✓ 라이선스 할당 ${assignCount}건`);

  // ────────────────────────────────────────────
  // 6. 라이선스 그룹
  // ────────────────────────────────────────────
  const group = await prisma.licenseGroup.upsert({
    where: { name: "개발 도구" },
    update: {},
    create: { name: "개발 도구", description: "개발팀 필수 라이선스 모음" },
  });
  const devLicNames = ["JetBrains All Products", "GitHub Enterprise"];
  for (const ln of devLicNames) {
    const lic = licenses.find((l) => l.name === ln);
    if (!lic) continue;
    await prisma.licenseGroupMember.upsert({
      where: { licenseGroupId_licenseId: { licenseGroupId: group.id, licenseId: lic.id } },
      update: {},
      create: { licenseGroupId: group.id, licenseId: lic.id },
    });
  }
  console.log("✓ 라이선스 그룹 1개");

  // ────────────────────────────────────────────
  // 7. 자산 분류 체계
  // ────────────────────────────────────────────
  const majorCategories = [
    { name: "클라우드", code: "CL", abbr: "Cloud", sortOrder: 1 },
    { name: "서버", code: "SVR", abbr: "Server", sortOrder: 2 },
    { name: "네트워크", code: "NET", abbr: "Network", sortOrder: 3 },
    { name: "단말기", code: "DEV", abbr: "Device", sortOrder: 4 },
    { name: "데이터베이스", code: "DB", abbr: "Database", sortOrder: 5 },
  ];

  const majors: Record<string, { id: number }> = {};
  for (const mc of majorCategories) {
    const existing = await prisma.assetMajorCategory.findFirst({
      where: { OR: [{ code: mc.code }, { name: mc.name }] },
    });
    if (existing) {
      majors[mc.code] = existing;
    } else {
      majors[mc.code] = await prisma.assetMajorCategory.create({ data: mc });
    }
  }

  const subCategories = [
    { majorCode: "CL", name: "VPC", code: "VPC", isIsmsTarget: true },
    { majorCode: "CL", name: "Security Group", code: "SG", isIsmsTarget: true },
    { majorCode: "CL", name: "S3 Bucket", code: "S3", isIsmsTarget: true },
    { majorCode: "CL", name: "EC2 Instance", code: "EC2", isIsmsTarget: true },
    { majorCode: "CL", name: "RDS", code: "RDS", isIsmsTarget: true },
    { majorCode: "CL", name: "Lambda", code: "LAMBDA" },
    { majorCode: "CL", name: "CloudFront", code: "CF" },
    { majorCode: "CL", name: "Route53", code: "R53" },
    { majorCode: "SVR", name: "Linux", code: "LI", isIsmsTarget: true },
    { majorCode: "SVR", name: "Windows", code: "WI", isIsmsTarget: true },
    { majorCode: "NET", name: "방화벽", code: "FW", isIsmsTarget: true },
    { majorCode: "NET", name: "스위치", code: "SW" },
    { majorCode: "DEV", name: "노트북", code: "NB" },
    { majorCode: "DEV", name: "데스크탑", code: "DT" },
    { majorCode: "DEV", name: "모니터", code: "MO" },
    { majorCode: "DB", name: "PostgreSQL", code: "PG", isIsmsTarget: true },
    { majorCode: "DB", name: "MySQL", code: "MY", isIsmsTarget: true },
  ];

  const subs: Record<string, { id: number }> = {};
  for (const sc of subCategories) {
    const existing = await prisma.assetSubCategory.findFirst({
      where: { OR: [{ code: sc.code }, { name: sc.name, majorCategoryId: majors[sc.majorCode].id }] },
    });
    if (existing) {
      subs[sc.code] = existing;
    } else {
      subs[sc.code] = await prisma.assetSubCategory.create({
        data: {
          majorCategoryId: majors[sc.majorCode].id,
          name: sc.name,
          code: sc.code,
          isIsmsTarget: sc.isIsmsTarget ?? false,
        },
      });
    }
  }
  console.log(`✓ 자산 대분류 ${majorCategories.length}개, 소분류 ${subCategories.length}개`);

  // ────────────────────────────────────────────
  // 8. 하드웨어 자산
  // ────────────────────────────────────────────
  const hwAssets = [
    {
      name: "MacBook Pro 14 M4 Pro #001",
      sub: "NB",
      assignee: 1,
      cost: 3490000,
      hw: {
        deviceType: "Laptop",
        manufacturer: "Apple",
        model: "MacBook Pro 14 M4 Pro",
        serialNumber: "C02Z1234ABCD",
        os: "macOS",
        osVersion: "15.3",
        cpu: "Apple M4 Pro",
        ram: "36GB",
        storage: "512GB SSD",
        displaySize: "14.2인치",
        condition: "A",
      },
    },
    {
      name: "MacBook Pro 16 M4 Max #002",
      sub: "NB",
      assignee: 2,
      cost: 4990000,
      hw: {
        deviceType: "Laptop",
        manufacturer: "Apple",
        model: "MacBook Pro 16 M4 Max",
        serialNumber: "C02Z5678EFGH",
        os: "macOS",
        osVersion: "15.3",
        cpu: "Apple M4 Max",
        ram: "48GB",
        storage: "1TB SSD",
        displaySize: "16.2인치",
        condition: "A",
      },
    },
    {
      name: "Dell Latitude 5540 #003",
      sub: "NB",
      assignee: 0,
      cost: 1890000,
      hw: {
        deviceType: "Laptop",
        manufacturer: "Dell",
        model: "Latitude 5540",
        serialNumber: "DELL0003WXYZ",
        os: "Windows",
        osVersion: "11 Pro",
        cpu: "Intel Core i7-1365U",
        ram: "16GB DDR5",
        storage: "512GB NVMe",
        displaySize: "15.6인치",
        condition: "B",
      },
    },
    {
      name: "Dell OptiPlex 7010 #004",
      sub: "DT",
      assignee: 4,
      cost: 1290000,
      hw: {
        deviceType: "Desktop",
        manufacturer: "Dell",
        model: "OptiPlex 7010 MFF",
        serialNumber: "DELL0004MNOP",
        os: "Windows",
        osVersion: "11 Pro",
        cpu: "Intel Core i5-13500",
        ram: "16GB DDR5",
        storage: "256GB SSD",
        condition: "B",
      },
    },
    {
      name: "Dell U2723QE 모니터 #005",
      sub: "MO",
      assignee: 1,
      cost: 780000,
      hw: {
        deviceType: "Peripheral",
        manufacturer: "Dell",
        model: "U2723QE",
        serialNumber: "MON00051234",
        resolution: "3840x2160",
        displaySize: "27인치",
        condition: "A",
      },
    },
    {
      name: "LG 27UK850-W 모니터 #006",
      sub: "MO",
      assignee: 2,
      cost: 550000,
      hw: {
        deviceType: "Peripheral",
        manufacturer: "LG",
        model: "27UK850-W",
        serialNumber: "MON00065678",
        resolution: "3840x2160",
        displaySize: "27인치",
        condition: "B",
      },
    },
    // ── 노트북 추가 3대 ──
    {
      name: "Lenovo ThinkPad X1 Carbon #007",
      sub: "NB",
      assignee: 6,
      cost: 2350000,
      hw: {
        deviceType: "Laptop",
        manufacturer: "Lenovo",
        model: "ThinkPad X1 Carbon Gen 12",
        serialNumber: "LNV0007QRST",
        os: "Windows",
        osVersion: "11 Pro",
        cpu: "Intel Core Ultra 7 155U",
        ram: "32GB LPDDR5",
        storage: "1TB NVMe",
        displaySize: "14인치",
        condition: "A",
      },
    },
    {
      name: "MacBook Air 15 M3 #008",
      sub: "NB",
      assignee: 8,
      cost: 2190000,
      hw: {
        deviceType: "Laptop",
        manufacturer: "Apple",
        model: "MacBook Air 15 M3",
        serialNumber: "C02Z9012IJKL",
        os: "macOS",
        osVersion: "15.3",
        cpu: "Apple M3",
        ram: "24GB",
        storage: "512GB SSD",
        displaySize: "15.3인치",
        condition: "A",
      },
    },
    {
      name: "HP EliteBook 840 G11 #009",
      sub: "NB",
      assignee: 10,
      cost: 1950000,
      hw: {
        deviceType: "Laptop",
        manufacturer: "HP",
        model: "EliteBook 840 G11",
        serialNumber: "HP0009UVWX",
        os: "Windows",
        osVersion: "11 Pro",
        cpu: "Intel Core Ultra 5 125U",
        ram: "16GB DDR5",
        storage: "512GB NVMe",
        displaySize: "14인치",
        condition: "A",
      },
    },
    // ── 데스크탑 추가 3대 ──
    {
      name: "HP ProDesk 400 G9 #010",
      sub: "DT",
      assignee: 5,
      cost: 980000,
      hw: {
        deviceType: "Desktop",
        manufacturer: "HP",
        model: "ProDesk 400 G9 SFF",
        serialNumber: "HP0010ABCD",
        os: "Windows",
        osVersion: "11 Pro",
        cpu: "Intel Core i5-13500",
        ram: "16GB DDR4",
        storage: "512GB SSD",
        condition: "B",
      },
    },
    {
      name: "Apple Mac Mini M4 #011",
      sub: "DT",
      assignee: 9,
      cost: 890000,
      hw: {
        deviceType: "Desktop",
        manufacturer: "Apple",
        model: "Mac Mini M4",
        serialNumber: "APL0011EFGH",
        os: "macOS",
        osVersion: "15.3",
        cpu: "Apple M4",
        ram: "16GB",
        storage: "256GB SSD",
        condition: "A",
      },
    },
    {
      name: "Lenovo ThinkCentre M70q #012",
      sub: "DT",
      assignee: 11,
      cost: 850000,
      hw: {
        deviceType: "Desktop",
        manufacturer: "Lenovo",
        model: "ThinkCentre M70q Gen 5",
        serialNumber: "LNV0012IJKL",
        os: "Windows",
        osVersion: "11 Pro",
        cpu: "Intel Core i5-14500T",
        ram: "16GB DDR5",
        storage: "512GB NVMe",
        condition: "A",
      },
    },
    // ── 서버 3대 ──
    {
      name: "Dell PowerEdge R760 #013",
      sub: "NB", // sub 코드 없으므로 임시 — 아래 create에서 override
      assignee: 4,
      cost: 12500000,
      hw: {
        deviceType: "Server",
        manufacturer: "Dell",
        model: "PowerEdge R760",
        serialNumber: "DSVR0013MNOP",
        os: "Linux",
        osVersion: "Ubuntu 22.04 LTS",
        cpu: "Intel Xeon Gold 5416S x2",
        ram: "128GB DDR5 ECC",
        storage: "4TB NVMe RAID10",
        ipAddress: "192.168.1.10",
        hostname: "svr-app-01",
        location: "IDC A동 3층 랙 A-12",
        condition: "A",
      },
    },
    {
      name: "HP ProLiant DL380 Gen11 #014",
      sub: "NB",
      assignee: 4,
      cost: 15800000,
      hw: {
        deviceType: "Server",
        manufacturer: "HP",
        model: "ProLiant DL380 Gen11",
        serialNumber: "HSVR0014QRST",
        os: "Linux",
        osVersion: "RHEL 9.3",
        cpu: "Intel Xeon Gold 5418Y x2",
        ram: "256GB DDR5 ECC",
        storage: "8TB SAS RAID5",
        ipAddress: "192.168.1.11",
        hostname: "svr-db-01",
        location: "IDC A동 3층 랙 A-13",
        condition: "A",
      },
    },
    {
      name: "Lenovo ThinkSystem SR650 V3 #015",
      sub: "NB",
      assignee: 5,
      cost: 9800000,
      hw: {
        deviceType: "Server",
        manufacturer: "Lenovo",
        model: "ThinkSystem SR650 V3",
        serialNumber: "LSVR0015UVWX",
        os: "Linux",
        osVersion: "Rocky Linux 9.3",
        cpu: "Intel Xeon Silver 4410Y",
        ram: "64GB DDR5 ECC",
        storage: "2TB NVMe RAID1",
        ipAddress: "192.168.1.12",
        hostname: "svr-backup-01",
        location: "IDC A동 3층 랙 B-05",
        condition: "B",
      },
    },
    // ── 네트워크 장비 3대 ──
    {
      name: "Cisco Catalyst 9300 스위치 #016",
      sub: "SW",
      assignee: 4,
      cost: 8500000,
      hw: {
        deviceType: "Network",
        manufacturer: "Cisco",
        model: "Catalyst 9300-48T",
        serialNumber: "CSW0016YZAB",
        ipAddress: "192.168.1.1",
        hostname: "sw-core-01",
        portCount: 48,
        firmwareVersion: "17.12.2",
        location: "IDC A동 3층 랙 A-01",
        condition: "A",
      },
    },
    {
      name: "Fortinet FortiGate 200F 방화벽 #017",
      sub: "FW",
      assignee: 6,
      cost: 12000000,
      hw: {
        deviceType: "Network",
        manufacturer: "Fortinet",
        model: "FortiGate 200F",
        serialNumber: "FGT0017CDEF",
        ipAddress: "192.168.1.254",
        hostname: "fw-main-01",
        firmwareVersion: "7.4.3",
        location: "IDC A동 3층 랙 A-02",
        condition: "A",
      },
    },
    {
      name: "Aruba AP-535 무선AP #018",
      sub: "SW",
      assignee: 5,
      cost: 1200000,
      hw: {
        deviceType: "Network",
        manufacturer: "Aruba (HPE)",
        model: "AP-535",
        serialNumber: "ARB0018GHIJ",
        ipAddress: "192.168.10.100",
        hostname: "wap-3f-01",
        firmwareVersion: "8.11.2",
        location: "본사 3층",
        condition: "A",
      },
    },
    // ── 모바일 3대 ──
    {
      name: "iPhone 15 Pro (업무폰) #019",
      sub: "NB",
      assignee: 0,
      cost: 1550000,
      hw: {
        deviceType: "Mobile",
        manufacturer: "Apple",
        model: "iPhone 15 Pro",
        serialNumber: "APIP0019KLMN",
        os: "iOS",
        osVersion: "18.3",
        imei: "351234567890123",
        phoneNumber: "010-1234-5678",
        storage: "256GB",
        condition: "A",
      },
    },
    {
      name: "Galaxy S24 Ultra (업무폰) #020",
      sub: "NB",
      assignee: 6,
      cost: 1450000,
      hw: {
        deviceType: "Mobile",
        manufacturer: "Samsung",
        model: "Galaxy S24 Ultra",
        serialNumber: "SMGS0020OPQR",
        os: "Android",
        osVersion: "14",
        imei: "357894561230456",
        phoneNumber: "010-9876-5432",
        storage: "256GB",
        condition: "A",
      },
    },
    {
      name: "Galaxy A54 (공용폰) #021",
      sub: "NB",
      assignee: 4,
      cost: 550000,
      hw: {
        deviceType: "Mobile",
        manufacturer: "Samsung",
        model: "Galaxy A54 5G",
        serialNumber: "SMGA0021STUV",
        os: "Android",
        osVersion: "14",
        imei: "359871234560789",
        phoneNumber: "010-5555-1234",
        storage: "128GB",
        condition: "B",
      },
    },
    // ── 모니터 추가 3대 ──
    {
      name: "Samsung ViewFinity S8 32인치 #022",
      sub: "MO",
      assignee: 3,
      cost: 680000,
      hw: {
        deviceType: "Peripheral",
        manufacturer: "Samsung",
        model: "ViewFinity S8 S32B800",
        serialNumber: "MON0022WXYZ",
        resolution: "3840x2160",
        displaySize: "32인치",
        condition: "A",
      },
    },
    {
      name: "Dell P2425HE 모니터 #023",
      sub: "MO",
      assignee: 5,
      cost: 380000,
      hw: {
        deviceType: "Peripheral",
        manufacturer: "Dell",
        model: "P2425HE",
        serialNumber: "MON0023ABCD",
        resolution: "1920x1080",
        displaySize: "24인치",
        condition: "A",
      },
    },
    {
      name: "LG UltraWide 34WN80C #024",
      sub: "MO",
      assignee: 8,
      cost: 620000,
      hw: {
        deviceType: "Peripheral",
        manufacturer: "LG",
        model: "UltraWide 34WN80C",
        serialNumber: "MON0024EFGH",
        resolution: "3440x1440",
        displaySize: "34인치",
        condition: "A",
      },
    },
  ];

  for (const hw of hwAssets) {
    const existing = await prisma.asset.findFirst({ where: { name: hw.name } });
    if (existing) continue;
    await prisma.asset.create({
      data: {
        type: "HARDWARE",
        name: hw.name,
        subCategoryId: subs[hw.sub]?.id ?? undefined,
        status: "IN_USE",
        cost: hw.cost,
        currency: "KRW",
        billingCycle: "ONE_TIME",
        purchaseDate: new Date("2025-01-10"),
        companyId: company.id,
        assigneeId: employees[hw.assignee]?.id,
        orgUnitId: depts[employees[hw.assignee]?.dept ?? "개발팀"]?.id,
        hardwareDetail: { create: hw.hw },
      },
    });
  }
  console.log(`✓ 하드웨어 자산 ${hwAssets.length}개`);

  // ────────────────────────────────────────────
  // 9. 클라우드 자산
  // ────────────────────────────────────────────
  const cloudAssets = [
    {
      name: "Production VPC",
      sub: "VPC",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "VPC", resourceId: "vpc-0abc1234", serviceCategory: "Network" },
      monthlyCost: 0,
      cia: [3, 3, 3],
    },
    {
      name: "Web Server (EC2)",
      sub: "EC2",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "EC2", resourceId: "i-0abc1234def", instanceSpec: "t4g.small", serviceCategory: "IaaS", endpoint: "10.0.1.10" },
      monthlyCost: 25000,
      cia: [2, 3, 3],
    },
    {
      name: "API Server (EC2)",
      sub: "EC2",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "EC2", resourceId: "i-0xyz5678ghi", instanceSpec: "t4g.medium", serviceCategory: "IaaS", endpoint: "10.0.1.11" },
      monthlyCost: 50000,
      cia: [2, 3, 3],
    },
    {
      name: "메인 RDS (PostgreSQL)",
      sub: "RDS",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "RDS", resourceId: "db-main-pgsql", instanceSpec: "db.t4g.medium", storageSize: "100GB", serviceCategory: "Database" },
      monthlyCost: 85000,
      cia: [3, 3, 3],
    },
    {
      name: "Static Assets (S3)",
      sub: "S3",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "S3", resourceId: "arn:aws:s3:::demo-static", storageSize: "50GB", serviceCategory: "Storage" },
      monthlyCost: 1200,
      cia: [1, 2, 2],
    },
    {
      name: "Backup Bucket (S3)",
      sub: "S3",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "S3", resourceId: "arn:aws:s3:::demo-backup", storageSize: "200GB", serviceCategory: "Storage" },
      monthlyCost: 4600,
      cia: [3, 3, 2],
    },
    {
      name: "Web Security Group",
      sub: "SG",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "SecurityGroup", resourceId: "sg-0web1234", serviceCategory: "Security" },
      monthlyCost: 0,
      cia: [3, 3, 3],
    },
    {
      name: "CloudFront CDN",
      sub: "CF",
      cloud: { platform: "AWS", accountId: "123456789012", resourceType: "CloudFront", resourceId: "E1ABCDEF2GH", serviceCategory: "Network" },
      monthlyCost: 15000,
      cia: [1, 2, 3],
    },
    // ── VPC 추가 ──
    {
      name: "Staging VPC",
      sub: "VPC",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "VPC", resourceId: "vpc-0stg5678", serviceCategory: "Network", vpcId: "vpc-0stg5678" },
      monthlyCost: 0,
      cia: [2, 2, 2],
    },
    {
      name: "Dev VPC",
      sub: "VPC",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "VPC", resourceId: "vpc-0dev9012", serviceCategory: "Network", vpcId: "vpc-0dev9012" },
      monthlyCost: 0,
      cia: [1, 1, 1],
    },
    // ── EC2 추가 ──
    {
      name: "Batch Worker (EC2)",
      sub: "EC2",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "EC2", resourceId: "i-0batch3456jkl", instanceSpec: "t4g.large", serviceCategory: "IaaS", endpoint: "10.0.2.20" },
      monthlyCost: 95000,
      cia: [2, 2, 3],
    },
    {
      name: "Monitoring Server (EC2)",
      sub: "EC2",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "EC2", resourceId: "i-0mon7890mno", instanceSpec: "t4g.small", serviceCategory: "IaaS", endpoint: "10.0.1.50" },
      monthlyCost: 25000,
      cia: [2, 3, 3],
    },
    {
      name: "Jenkins CI/CD (EC2)",
      sub: "EC2",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "EC2", resourceId: "i-0jenkins1234", instanceSpec: "t4g.medium", serviceCategory: "IaaS", endpoint: "10.0.1.30" },
      monthlyCost: 50000,
      cia: [2, 3, 2],
    },
    // ── RDS 추가 ──
    {
      name: "Replica RDS (PostgreSQL)",
      sub: "RDS",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "RDS", resourceId: "db-replica-pgsql", instanceSpec: "db.t4g.medium", storageSize: "100GB", serviceCategory: "Database" },
      monthlyCost: 75000,
      cia: [3, 2, 2],
    },
    {
      name: "Analytics RDS (MySQL)",
      sub: "RDS",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "RDS", resourceId: "db-analytics-mysql", instanceSpec: "db.r6g.large", storageSize: "500GB", serviceCategory: "Database" },
      monthlyCost: 180000,
      cia: [2, 3, 2],
    },
    // ── S3 추가 ──
    {
      name: "Log Archive (S3)",
      sub: "S3",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "S3", resourceId: "arn:aws:s3:::demo-logs", storageSize: "1TB", serviceCategory: "Storage" },
      monthlyCost: 23000,
      cia: [2, 3, 1],
    },
    // ── Security Group 추가 ──
    {
      name: "DB Security Group",
      sub: "SG",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "SecurityGroup", resourceId: "sg-0db5678", serviceCategory: "Security" },
      monthlyCost: 0,
      cia: [3, 3, 3],
    },
    {
      name: "Internal Security Group",
      sub: "SG",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "SecurityGroup", resourceId: "sg-0int9012", serviceCategory: "Security" },
      monthlyCost: 0,
      cia: [3, 3, 2],
    },
    // ── Lambda 추가 ──
    {
      name: "이미지 리사이즈 Lambda",
      sub: "LAMBDA",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "Lambda", resourceId: "arn:aws:lambda:ap-northeast-2:123456789012:function:img-resize", serviceCategory: "PaaS" },
      monthlyCost: 3500,
      cia: [1, 2, 2],
    },
    {
      name: "Slack 알림 Lambda",
      sub: "LAMBDA",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "Lambda", resourceId: "arn:aws:lambda:ap-northeast-2:123456789012:function:slack-notify", serviceCategory: "PaaS" },
      monthlyCost: 500,
      cia: [1, 1, 2],
    },
    {
      name: "데이터 정제 Lambda",
      sub: "LAMBDA",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "Lambda", resourceId: "arn:aws:lambda:ap-northeast-2:123456789012:function:data-cleanse", serviceCategory: "PaaS" },
      monthlyCost: 2000,
      cia: [2, 3, 2],
    },
    // ── Route53 추가 ──
    {
      name: "demo.co.kr Hosted Zone",
      sub: "R53",
      cloud: { platform: "AWS", accountId: "123456789012", resourceType: "Route53", resourceId: "Z0123456789ABCDEF", serviceCategory: "Network" },
      monthlyCost: 600,
      cia: [1, 3, 3],
    },
    {
      name: "내부 DNS (Private Zone)",
      sub: "R53",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "Route53", resourceId: "Z9876543210GHIJKL", serviceCategory: "Network" },
      monthlyCost: 600,
      cia: [2, 3, 3],
    },
    {
      name: "Health Check (Route53)",
      sub: "R53",
      cloud: { platform: "AWS", accountId: "123456789012", resourceType: "Route53", resourceId: "hc-0abc1234def", serviceCategory: "Network" },
      monthlyCost: 750,
      cia: [1, 2, 3],
    },
    // ── CloudFront 추가 ──
    {
      name: "API Gateway CloudFront",
      sub: "CF",
      cloud: { platform: "AWS", accountId: "123456789012", resourceType: "CloudFront", resourceId: "E2XYZABC3IJ", serviceCategory: "Network" },
      monthlyCost: 8000,
      cia: [2, 3, 3],
    },
    {
      name: "Media CloudFront",
      sub: "CF",
      cloud: { platform: "AWS", accountId: "123456789012", resourceType: "CloudFront", resourceId: "E3KLMNOP4QR", serviceCategory: "Network" },
      monthlyCost: 22000,
      cia: [1, 2, 3],
    },
    // ── SaaS 서비스 (클라우드 타입) ──
    {
      name: "Datadog 모니터링",
      sub: "EC2",
      cloud: { platform: "Datadog", serviceCategory: "SaaS", seatCount: 5, adminEmail: "hn.jung@demo.co.kr", contractStartDate: new Date("2025-01-01"), contractTermMonths: 12 },
      monthlyCost: 350000,
      cia: [2, 2, 3],
    },
    {
      name: "AWS WAF",
      sub: "SG",
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", resourceType: "WAF", resourceId: "waf-0main1234", serviceCategory: "Security" },
      monthlyCost: 15000,
      cia: [3, 3, 3],
    },
  ];

  for (const ca of cloudAssets) {
    const existing = await prisma.asset.findFirst({ where: { name: ca.name } });
    if (existing) continue;
    await prisma.asset.create({
      data: {
        type: "CLOUD",
        name: ca.name,
        subCategoryId: subs[ca.sub].id,
        status: "IN_USE",
        monthlyCost: ca.monthlyCost,
        cost: ca.monthlyCost,
        currency: "KRW",
        billingCycle: "MONTHLY",
        companyId: company.id,
        orgUnitId: depts["인프라팀"].id,
        ciaC: ca.cia[0],
        ciaI: ca.cia[1],
        ciaA: ca.cia[2],
        cloudDetail: { create: ca.cloud },
      },
    });
  }
  console.log(`✓ 클라우드 자산 ${cloudAssets.length}개`);

  // ────────────────────────────────────────────
  // 10. 도메인·SSL 자산
  // ────────────────────────────────────────────
  const domainAssets = [
    {
      name: "demo.co.kr",
      domain: { domainName: "demo.co.kr", registrar: "가비아", sslType: "WILDCARD", issuer: "Let's Encrypt", autoRenew: true },
      cost: 22000,
      expiryDate: new Date("2027-03-15"),
    },
    {
      name: "api.demo.co.kr (SSL)",
      domain: { domainName: "api.demo.co.kr", registrar: "Route53", sslType: "DV", issuer: "AWS ACM", autoRenew: true },
      cost: 0,
      expiryDate: new Date("2026-09-01"),
    },
    {
      name: "admin.demo.co.kr",
      domain: { domainName: "admin.demo.co.kr", registrar: "가비아", sslType: "OV", issuer: "DigiCert", autoRenew: false },
      cost: 150000,
      expiryDate: new Date("2026-06-30"),
    },
  ];

  for (const da of domainAssets) {
    const existing = await prisma.asset.findFirst({ where: { name: da.name } });
    if (existing) continue;
    await prisma.asset.create({
      data: {
        type: "DOMAIN_SSL",
        name: da.name,
        status: "IN_USE",
        cost: da.cost,
        currency: "KRW",
        billingCycle: "ANNUAL",
        purchaseDate: new Date("2024-03-15"),
        expiryDate: da.expiryDate,
        companyId: company.id,
        orgUnitId: depts["인프라팀"].id,
        domainDetail: { create: da.domain },
      },
    });
  }
  console.log(`✓ 도메인·SSL 자산 ${domainAssets.length}개`);

  // ────────────────────────────────────────────
  // 11. 계약 자산
  // ────────────────────────────────────────────
  const contractAssets = [
    {
      name: "IDC 유지보수 계약 (2025)",
      vendor: "KT IDC",
      contract: { contractNumber: "CT-2025-001", counterparty: "KT IDC", contractType: "유지보수", autoRenew: true },
      cost: 5000000,
      purchaseDate: new Date("2025-01-01"),
      expiryDate: new Date("2025-12-31"),
    },
    {
      name: "보안관제 서비스 계약",
      vendor: "SK쉴더스",
      contract: { contractNumber: "CT-2025-002", counterparty: "SK쉴더스", contractType: "SLA", autoRenew: false },
      cost: 3600000,
      purchaseDate: new Date("2025-03-01"),
      expiryDate: new Date("2026-02-28"),
    },
    {
      name: "SI 외주 개발 계약",
      vendor: "데모시스템즈",
      contract: { contractNumber: "CT-2025-003", counterparty: "데모시스템즈", contractType: "외주", autoRenew: false },
      cost: 50000000,
      purchaseDate: new Date("2025-06-01"),
      expiryDate: new Date("2025-11-30"),
    },
    {
      name: "네트워크 장비 유지보수 계약",
      vendor: "시스코코리아",
      contract: { contractNumber: "CT-2025-004", counterparty: "시스코코리아", contractType: "유지보수", autoRenew: true },
      cost: 8400000,
      purchaseDate: new Date("2025-01-01"),
      expiryDate: new Date("2025-12-31"),
    },
    {
      name: "모의해킹 컨설팅 계약",
      vendor: "스틸리언",
      contract: { contractNumber: "CT-2025-005", counterparty: "스틸리언", contractType: "기타", autoRenew: false },
      cost: 25000000,
      purchaseDate: new Date("2025-09-01"),
      expiryDate: new Date("2025-10-31"),
    },
    {
      name: "클라우드 MSP 운영 계약",
      vendor: "메가존클라우드",
      contract: { contractNumber: "CT-2025-006", counterparty: "메가존클라우드", contractType: "SLA", autoRenew: true },
      cost: 12000000,
      purchaseDate: new Date("2025-03-01"),
      expiryDate: new Date("2026-02-28"),
    },
  ];

  for (const ct of contractAssets) {
    const existing = await prisma.asset.findFirst({ where: { name: ct.name } });
    if (existing) continue;
    await prisma.asset.create({
      data: {
        type: "CONTRACT",
        name: ct.name,
        vendor: ct.vendor,
        status: "IN_USE",
        cost: ct.cost,
        currency: "KRW",
        billingCycle: "ANNUAL",
        purchaseDate: ct.purchaseDate,
        expiryDate: ct.expiryDate,
        companyId: company.id,
        orgUnitId: depts["경영지원팀"].id,
        contractDetail: { create: ct.contract },
      },
    });
  }
  console.log(`✓ 계약 자산 ${contractAssets.length}개`);

  // ────────────────────────────────────────────
  // 12. 외부 엔티티 (자산 지도용)
  // ────────────────────────────────────────────
  const externalEntities = [
    { name: "고객 (웹 사용자)", type: "OTHER", description: "서비스 이용 고객" },
    { name: "데이터 수탁사 A", type: "TRUSTEE", description: "고객 데이터 처리 위탁" },
    { name: "행정안전부", type: "GOVERNMENT", description: "개인정보 보호 감독 기관" },
  ];

  for (const ee of externalEntities) {
    const existing = await prisma.externalEntity.findFirst({ where: { name: ee.name } });
    if (!existing) {
      await prisma.externalEntity.create({ data: ee });
    }
  }
  console.log(`✓ 외부 엔티티 ${externalEntities.length}개`);

  // ────────────────────────────────────────────
  // 12-1. 자산 지도용 AssetLink (자산 간 연결)
  // ────────────────────────────────────────────
  // 자산 이름으로 ID를 조회하는 헬퍼
  const assetByName = async (name: string) => {
    const a = await prisma.asset.findFirst({ where: { name } });
    return a?.id ?? null;
  };
  const extByName = async (name: string) => {
    const e = await prisma.externalEntity.findFirst({ where: { name } });
    return e?.id ?? null;
  };

  // 자산 ID 조회
  const [
    idVPC, idWebEC2, idApiEC2, idRDS, idS3Static, idS3Backup, idSGWeb, idCF,
    idBatchEC2, idMonEC2, idJenkinsEC2, idReplicaRDS, idAnalyticsRDS, idS3Logs,
    idSGDB, idSGInt, idLambdaResize, idLambdaSlack, idLambdaCleanse,
    idR53Main, idR53Private, idR53Health, idCF2, idCF3, idDatadog, idWAF,
  ] = await Promise.all([
    assetByName("Production VPC"),
    assetByName("Web Server (EC2)"),
    assetByName("API Server (EC2)"),
    assetByName("메인 RDS (PostgreSQL)"),
    assetByName("Static Assets (S3)"),
    assetByName("Backup Bucket (S3)"),
    assetByName("Web Security Group"),
    assetByName("CloudFront CDN"),
    assetByName("Batch Worker (EC2)"),
    assetByName("Monitoring Server (EC2)"),
    assetByName("Jenkins CI/CD (EC2)"),
    assetByName("Replica RDS (PostgreSQL)"),
    assetByName("Analytics RDS (MySQL)"),
    assetByName("Log Archive (S3)"),
    assetByName("DB Security Group"),
    assetByName("Internal Security Group"),
    assetByName("이미지 리사이즈 Lambda"),
    assetByName("Slack 알림 Lambda"),
    assetByName("데이터 정제 Lambda"),
    assetByName("demo.co.kr Hosted Zone"),
    assetByName("내부 DNS (Private Zone)"),
    assetByName("Health Check (Route53)"),
    assetByName("API Gateway CloudFront"),
    assetByName("Media CloudFront"),
    assetByName("Datadog 모니터링"),
    assetByName("AWS WAF"),
  ]);

  const [extCustomer, extTrustee, extGov] = await Promise.all([
    extByName("고객 (웹 사용자)"),
    extByName("데이터 수탁사 A"),
    extByName("행정안전부"),
  ]);

  // 기존 링크가 없을 때만 추가
  const existingLinks = await prisma.assetLink.count();
  if (existingLinks === 0) {
    const linkData: {
      sourceAssetId?: number | null;
      targetAssetId?: number | null;
      sourceExternalId?: number | null;
      targetExternalId?: number | null;
      linkType: string;
      direction?: string;
      label?: string;
      dataTypes?: string;
      piiItems?: string;
      protocol?: string;
      sourceHandle?: string;
      targetHandle?: string;
    }[] = [
      // ── NETWORK 연결 (인프라 토폴로지) ──
      // 고객 → CloudFront → Web Server
      { sourceExternalId: extCustomer, targetAssetId: idCF, linkType: "NETWORK", label: "HTTPS", protocol: "HTTPS", sourceHandle: "right", targetHandle: "left" },
      { sourceAssetId: idCF, targetAssetId: idWebEC2, linkType: "NETWORK", label: "HTTP", protocol: "HTTP/80", sourceHandle: "right", targetHandle: "left" },
      // Web Server → API Server
      { sourceAssetId: idWebEC2, targetAssetId: idApiEC2, linkType: "NETWORK", label: "REST API", protocol: "HTTP/8080", sourceHandle: "right", targetHandle: "left" },
      // API Server → RDS
      { sourceAssetId: idApiEC2, targetAssetId: idRDS, linkType: "NETWORK", label: "PostgreSQL", protocol: "TCP/5432", sourceHandle: "right", targetHandle: "left" },
      // RDS → Replica
      { sourceAssetId: idRDS, targetAssetId: idReplicaRDS, linkType: "NETWORK", label: "Replication", protocol: "TCP/5432", direction: "UNI", sourceHandle: "bottom", targetHandle: "top" },
      // API Server → S3
      { sourceAssetId: idApiEC2, targetAssetId: idS3Static, linkType: "NETWORK", label: "S3 API", protocol: "HTTPS", sourceHandle: "bottom", targetHandle: "top" },
      // VPC 내 EC2들
      { sourceAssetId: idVPC, targetAssetId: idWebEC2, linkType: "NETWORK", label: "VPC 내부", sourceHandle: "right", targetHandle: "left" },
      { sourceAssetId: idVPC, targetAssetId: idApiEC2, linkType: "NETWORK", label: "VPC 내부", sourceHandle: "right", targetHandle: "left" },
      { sourceAssetId: idVPC, targetAssetId: idBatchEC2, linkType: "NETWORK", label: "VPC 내부", sourceHandle: "bottom", targetHandle: "top" },
      // Security Group 연결
      { sourceAssetId: idSGWeb, targetAssetId: idWebEC2, linkType: "AUTH", label: "인바운드 규칙", sourceHandle: "right", targetHandle: "left" },
      { sourceAssetId: idSGDB, targetAssetId: idRDS, linkType: "AUTH", label: "인바운드 규칙", sourceHandle: "right", targetHandle: "left" },
      { sourceAssetId: idWAF, targetAssetId: idCF, linkType: "AUTH", label: "WAF 보호", sourceHandle: "right", targetHandle: "left" },
      // Route53 → CloudFront
      { sourceAssetId: idR53Main, targetAssetId: idCF, linkType: "NETWORK", label: "DNS A Record", sourceHandle: "right", targetHandle: "top" },
      // Jenkins → EC2 배포
      { sourceAssetId: idJenkinsEC2, targetAssetId: idWebEC2, linkType: "DEPENDENCY", label: "CI/CD 배포", sourceHandle: "right", targetHandle: "bottom" },
      { sourceAssetId: idJenkinsEC2, targetAssetId: idApiEC2, linkType: "DEPENDENCY", label: "CI/CD 배포", sourceHandle: "right", targetHandle: "bottom" },
      // Monitoring
      { sourceAssetId: idMonEC2, targetAssetId: idWebEC2, linkType: "DEPENDENCY", label: "모니터링", sourceHandle: "right", targetHandle: "top" },
      { sourceAssetId: idMonEC2, targetAssetId: idApiEC2, linkType: "DEPENDENCY", label: "모니터링", sourceHandle: "right", targetHandle: "top" },
      { sourceAssetId: idMonEC2, targetAssetId: idRDS, linkType: "DEPENDENCY", label: "모니터링", sourceHandle: "right", targetHandle: "top" },
      // Batch → RDS, S3
      { sourceAssetId: idBatchEC2, targetAssetId: idAnalyticsRDS, linkType: "NETWORK", label: "ETL", protocol: "TCP/3306", sourceHandle: "right", targetHandle: "left" },
      { sourceAssetId: idBatchEC2, targetAssetId: idS3Logs, linkType: "NETWORK", label: "로그 적재", protocol: "HTTPS", sourceHandle: "bottom", targetHandle: "top" },
      // Lambda 연결
      { sourceAssetId: idLambdaResize, targetAssetId: idS3Static, linkType: "DEPENDENCY", label: "이미지 처리", sourceHandle: "right", targetHandle: "left" },
      { sourceAssetId: idLambdaSlack, targetAssetId: idMonEC2, linkType: "DEPENDENCY", label: "알림 발송", sourceHandle: "left", targetHandle: "right" },
      { sourceAssetId: idLambdaCleanse, targetAssetId: idAnalyticsRDS, linkType: "DEPENDENCY", label: "데이터 정제", sourceHandle: "right", targetHandle: "left" },
      // RDS → S3 백업
      { sourceAssetId: idRDS, targetAssetId: idS3Backup, linkType: "DATA_FLOW", label: "DB 백업", sourceHandle: "bottom", targetHandle: "top" },

      // ── DATA_FLOW (PII 포함) ──
      // 고객 → Web → API → RDS (개인정보 흐름)
      { sourceExternalId: extCustomer, targetAssetId: idWebEC2, linkType: "DATA_FLOW", label: "회원가입/로그인", dataTypes: '["PII"]', piiItems: '["이름","이메일","전화번호"]', sourceHandle: "right", targetHandle: "left" },
      { sourceAssetId: idWebEC2, targetAssetId: idApiEC2, linkType: "DATA_FLOW", label: "API 요청 전달", dataTypes: '["PII"]', piiItems: '["이름","이메일"]', sourceHandle: "right", targetHandle: "left" },
      { sourceAssetId: idApiEC2, targetAssetId: idRDS, linkType: "DATA_FLOW", label: "개인정보 저장", dataTypes: '["PII"]', piiItems: '["이름","이메일","전화번호","주소"]', sourceHandle: "right", targetHandle: "left" },
      // RDS → 수탁사
      { sourceAssetId: idRDS, targetExternalId: extTrustee, linkType: "DATA_FLOW", label: "고객 데이터 위탁처리", dataTypes: '["PII"]', piiItems: '["이름","이메일"]', legalBasis: "개인정보 처리 위탁 계약", retentionPeriod: "위탁 기간 종료 시 파기", destructionMethod: "완전삭제", sourceHandle: "right", targetHandle: "left" },
      // API → 행정안전부 (개인정보 제공)
      { sourceAssetId: idApiEC2, targetExternalId: extGov, linkType: "DATA_FLOW", label: "법적 제출", dataTypes: '["PII"]', piiItems: '["이름","주민등록번호"]', legalBasis: "법률에 의한 의무", sourceHandle: "bottom", targetHandle: "top" },
      // Datadog 로그 흐름
      { sourceAssetId: idApiEC2, targetAssetId: idDatadog, linkType: "DATA_FLOW", label: "로그 수집", dataTypes: '["LOG"]', sourceHandle: "top", targetHandle: "left" },
    ];

    // null ID 필터링 후 생성
    let linkCount = 0;
    for (const link of linkData) {
      const hasSource = link.sourceAssetId || link.sourceExternalId;
      const hasTarget = link.targetAssetId || link.targetExternalId;
      if (!hasSource || !hasTarget) continue;

      await prisma.assetLink.create({
        data: {
          sourceAssetId: link.sourceAssetId ?? undefined,
          targetAssetId: link.targetAssetId ?? undefined,
          sourceExternalId: link.sourceExternalId ?? undefined,
          targetExternalId: link.targetExternalId ?? undefined,
          linkType: link.linkType,
          direction: link.direction ?? "UNI",
          label: link.label,
          dataTypes: link.dataTypes,
          piiItems: link.piiItems,
          protocol: link.protocol,
          legalBasis: link.legalBasis,
          retentionPeriod: link.retentionPeriod,
          destructionMethod: link.destructionMethod,
          sourceHandle: link.sourceHandle,
          targetHandle: link.targetHandle,
        },
      });
      linkCount++;
    }
    console.log(`✓ 자산 링크 ${linkCount}건 (NETWORK/DATA_FLOW/DEPENDENCY/AUTH)`);
  } else {
    console.log(`✓ 자산 링크 — 이미 ${existingLinks}건 존재, 건너뜀`);
  }

  // ────────────────────────────────────────────
  // 13. 감사 로그 (샘플)
  // ────────────────────────────────────────────
  const auditActions = [
    { entityType: "LICENSE", entityId: licenses[0]?.id ?? 1, action: "CREATE", actor: "admin", details: "Microsoft 365 Business 등록" },
    { entityType: "LICENSE", entityId: licenses[0]?.id ?? 1, action: "ASSIGN", actor: "admin", details: "김철수에게 할당" },
    { entityType: "EMPLOYEE", entityId: employees[0]?.id ?? 1, action: "CREATE", actor: "admin", details: "조직원 김철수 등록" },
    { entityType: "ASSET", entityId: 1, action: "CREATE", actor: "admin", details: "MacBook Pro 14 등록" },
    { entityType: "LICENSE", entityId: licenses[2]?.id ?? 3, action: "CREATE", actor: "admin", details: "JetBrains 라이선스 등록" },
  ];

  for (const log of auditActions) {
    await prisma.auditLog.create({
      data: {
        ...log,
        actorType: "USER",
        actorId: admin.id,
      },
    });
  }
  console.log(`✓ 감사 로그 ${auditActions.length}건`);

  // ────────────────────────────────────────────
  // 14. 직책별 CIA 등급 매핑
  // ────────────────────────────────────────────
  const ciaMappings = [
    { title: "대표이사", ciaC: 3, ciaI: 3, ciaA: 3 },
    { title: "팀장", ciaC: 2, ciaI: 3, ciaA: 2 },
    { title: "선임", ciaC: 2, ciaI: 2, ciaA: 2 },
    { title: "대리", ciaC: 2, ciaI: 2, ciaA: 2 },
    { title: "사원", ciaC: 1, ciaI: 2, ciaA: 1 },
  ];

  for (const m of ciaMappings) {
    await prisma.titleCiaMapping.upsert({
      where: { title: m.title },
      update: {},
      create: m,
    });
  }
  console.log(`✓ CIA 등급 매핑 ${ciaMappings.length}건`);

  // ────────────────────────────────────────────
  // 15. 정보보호 조직도
  // ────────────────────────────────────────────
  const ciso = await prisma.securityOrgChart.create({
    data: {
      title: "정보보호 최고책임자 (CISO)",
      employeeId: employees[6]?.id, // 윤도현 (보안팀장)
      sortOrder: 1,
    },
  });
  await prisma.securityOrgChart.create({
    data: {
      title: "개인정보보호 담당자",
      employeeId: employees[7]?.id, // 조은비
      parentId: ciso.id,
      sortOrder: 1,
    },
  });
  await prisma.securityOrgChart.create({
    data: {
      title: "보안 인프라 담당자",
      employeeId: employees[5]?.id, // 한서윤
      parentId: ciso.id,
      sortOrder: 2,
    },
  });
  console.log("✓ 정보보호 조직도 3건");

  // ────────────────────────────────────────────
  // 16. 하드웨어 내용연수 설정
  // ────────────────────────────────────────────
  const lifecycleSettings = [
    { deviceType: "Laptop", usefulLifeYears: 4 },
    { deviceType: "Desktop", usefulLifeYears: 5 },
    { deviceType: "Server", usefulLifeYears: 5 },
    { deviceType: "Network", usefulLifeYears: 7 },
    { deviceType: "Mobile", usefulLifeYears: 3 },
    { deviceType: "Peripheral", usefulLifeYears: 5 },
  ];

  for (const ls of lifecycleSettings) {
    await prisma.hardwareLifecycleSetting.upsert({
      where: { deviceType: ls.deviceType },
      update: {},
      create: ls,
    });
  }
  console.log(`✓ 내용연수 설정 ${lifecycleSettings.length}건`);

  // ────────────────────────────────────────────
  // 17. 환율 이력 (최근 5일)
  // ────────────────────────────────────────────
  const today = new Date();
  for (let d = 0; d < 5; d++) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - d);
    const dateStr = dt.toISOString().slice(0, 10);

    const rates = [
      { currency: "USD", rateToKRW: 1345 + Math.random() * 20 },
      { currency: "EUR", rateToKRW: 1460 + Math.random() * 15 },
      { currency: "JPY", rateToKRW: 8.9 + Math.random() * 0.3 },
    ];

    for (const r of rates) {
      await prisma.exchangeRate.upsert({
        where: { date_currency: { date: dateStr, currency: r.currency } },
        update: {},
        create: {
          date: dateStr,
          currency: r.currency,
          rateToKRW: r.rateToKRW,
          source: "manual",
        },
      });
    }
  }
  console.log("✓ 환율 이력 15건 (5일 × 3통화)");

  // ────────────────────────────────────────────
  console.log("\n🎉 더미 데이터 시드 완료!");
  console.log("   - 로그인: admin / admin1234 (관리자)");
  console.log("   - 로그인: viewer / user1234 (일반)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
