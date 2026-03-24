import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (process.env.NODE_ENV === "production") {
  console.error("❌  더미 데이터는 프로덕션에서 실행할 수 없습니다.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 더미 데이터 삽입 시작...\n");

  // ── 1. 회사 & 조직 ──
  const company = await prisma.orgCompany.upsert({
    where: { name: "주식회사 테스트" },
    update: {},
    create: { name: "주식회사 테스트" },
  });

  const depts = ["경영지원팀", "개발팀", "인프라팀", "보안팀", "마케팅팀"];
  const orgUnits: Record<string, { id: number }> = {};
  for (const name of depts) {
    orgUnits[name] = await prisma.orgUnit.upsert({
      where: { name_companyId: { name, companyId: company.id } },
      update: {},
      create: { name, companyId: company.id },
    });
  }
  console.log(`✓ 회사 + 조직 ${depts.length}개`);

  // ── 2. 구성원 ──
  const employeeData = [
    { name: "김민수", dept: "개발팀", email: "minsu@test.com", title: "팀장" },
    { name: "이지은", dept: "개발팀", email: "jieun@test.com", title: "선임" },
    { name: "박서준", dept: "인프라팀", email: "seojun@test.com", title: "팀장" },
    { name: "최유리", dept: "인프라팀", email: "yuri@test.com", title: "주임" },
    { name: "정하늘", dept: "보안팀", email: "haneul@test.com", title: "팀장" },
    { name: "한소희", dept: "경영지원팀", email: "sohee@test.com", title: "대리" },
    { name: "오준혁", dept: "마케팅팀", email: "junhyuk@test.com", title: "팀장" },
    { name: "송다영", dept: "개발팀", email: "dayoung@test.com", title: "사원" },
    { name: "윤재호", dept: "인프라팀", email: "jaeho@test.com", title: "사원" },
    { name: "강예진", dept: "마케팅팀", email: "yejin@test.com", title: "주임" },
  ];

  const employees: Record<string, { id: number }> = {};
  for (const e of employeeData) {
    employees[e.name] = await prisma.employee.upsert({
      where: { email: e.email },
      update: {},
      create: {
        name: e.name,
        department: e.dept,
        email: e.email,
        title: e.title,
        companyId: company.id,
        orgUnitId: orgUnits[e.dept].id,
      },
    });
  }
  console.log(`✓ 구성원 ${employeeData.length}명`);

  // ── 3. 라이선스 ──
  const licenseData = [
    { name: "Microsoft 365 E3", type: "NO_KEY" as const, qty: 50, price: 36000, cycle: "MONTHLY" as const, currency: "USD" as const, unitPrice: 36, vendor: "Microsoft", purchaseDate: "2025-01-01", expiryDate: "2026-12-31" },
    { name: "JetBrains All Products", type: "KEY_BASED" as const, qty: 10, price: 649, cycle: "YEARLY" as const, currency: "USD" as const, unitPrice: 649, vendor: "JetBrains", purchaseDate: "2025-03-15", expiryDate: "2026-03-14" },
    { name: "Adobe Creative Cloud", type: "NO_KEY" as const, qty: 5, price: 86900, cycle: "MONTHLY" as const, currency: "KRW" as const, unitPrice: 86900, vendor: "Adobe", purchaseDate: "2025-06-01", expiryDate: "2026-05-31" },
    { name: "Slack Business+", type: "NO_KEY" as const, qty: 50, price: 12.5, cycle: "MONTHLY" as const, currency: "USD" as const, unitPrice: 12.5, vendor: "Salesforce", purchaseDate: "2025-02-01", expiryDate: "2026-01-31" },
    { name: "GitHub Enterprise", type: "NO_KEY" as const, qty: 15, price: 21, cycle: "MONTHLY" as const, currency: "USD" as const, unitPrice: 21, vendor: "GitHub", purchaseDate: "2025-04-01", expiryDate: "2026-03-31" },
    { name: "Figma Organization", type: "NO_KEY" as const, qty: 8, price: 75, cycle: "MONTHLY" as const, currency: "USD" as const, unitPrice: 75, vendor: "Figma", purchaseDate: "2025-05-01", expiryDate: "2026-04-30" },
    { name: "Windows 11 Pro", type: "VOLUME" as const, qty: 30, price: 260000, cycle: "YEARLY" as const, currency: "KRW" as const, unitPrice: 260000, vendor: "Microsoft", purchaseDate: "2024-06-01", expiryDate: null },
    { name: "Notion Team", type: "NO_KEY" as const, qty: 50, price: 10, cycle: "MONTHLY" as const, currency: "USD" as const, unitPrice: 10, vendor: "Notion Labs", purchaseDate: "2025-01-15", expiryDate: "2026-01-14" },
  ];

  for (const l of licenseData) {
    await prisma.license.upsert({
      where: { name: l.name },
      update: {},
      create: {
        name: l.name,
        licenseType: l.type,
        totalQuantity: l.qty,
        price: l.price,
        purchaseDate: new Date(l.purchaseDate),
        expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
        paymentCycle: l.cycle,
        currency: l.currency,
        unitPrice: l.unitPrice,
        vendor: l.vendor,
        quantity: l.qty,
        orgUnitId: orgUnits["개발팀"].id,
      },
    });
  }
  console.log(`✓ 라이선스 ${licenseData.length}개`);

  // ── 4. 하드웨어 자산 ──
  const hardwareData = [
    { name: "MacBook Pro 16 M4 Pro #1", assignee: "김민수", dept: "개발팀", device: "Laptop", mfr: "Apple", model: "MacBook Pro 16\" M4 Pro", serial: "C02ZM1234567", cpu: "Apple M4 Pro", ram: "36GB", storage: "512GB SSD", os: "macOS", osVer: "15.3", cost: 3990000, ip: "192.168.1.101" },
    { name: "MacBook Pro 14 M4 #2", assignee: "이지은", dept: "개발팀", device: "Laptop", mfr: "Apple", model: "MacBook Pro 14\" M4", serial: "C02ZM2345678", cpu: "Apple M4", ram: "24GB", storage: "512GB SSD", os: "macOS", osVer: "15.3", cost: 2590000, ip: "192.168.1.102" },
    { name: "Dell Latitude 5540 #3", assignee: "한소희", dept: "경영지원팀", device: "Laptop", mfr: "Dell", model: "Latitude 5540", serial: "DL5540-001", cpu: "Intel i7-1365U", ram: "16GB DDR5", storage: "512GB SSD", os: "Windows", osVer: "11 Pro", cost: 1890000, ip: "192.168.1.103" },
    { name: "Dell OptiPlex 7010 #4", assignee: "강예진", dept: "마케팅팀", device: "Desktop", mfr: "Dell", model: "OptiPlex 7010 MFF", serial: "DO7010-001", cpu: "Intel i5-13500T", ram: "16GB DDR5", storage: "256GB SSD", os: "Windows", osVer: "11 Pro", cost: 1290000, ip: "192.168.1.104" },
    { name: "Dell PowerEdge R760xs", assignee: "박서준", dept: "인프라팀", device: "Server", mfr: "Dell", model: "PowerEdge R760xs", serial: "PE760-001", cpu: "Intel Xeon Gold 5416S x2", ram: "128GB DDR5 ECC", storage: "4TB NVMe RAID10", os: "Linux", osVer: "Ubuntu 22.04 LTS", cost: 15800000, ip: "10.0.1.10" },
    { name: "Cisco Catalyst 9300-24T", assignee: "박서준", dept: "인프라팀", device: "Network", mfr: "Cisco", model: "Catalyst 9300-24T", serial: "CAT9300-001", cpu: "-", ram: "-", storage: "-", os: "-", osVer: "-", cost: 8500000, ip: "10.0.0.1" },
    { name: "LG 27UP850N 모니터 #1", assignee: "김민수", dept: "개발팀", device: "Peripheral", mfr: "LG", model: "27UP850N-W", serial: "LG27UP-001", cpu: null, ram: null, storage: null, os: null, osVer: null, cost: 550000, ip: null },
    { name: "iPhone 15 Pro #1", assignee: "오준혁", dept: "마케팅팀", device: "Mobile", mfr: "Apple", model: "iPhone 15 Pro 256GB", serial: "F2LZM1234567", cpu: "A17 Pro", ram: "8GB", storage: "256GB", os: "iOS", osVer: "18.3", cost: 1550000, ip: null },
  ];

  for (const h of hardwareData) {
    const existing = await prisma.asset.findFirst({ where: { name: h.name, type: "HARDWARE" } });
    if (existing) continue;

    await prisma.asset.create({
      data: {
        type: "HARDWARE",
        name: h.name,
        status: "IN_USE",
        vendor: h.mfr,
        cost: h.cost,
        currency: "KRW",
        billingCycle: "ONE_TIME",
        purchaseDate: new Date("2025-01-15"),
        companyId: company.id,
        orgUnitId: orgUnits[h.dept].id,
        assigneeId: employees[h.assignee].id,
        hardwareDetail: {
          create: {
            deviceType: h.device,
            manufacturer: h.mfr,
            model: h.model,
            serialNumber: h.serial,
            cpu: h.cpu,
            ram: h.ram,
            storage: h.storage,
            os: h.os,
            osVersion: h.osVer,
            ipAddress: h.ip,
            hostname: h.name.replace(/[# ]/g, "-").toLowerCase(),
            usefulLifeYears: h.device === "Server" ? 7 : h.device === "Network" ? 10 : 5,
          },
        },
      },
    });
  }
  console.log(`✓ 하드웨어 자산 ${hardwareData.length}개`);

  // ── 5. 클라우드 자산 ──
  const cloudData = [
    { name: "AWS EC2 - 웹 서버 (prod)", platform: "AWS", region: "ap-northeast-2", category: "IaaS", resource: "EC2", spec: "t4g.small", cost: 45000, monthly: 45000, assignee: "박서준", dept: "인프라팀" },
    { name: "AWS RDS - PostgreSQL (prod)", platform: "AWS", region: "ap-northeast-2", category: "Database", resource: "RDS", spec: "db.t4g.medium", cost: 120000, monthly: 120000, assignee: "박서준", dept: "인프라팀" },
    { name: "AWS S3 - 정적 파일 저장소", platform: "AWS", region: "ap-northeast-2", category: "Storage", resource: "S3", spec: null, cost: 15000, monthly: 15000, assignee: "윤재호", dept: "인프라팀" },
    { name: "AWS CloudFront - CDN", platform: "AWS", region: "global", category: "Network", resource: "CloudFront", spec: null, cost: 25000, monthly: 25000, assignee: "윤재호", dept: "인프라팀" },
    { name: "AWS Route53 - DNS", platform: "AWS", region: "global", category: "Network", resource: "Route53", spec: null, cost: 5000, monthly: 5000, assignee: "박서준", dept: "인프라팀" },
    { name: "Google Workspace Business", platform: "GCP", region: null, category: "SaaS", resource: "Web/App", spec: null, cost: 13.6 * 50, monthly: 13.6 * 50, assignee: "한소희", dept: "경영지원팀" },
    { name: "AWS VPC - 프로덕션", platform: "AWS", region: "ap-northeast-2", category: "Network", resource: "VPC", spec: null, cost: 0, monthly: 0, assignee: "박서준", dept: "인프라팀" },
    { name: "Datadog Infrastructure", platform: "Datadog", region: null, category: "SaaS", resource: "Web/App", spec: null, cost: 23 * 10, monthly: 23 * 10, assignee: "최유리", dept: "인프라팀" },
  ];

  for (const c of cloudData) {
    const existing = await prisma.asset.findFirst({ where: { name: c.name, type: "CLOUD" } });
    if (existing) continue;

    await prisma.asset.create({
      data: {
        type: "CLOUD",
        name: c.name,
        status: "IN_USE",
        vendor: c.platform,
        cost: c.cost,
        monthlyCost: c.monthly,
        currency: c.cost > 1000 ? "KRW" : "USD",
        billingCycle: "MONTHLY",
        purchaseDate: new Date("2025-01-01"),
        expiryDate: new Date("2026-12-31"),
        companyId: company.id,
        orgUnitId: orgUnits[c.dept].id,
        assigneeId: employees[c.assignee].id,
        cloudDetail: {
          create: {
            platform: c.platform,
            region: c.region,
            serviceCategory: c.category,
            resourceType: c.resource,
            instanceSpec: c.spec,
            accountId: c.platform === "AWS" ? "123456789012" : c.platform === "GCP" ? "test-project-id" : null,
          },
        },
      },
    });
  }
  console.log(`✓ 클라우드 자산 ${cloudData.length}개`);

  // ── 6. 도메인·SSL ──
  const domainData = [
    { name: "test-company.com", registrar: "가비아", ssl: "WILDCARD", issuer: "Let's Encrypt", cost: 22000, expiry: "2027-03-15" },
    { name: "test-company.co.kr", registrar: "가비아", ssl: "DV", issuer: "Let's Encrypt", cost: 18000, expiry: "2026-09-20" },
    { name: "api.test-company.com", registrar: "AWS Route53", ssl: "DV", issuer: "AWS ACM", cost: 0, expiry: "2026-06-01" },
    { name: "admin.test-company.com", registrar: "AWS Route53", ssl: "DV", issuer: "AWS ACM", cost: 0, expiry: "2026-06-01" },
  ];

  for (const d of domainData) {
    const existing = await prisma.asset.findFirst({ where: { name: d.name, type: "DOMAIN_SSL" } });
    if (existing) continue;

    await prisma.asset.create({
      data: {
        type: "DOMAIN_SSL",
        name: d.name,
        status: "IN_USE",
        vendor: d.registrar,
        cost: d.cost,
        currency: "KRW",
        billingCycle: "ANNUAL",
        purchaseDate: new Date("2024-03-15"),
        expiryDate: new Date(d.expiry),
        companyId: company.id,
        orgUnitId: orgUnits["인프라팀"].id,
        assigneeId: employees["박서준"].id,
        domainDetail: {
          create: {
            domainName: d.name,
            registrar: d.registrar,
            sslType: d.ssl,
            issuer: d.issuer,
            autoRenew: true,
          },
        },
      },
    });
  }
  console.log(`✓ 도메인·SSL ${domainData.length}개`);

  // ── 7. 업체 계약 ──
  const contractData = [
    { name: "서버 유지보수 계약 (2025)", counterparty: "스마트인프라", type: "유지보수", cost: 12000000, start: "2025-01-01", end: "2025-12-31" },
    { name: "보안 컨설팅 계약", counterparty: "시큐어솔루션", type: "외주", cost: 30000000, start: "2025-06-01", end: "2025-11-30" },
    { name: "IDC 코로케이션 계약", counterparty: "KT IDC", type: "SLA", cost: 5500000, start: "2025-01-01", end: "2026-12-31" },
    { name: "네트워크 장비 유지보수", counterparty: "씨스코코리아", type: "유지보수", cost: 8000000, start: "2025-04-01", end: "2026-03-31" },
  ];

  for (const ct of contractData) {
    const existing = await prisma.asset.findFirst({ where: { name: ct.name, type: "CONTRACT" } });
    if (existing) continue;

    await prisma.asset.create({
      data: {
        type: "CONTRACT",
        name: ct.name,
        status: "IN_USE",
        vendor: ct.counterparty,
        cost: ct.cost,
        currency: "KRW",
        billingCycle: "ANNUAL",
        purchaseDate: new Date(ct.start),
        expiryDate: new Date(ct.end),
        companyId: company.id,
        orgUnitId: orgUnits["인프라팀"].id,
        contractDetail: {
          create: {
            counterparty: ct.counterparty,
            contractType: ct.type,
            contractNumber: `CT-${new Date(ct.start).getFullYear()}-${String(contractData.indexOf(ct) + 1).padStart(3, "0")}`,
            autoRenew: ct.type === "유지보수",
          },
        },
      },
    });
  }
  console.log(`✓ 업체 계약 ${contractData.length}개`);

  console.log("\n🎉 더미 데이터 삽입 완료!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
