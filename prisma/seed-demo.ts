/**
 * 로컬 전용 더미 데이터 시드
 * 실행: npx tsx prisma/seed-demo.ts
 *
 * ⚠️ 기존 데이터를 삭제하지 않고, upsert 또는 create 방식으로 추가합니다.
 * ⚠️ 자산지도 섹션(AssetMapView) 데이터는 생성하지 않습니다.
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── 헬퍼 ──
function d(dateStr: string) { return new Date(dateStr); }
function months(n: number) { const dt = new Date(); dt.setMonth(dt.getMonth() + n); return dt; }
function daysAgo(n: number) { const dt = new Date(); dt.setDate(dt.getDate() - n); return dt; }

async function main() {
  console.log("🌱 시연용 더미 데이터 시드 시작...\n");

  // ══════════════════════════════════════════════════
  // 1. 회사 + 조직
  // ══════════════════════════════════════════════════
  const company = await prisma.orgCompany.upsert({
    where: { name: "(주)테크솔루션" },
    update: {},
    create: { name: "(주)테크솔루션" },
  });
  const company2 = await prisma.orgCompany.upsert({
    where: { name: "(주)데이터랩" },
    update: {},
    create: { name: "(주)데이터랩" },
  });

  const depts: Record<string, { id: number }> = {};
  const deptList = [
    { name: "경영지원본부", companyId: company.id, parentId: null, sortOrder: 1 },
    { name: "개발본부", companyId: company.id, parentId: null, sortOrder: 2 },
    { name: "사업본부", companyId: company.id, parentId: null, sortOrder: 3 },
    { name: "인사팀", companyId: company.id, parentId: null, sortOrder: 4 },
    { name: "재무팀", companyId: company.id, parentId: null, sortOrder: 5 },
    { name: "백엔드팀", companyId: company.id, parentId: null, sortOrder: 6 },
    { name: "프론트엔드팀", companyId: company.id, parentId: null, sortOrder: 7 },
    { name: "인프라팀", companyId: company.id, parentId: null, sortOrder: 8 },
    { name: "영업팀", companyId: company.id, parentId: null, sortOrder: 9 },
    { name: "마케팅팀", companyId: company.id, parentId: null, sortOrder: 10 },
    { name: "데이터분석팀", companyId: company2.id, parentId: null, sortOrder: 1 },
    { name: "AI연구팀", companyId: company2.id, parentId: null, sortOrder: 2 },
  ];

  for (const dept of deptList) {
    const created = await prisma.orgUnit.upsert({
      where: { name_companyId: { name: dept.name, companyId: dept.companyId } },
      update: {},
      create: dept,
    });
    depts[dept.name] = created;
  }

  const parentMap: Record<string, string> = {
    "인사팀": "경영지원본부", "재무팀": "경영지원본부",
    "백엔드팀": "개발본부", "프론트엔드팀": "개발본부", "인프라팀": "개발본부",
    "영업팀": "사업본부", "마케팅팀": "사업본부",
    "AI연구팀": "데이터분석팀",
  };
  for (const [child, parent] of Object.entries(parentMap)) {
    if (depts[child] && depts[parent]) {
      await prisma.orgUnit.update({
        where: { id: depts[child].id },
        data: { parentId: depts[parent].id },
      });
    }
  }
  console.log("✓ 회사 2개 + 조직 12개 생성");

  // ══════════════════════════════════════════════════
  // 2. 조직원 (30명)
  // ══════════════════════════════════════════════════
  const empData = [
    { name: "김민수", department: "경영지원본부", email: "minsu.kim@techsol.co.kr", title: "본부장", companyId: company.id, orgUnitId: depts["경영지원본부"].id },
    { name: "이서연", department: "인사팀", email: "seoyeon.lee@techsol.co.kr", title: "팀장", companyId: company.id, orgUnitId: depts["인사팀"].id },
    { name: "박지훈", department: "인사팀", email: "jihoon.park@techsol.co.kr", title: "대리", companyId: company.id, orgUnitId: depts["인사팀"].id },
    { name: "최유진", department: "재무팀", email: "yujin.choi@techsol.co.kr", title: "팀장", companyId: company.id, orgUnitId: depts["재무팀"].id },
    { name: "정하늘", department: "재무팀", email: "haneul.jung@techsol.co.kr", title: "사원", companyId: company.id, orgUnitId: depts["재무팀"].id },
    { name: "한도현", department: "개발본부", email: "dohyun.han@techsol.co.kr", title: "본부장", companyId: company.id, orgUnitId: depts["개발본부"].id },
    { name: "윤서준", department: "백엔드팀", email: "seojun.yun@techsol.co.kr", title: "팀장", companyId: company.id, orgUnitId: depts["백엔드팀"].id },
    { name: "임채원", department: "백엔드팀", email: "chaewon.lim@techsol.co.kr", title: "선임", companyId: company.id, orgUnitId: depts["백엔드팀"].id },
    { name: "강태우", department: "백엔드팀", email: "taewoo.kang@techsol.co.kr", title: "주임", companyId: company.id, orgUnitId: depts["백엔드팀"].id },
    { name: "조은비", department: "백엔드팀", email: "eunbi.jo@techsol.co.kr", title: "사원", companyId: company.id, orgUnitId: depts["백엔드팀"].id },
    { name: "배성민", department: "프론트엔드팀", email: "sungmin.bae@techsol.co.kr", title: "팀장", companyId: company.id, orgUnitId: depts["프론트엔드팀"].id },
    { name: "오지원", department: "프론트엔드팀", email: "jiwon.oh@techsol.co.kr", title: "선임", companyId: company.id, orgUnitId: depts["프론트엔드팀"].id },
    { name: "노현우", department: "프론트엔드팀", email: "hyunwoo.noh@techsol.co.kr", title: "사원", companyId: company.id, orgUnitId: depts["프론트엔드팀"].id },
    { name: "신재혁", department: "인프라팀", email: "jaehyuk.shin@techsol.co.kr", title: "팀장", companyId: company.id, orgUnitId: depts["인프라팀"].id },
    { name: "문예린", department: "인프라팀", email: "yerin.moon@techsol.co.kr", title: "선임", companyId: company.id, orgUnitId: depts["인프라팀"].id },
    { name: "홍승우", department: "인프라팀", email: "seungwoo.hong@techsol.co.kr", title: "주임", companyId: company.id, orgUnitId: depts["인프라팀"].id },
    { name: "서다은", department: "사업본부", email: "daeun.seo@techsol.co.kr", title: "본부장", companyId: company.id, orgUnitId: depts["사업본부"].id },
    { name: "안주혁", department: "영업팀", email: "juhyuk.an@techsol.co.kr", title: "팀장", companyId: company.id, orgUnitId: depts["영업팀"].id },
    { name: "권나영", department: "영업팀", email: "nayoung.kwon@techsol.co.kr", title: "대리", companyId: company.id, orgUnitId: depts["영업팀"].id },
    { name: "유지민", department: "영업팀", email: "jimin.yoo@techsol.co.kr", title: "사원", companyId: company.id, orgUnitId: depts["영업팀"].id },
    { name: "양수빈", department: "마케팅팀", email: "subin.yang@techsol.co.kr", title: "팀장", companyId: company.id, orgUnitId: depts["마케팅팀"].id },
    { name: "장현서", department: "마케팅팀", email: "hyunseo.jang@techsol.co.kr", title: "대리", companyId: company.id, orgUnitId: depts["마케팅팀"].id },
    { name: "손우진", department: "마케팅팀", email: "woojin.son@techsol.co.kr", title: "사원", companyId: company.id, orgUnitId: depts["마케팅팀"].id },
    { name: "김태현", department: "데이터분석팀", email: "taehyun.kim@datalab.co.kr", title: "팀장", companyId: company2.id, orgUnitId: depts["데이터분석팀"].id },
    { name: "이수아", department: "데이터분석팀", email: "sua.lee@datalab.co.kr", title: "선임", companyId: company2.id, orgUnitId: depts["데이터분석팀"].id },
    { name: "박준서", department: "AI연구팀", email: "junseo.park@datalab.co.kr", title: "팀장", companyId: company2.id, orgUnitId: depts["AI연구팀"].id },
    { name: "최하은", department: "AI연구팀", email: "haeun.choi@datalab.co.kr", title: "연구원", companyId: company2.id, orgUnitId: depts["AI연구팀"].id },
    { name: "남기범", department: "백엔드팀", email: "gibeom.nam@techsol.co.kr", title: "대리", companyId: company.id, orgUnitId: depts["백엔드팀"].id, status: "OFFBOARDING" as const, offboardingUntil: months(1) },
    { name: "황수정", department: "영업팀", email: "sujeong.hwang@techsol.co.kr", title: "사원", companyId: company.id, orgUnitId: depts["영업팀"].id, status: "DELETED" as const },
    { name: "구본석", department: "인프라팀", email: "bonseok.gu@techsol.co.kr", title: "주임", companyId: company.id, orgUnitId: depts["인프라팀"].id, status: "OFFBOARDING" as const, offboardingUntil: months(2) },
  ];

  const employees: Record<string, { id: number }> = {};
  for (const e of empData) {
    const created = await prisma.employee.upsert({
      where: { email: e.email! },
      update: {},
      create: e,
    });
    employees[e.name] = created;
  }
  console.log("✓ 조직원 30명 생성");

  // ══════════════════════════════════════════════════
  // 3. 라이선스 (12개)
  // ══════════════════════════════════════════════════
  const licenseData = [
    { name: "Microsoft 365 Business", licenseType: "NO_KEY" as const, totalQuantity: 30, price: 16500, purchaseDate: d("2025-01-15"), expiryDate: d("2026-01-14"), paymentCycle: "MONTHLY" as const, currency: "KRW" as const, unitPrice: 16500, quantity: 30, totalAmountKRW: 495000, vendor: "한국마이크로소프트", renewalStatus: "RENEWED" as const, orgUnitId: depts["경영지원본부"].id },
    { name: "Slack Pro", licenseType: "NO_KEY" as const, totalQuantity: 30, price: 8.75, purchaseDate: d("2025-03-01"), expiryDate: d("2026-02-28"), paymentCycle: "MONTHLY" as const, currency: "USD" as const, exchangeRate: 1350, unitPrice: 8.75, quantity: 30, totalAmountForeign: 262.5, totalAmountKRW: 354375, vendor: "Salesforce", renewalStatus: "BEFORE_RENEWAL" as const, orgUnitId: depts["개발본부"].id },
    { name: "Jira Software Cloud", licenseType: "NO_KEY" as const, totalQuantity: 20, price: 7.75, purchaseDate: d("2025-06-01"), expiryDate: d("2026-05-31"), paymentCycle: "MONTHLY" as const, currency: "USD" as const, exchangeRate: 1350, unitPrice: 7.75, quantity: 20, totalAmountForeign: 155, totalAmountKRW: 209250, vendor: "Atlassian", renewalStatus: "BEFORE_RENEWAL" as const, orgUnitId: depts["개발본부"].id },
    { name: "Figma Enterprise", licenseType: "NO_KEY" as const, totalQuantity: 8, price: 75, purchaseDate: d("2025-04-01"), expiryDate: d("2026-03-31"), paymentCycle: "MONTHLY" as const, currency: "USD" as const, exchangeRate: 1350, unitPrice: 75, quantity: 8, totalAmountForeign: 600, totalAmountKRW: 810000, vendor: "Figma Inc.", renewalStatus: "IN_PROGRESS" as const, orgUnitId: depts["프론트엔드팀"].id },
    { name: "JetBrains All Products Pack", licenseType: "KEY_BASED" as const, totalQuantity: 15, price: 649, purchaseDate: d("2025-02-01"), expiryDate: d("2026-01-31"), paymentCycle: "YEARLY" as const, currency: "USD" as const, exchangeRate: 1350, unitPrice: 649, quantity: 15, totalAmountForeign: 9735, totalAmountKRW: 13142250, vendor: "JetBrains s.r.o.", renewalStatus: "BEFORE_RENEWAL" as const, orgUnitId: depts["개발본부"].id },
    { name: "GitHub Enterprise", licenseType: "NO_KEY" as const, totalQuantity: 25, price: 21, purchaseDate: d("2025-01-01"), expiryDate: d("2025-12-31"), paymentCycle: "MONTHLY" as const, currency: "USD" as const, exchangeRate: 1350, unitPrice: 21, quantity: 25, totalAmountForeign: 525, totalAmountKRW: 708750, vendor: "GitHub", renewalStatus: "RENEWED" as const, orgUnitId: depts["개발본부"].id },
    { name: "Adobe Creative Cloud", licenseType: "KEY_BASED" as const, totalQuantity: 5, price: 86900, purchaseDate: d("2025-05-01"), expiryDate: d("2026-04-30"), paymentCycle: "MONTHLY" as const, currency: "KRW" as const, unitPrice: 86900, quantity: 5, totalAmountKRW: 434500, vendor: "어도비코리아", renewalStatus: "BEFORE_RENEWAL" as const, orgUnitId: depts["마케팅팀"].id },
    { name: "Notion Team", licenseType: "NO_KEY" as const, totalQuantity: 30, price: 10, purchaseDate: d("2025-07-01"), expiryDate: d("2026-06-30"), paymentCycle: "MONTHLY" as const, currency: "USD" as const, exchangeRate: 1350, unitPrice: 10, quantity: 30, totalAmountForeign: 300, totalAmountKRW: 405000, vendor: "Notion Labs", renewalStatus: "BEFORE_RENEWAL" as const, orgUnitId: depts["경영지원본부"].id },
    { name: "Zoom Business", licenseType: "NO_KEY" as const, totalQuantity: 10, price: 18.32, purchaseDate: d("2025-03-15"), expiryDate: d("2026-03-14"), paymentCycle: "MONTHLY" as const, currency: "USD" as const, exchangeRate: 1350, unitPrice: 18.32, quantity: 10, totalAmountForeign: 183.2, totalAmountKRW: 247320, vendor: "Zoom Communications", renewalStatus: "IN_PROGRESS" as const, orgUnitId: depts["경영지원본부"].id },
    { name: "Windows 11 Pro", licenseType: "VOLUME" as const, totalQuantity: 20, price: 259000, purchaseDate: d("2024-06-01"), expiryDate: null, paymentCycle: null, currency: "KRW" as const, unitPrice: 259000, quantity: 20, totalAmountKRW: 5180000, vendor: "한국마이크로소프트", renewalStatus: "BEFORE_RENEWAL" as const },
    { name: "AutoCAD LT", licenseType: "KEY_BASED" as const, totalQuantity: 3, price: 590, purchaseDate: d("2025-08-01"), expiryDate: d("2026-07-31"), paymentCycle: "YEARLY" as const, currency: "USD" as const, exchangeRate: 1350, unitPrice: 590, quantity: 3, totalAmountForeign: 1770, totalAmountKRW: 2389500, vendor: "Autodesk", renewalStatus: "BEFORE_RENEWAL" as const },
    { name: "1Password Business", licenseType: "NO_KEY" as const, totalQuantity: 30, price: 7.99, purchaseDate: d("2025-02-15"), expiryDate: d("2026-02-14"), paymentCycle: "MONTHLY" as const, currency: "USD" as const, exchangeRate: 1350, unitPrice: 7.99, quantity: 30, totalAmountForeign: 239.7, totalAmountKRW: 323595, vendor: "1Password", renewalStatus: "BEFORE_RENEWAL" as const, orgUnitId: depts["인프라팀"].id },
  ];

  const licenses: Record<string, { id: number }> = {};
  for (const lic of licenseData) {
    const created = await prisma.license.upsert({
      where: { name: lic.name },
      update: {},
      create: lic,
    });
    licenses[lic.name] = created;
  }
  console.log("✓ 라이선스 12개 생성");

  // 라이선스 할당
  const assignData = [
    ...["김민수","이서연","박지훈","최유진","정하늘","한도현","윤서준","임채원","강태우","조은비","배성민","오지원","노현우","신재혁","문예린","홍승우","서다은","안주혁","권나영","유지민","양수빈","장현서","손우진"].map(n => ({ license: "Microsoft 365 Business", employee: n })),
    ...["김민수","이서연","한도현","윤서준","임채원","강태우","조은비","배성민","오지원","노현우","신재혁","문예린","홍승우","서다은","안주혁","권나영","양수빈","장현서","김태현","이수아","박준서","최하은"].map(n => ({ license: "Slack Pro", employee: n })),
    ...["한도현","윤서준","임채원","강태우","조은비","배성민","오지원","노현우","신재혁","문예린","홍승우","김태현","이수아","박준서","최하은"].map(n => ({ license: "Jira Software Cloud", employee: n })),
    ...["배성민","오지원","노현우","양수빈","장현서","손우진"].map(n => ({ license: "Figma Enterprise", employee: n })),
    ...["윤서준","임채원","강태우","조은비","배성민","오지원","노현우","신재혁","문예린","홍승우","김태현","이수아","박준서","최하은"].map(n => ({ license: "JetBrains All Products Pack", employee: n })),
    ...["한도현","윤서준","임채원","강태우","조은비","배성민","오지원","노현우","신재혁","문예린","홍승우","김태현","이수아","박준서","최하은"].map(n => ({ license: "GitHub Enterprise", employee: n })),
    ...["양수빈","장현서","손우진","배성민","오지원"].map(n => ({ license: "Adobe Creative Cloud", employee: n })),
    ...["김민수","이서연","한도현","윤서준","배성민","신재혁","서다은","안주혁","양수빈","김태현","박준서"].map(n => ({ license: "Notion Team", employee: n })),
    ...["김민수","한도현","윤서준","임채원","배성민","신재혁","문예린","홍승우","서다은","안주혁","양수빈","김태현","박준서"].map(n => ({ license: "1Password Business", employee: n })),
  ];

  let assignCount = 0;
  for (const a of assignData) {
    if (!employees[a.employee] || !licenses[a.license]) continue;
    const exists = await prisma.assignment.findFirst({
      where: { licenseId: licenses[a.license].id, employeeId: employees[a.employee].id, returnedDate: null },
    });
    if (!exists) {
      await prisma.assignment.create({
        data: { licenseId: licenses[a.license].id, employeeId: employees[a.employee].id, assignedDate: daysAgo(Math.floor(Math.random() * 180) + 30) },
      });
      assignCount++;
    }
  }
  console.log(`✓ 라이선스 할당 ${assignCount}건 생성`);

  // ══════════════════════════════════════════════════
  // 4. 자산 분류 체계
  // ══════════════════════════════════════════════════
  const categories = [
    { name: "클라우드", code: "CL", abbr: "Cloud", sortOrder: 1, subs: [
      { name: "VPC", code: "VPC", isIsmsTarget: true },
      { name: "Security Group", code: "SG", isIsmsTarget: true },
      { name: "EC2", code: "EC2", isIsmsTarget: true, isConsultingTarget: true },
      { name: "S3 Bucket", code: "S3", isIsmsTarget: true },
      { name: "RDS", code: "RDS", isIsmsTarget: true, isConsultingTarget: true },
      { name: "ELB", code: "ELB", isIsmsTarget: true },
      { name: "Route53", code: "R53" },
      { name: "CloudFront", code: "CF" },
      { name: "Lambda", code: "LMB" },
      { name: "IAM", code: "IAM", isIsmsTarget: true },
    ]},
    { name: "서버", code: "SVR", abbr: "Server", sortOrder: 2, subs: [
      { name: "Linux 서버", code: "LI", isIsmsTarget: true, isConsultingTarget: true },
      { name: "Windows 서버", code: "WI", isIsmsTarget: true, isConsultingTarget: true },
    ]},
    { name: "네트워크", code: "NET", abbr: "Network", sortOrder: 3, subs: [
      { name: "방화벽", code: "FW", isIsmsTarget: true },
      { name: "스위치", code: "SW_NET", isIsmsTarget: true },
      { name: "라우터", code: "RT" },
      { name: "AP", code: "AP" },
    ]},
    { name: "단말기", code: "TRM", abbr: "Terminal", sortOrder: 4, subs: [
      { name: "노트북", code: "NB", isIsmsTarget: true, isConsultingTarget: true },
      { name: "데스크탑", code: "DT", isIsmsTarget: true },
      { name: "모니터", code: "MN" },
      { name: "모바일", code: "MB" },
    ]},
    { name: "SaaS", code: "SAAS", abbr: "SaaS", sortOrder: 5, subs: [
      { name: "협업 도구", code: "COL" },
      { name: "개발 도구", code: "DEV" },
      { name: "보안 도구", code: "SEC", isIsmsTarget: true },
    ]},
    { name: "데이터베이스", code: "DB", abbr: "DB", sortOrder: 6, subs: [
      { name: "PostgreSQL", code: "PG", isIsmsTarget: true, isConsultingTarget: true },
      { name: "MySQL", code: "MY", isIsmsTarget: true },
      { name: "Redis", code: "RD" },
    ]},
  ];

  const subCats: Record<string, { id: number }> = {};
  for (const cat of categories) {
    const major = await prisma.assetMajorCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: { name: cat.name, code: cat.code, abbr: cat.abbr, sortOrder: cat.sortOrder },
    });
    for (const sub of cat.subs) {
      const created = await prisma.assetSubCategory.upsert({
        where: { code: sub.code },
        update: {},
        create: { majorCategoryId: major.id, name: sub.name, code: sub.code, isIsmsTarget: sub.isIsmsTarget ?? false, isConsultingTarget: sub.isConsultingTarget ?? false },
      });
      subCats[sub.code] = created;
    }
  }
  console.log("✓ 자산 분류 체계 6대분류 + 소분류 생성");

  // ══════════════════════════════════════════════════
  // 5. 클라우드 자산 (10개)
  // ══════════════════════════════════════════════════
  const cloudAssets = [
    { name: "Production VPC", type: "CLOUD" as const, subCategoryId: subCats["VPC"].id, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 0, companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 3, ciaI: 3, ciaA: 3, purchaseDate: d("2024-01-01"),
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "Network", resourceType: "VPC", resourceId: "vpc-0abc1234def56789", vpcId: "vpc-0abc1234def56789" }},
    { name: "Web App Server (Prod)", type: "CLOUD" as const, subCategoryId: subCats["EC2"].id, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 85000, companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 3, ciaI: 3, ciaA: 3, purchaseDate: d("2024-03-01"),
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "IaaS", resourceType: "EC2", resourceId: "i-0abcdef1234567890", instanceSpec: "t4g.medium", vpcId: "vpc-0abc1234def56789", availabilityZone: "ap-northeast-2a", endpoint: "10.0.1.10" }},
    { name: "Web App Server (Staging)", type: "CLOUD" as const, subCategoryId: subCats["EC2"].id, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 42000, companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 2, ciaI: 2, ciaA: 2, purchaseDate: d("2024-03-01"),
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "IaaS", resourceType: "EC2", resourceId: "i-0staging12345678", instanceSpec: "t4g.small", vpcId: "vpc-0abc1234def56789", availabilityZone: "ap-northeast-2c" }},
    { name: "Main DB (PostgreSQL RDS)", type: "CLOUD" as const, subCategoryId: subCats["RDS"].id, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 195000, companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 3, ciaI: 3, ciaA: 3, purchaseDate: d("2024-01-15"),
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "Database", resourceType: "RDS", resourceId: "arn:aws:rds:ap-northeast-2:123456789012:db:main-db", instanceSpec: "db.r6g.large", storageSize: "200GB", vpcId: "vpc-0abc1234def56789", endpoint: "main-db.cluster-abc123.ap-northeast-2.rds.amazonaws.com" }},
    { name: "Static Assets (S3)", type: "CLOUD" as const, subCategoryId: subCats["S3"].id, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 12000, companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 1, ciaI: 2, ciaA: 2, purchaseDate: d("2024-02-01"),
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "Storage", resourceType: "S3", resourceId: "arn:aws:s3:::techsol-static-assets", storageSize: "50GB" }},
    { name: "API Gateway (ALB)", type: "CLOUD" as const, subCategoryId: subCats["ELB"].id, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 35000, companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 2, ciaI: 3, ciaA: 3, purchaseDate: d("2024-03-15"),
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "Network", resourceType: "ELB", resourceId: "arn:aws:elasticloadbalancing:ap-northeast-2:123456789012:loadbalancer/app/api-alb/abc123", endpoint: "api-alb-123456.ap-northeast-2.elb.amazonaws.com" }},
    { name: "Google Workspace Business", type: "CLOUD" as const, subCategoryId: subCats["COL"].id, status: "IN_USE" as const, vendor: "Google", monthlyCost: 396000, companyId: company.id, orgUnitId: depts["경영지원본부"].id, ciaC: 2, ciaI: 2, ciaA: 2, purchaseDate: d("2025-01-01"), expiryDate: d("2025-12-31"),
      cloud: { platform: "Google", seatCount: 30, serviceCategory: "SaaS", adminEmail: "admin@techsol.co.kr", contractStartDate: d("2025-01-01"), contractTermMonths: 12 }},
    { name: "Datadog Pro", type: "CLOUD" as const, subCategoryId: subCats["DEV"].id, status: "IN_USE" as const, vendor: "Datadog", monthlyCost: 405000, companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 2, ciaI: 2, ciaA: 2, purchaseDate: d("2025-04-01"), expiryDate: d("2026-03-31"),
      cloud: { platform: "Datadog", seatCount: 15, serviceCategory: "SaaS", resourceType: "Web/App", adminEmail: "infra@techsol.co.kr", contractTermMonths: 12 }},
    { name: "Cache Server (ElastiCache)", type: "CLOUD" as const, subCategoryId: subCats["RD"].id, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 65000, companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 2, ciaI: 2, ciaA: 3, purchaseDate: d("2024-06-01"),
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "Database", resourceType: "ElastiCache", instanceSpec: "cache.r6g.large", vpcId: "vpc-0abc1234def56789" }},
    { name: "Prod Security Group", type: "CLOUD" as const, subCategoryId: subCats["SG"].id, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 0, companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 3, ciaI: 3, ciaA: 2, purchaseDate: d("2024-01-01"),
      cloud: { platform: "AWS", accountId: "123456789012", region: "ap-northeast-2", serviceCategory: "Security", resourceType: "SecurityGroup", resourceId: "sg-0abcdef123456789", vpcId: "vpc-0abc1234def56789" }},
  ];

  const assets: Record<string, { id: number }> = {};
  for (const a of cloudAssets) {
    const { cloud, ...assetData } = a;
    const existing = await prisma.asset.findFirst({ where: { name: a.name } });
    if (existing) { assets[a.name] = existing; continue; }
    const created = await prisma.asset.create({ data: { ...assetData, cloudDetail: { create: cloud } } });
    assets[a.name] = created;
  }
  console.log("✓ 클라우드 자산 10개 생성");

  // ══════════════════════════════════════════════════
  // 6. 하드웨어 자산 (15개)
  // ══════════════════════════════════════════════════
  const hwAssets = [
    { name: "MBP-001 김민수", type: "HARDWARE" as const, subCategoryId: subCats["NB"].id, status: "IN_USE" as const, vendor: "Apple", cost: 3190000, purchaseDate: d("2024-08-15"), companyId: company.id, orgUnitId: depts["경영지원본부"].id, assigneeId: employees["김민수"].id, ciaC: 2, ciaI: 2, ciaA: 2,
      hw: { deviceType: "Laptop", manufacturer: "Apple", model: "MacBook Pro 14\" M4 Pro", serialNumber: "C02XF1ABCDEF", hostname: "MBP-KMS", os: "macOS", osVersion: "Sequoia 15.3", cpu: "Apple M4 Pro", ram: "36GB", storage: "512GB SSD", displaySize: "14.2\"", assetTag: "NB-2024-001", condition: "A" }},
    { name: "MBP-002 한도현", type: "HARDWARE" as const, subCategoryId: subCats["NB"].id, status: "IN_USE" as const, vendor: "Apple", cost: 4390000, purchaseDate: d("2024-06-01"), companyId: company.id, orgUnitId: depts["개발본부"].id, assigneeId: employees["한도현"].id, ciaC: 3, ciaI: 2, ciaA: 2,
      hw: { deviceType: "Laptop", manufacturer: "Apple", model: "MacBook Pro 16\" M4 Max", serialNumber: "C02XG2BCDEFG", hostname: "MBP-HDH", os: "macOS", osVersion: "Sequoia 15.3", cpu: "Apple M4 Max", ram: "48GB", storage: "1TB SSD", displaySize: "16.2\"", assetTag: "NB-2024-002", condition: "A" }},
    { name: "MBP-003 윤서준", type: "HARDWARE" as const, subCategoryId: subCats["NB"].id, status: "IN_USE" as const, vendor: "Apple", cost: 3190000, purchaseDate: d("2024-08-15"), companyId: company.id, orgUnitId: depts["백엔드팀"].id, assigneeId: employees["윤서준"].id, ciaC: 3, ciaI: 2, ciaA: 2,
      hw: { deviceType: "Laptop", manufacturer: "Apple", model: "MacBook Pro 14\" M4 Pro", serialNumber: "C02XH3CDEFGH", hostname: "MBP-YSJ", os: "macOS", osVersion: "Sequoia 15.3", cpu: "Apple M4 Pro", ram: "36GB", storage: "1TB SSD", displaySize: "14.2\"", assetTag: "NB-2024-003", condition: "A" }},
    { name: "ThinkPad-001 배성민", type: "HARDWARE" as const, subCategoryId: subCats["NB"].id, status: "IN_USE" as const, vendor: "Lenovo", cost: 2200000, purchaseDate: d("2024-03-10"), companyId: company.id, orgUnitId: depts["프론트엔드팀"].id, assigneeId: employees["배성민"].id, ciaC: 2, ciaI: 2, ciaA: 2,
      hw: { deviceType: "Laptop", manufacturer: "Lenovo", model: "ThinkPad T14s Gen 5", serialNumber: "PF4ABCDE", hostname: "TP-BSM", os: "Windows", osVersion: "Windows 11 Pro 24H2", cpu: "Intel Core Ultra 7 155H", ram: "32GB DDR5", storage: "512GB NVMe", displaySize: "14\"", assetTag: "NB-2024-004", condition: "A" }},
    { name: "ThinkPad-002 신재혁", type: "HARDWARE" as const, subCategoryId: subCats["NB"].id, status: "IN_USE" as const, vendor: "Lenovo", cost: 2200000, purchaseDate: d("2024-03-10"), companyId: company.id, orgUnitId: depts["인프라팀"].id, assigneeId: employees["신재혁"].id, ciaC: 3, ciaI: 3, ciaA: 2,
      hw: { deviceType: "Laptop", manufacturer: "Lenovo", model: "ThinkPad T14s Gen 5", serialNumber: "PF4BCDEF", hostname: "TP-SJH", os: "Windows", osVersion: "Windows 11 Pro 24H2", cpu: "Intel Core Ultra 7 155H", ram: "32GB DDR5", storage: "1TB NVMe", displaySize: "14\"", assetTag: "NB-2024-005", condition: "A" }},
    { name: "Dell-DT-001 이서연", type: "HARDWARE" as const, subCategoryId: subCats["DT"].id, status: "IN_USE" as const, vendor: "Dell", cost: 1450000, purchaseDate: d("2023-11-01"), companyId: company.id, orgUnitId: depts["인사팀"].id, assigneeId: employees["이서연"].id, ciaC: 2, ciaI: 2, ciaA: 1,
      hw: { deviceType: "Desktop", manufacturer: "Dell", model: "OptiPlex 7020", serialNumber: "DELL7020ABCD", hostname: "DT-LSY", os: "Windows", osVersion: "Windows 11 Pro 23H2", cpu: "Intel i7-14700", ram: "16GB DDR5", storage: "512GB SSD", assetTag: "DT-2023-001", condition: "B" }},
    { name: "Dell-DT-002 최유진", type: "HARDWARE" as const, subCategoryId: subCats["DT"].id, status: "IN_USE" as const, vendor: "Dell", cost: 1450000, purchaseDate: d("2023-11-01"), companyId: company.id, orgUnitId: depts["재무팀"].id, assigneeId: employees["최유진"].id, ciaC: 3, ciaI: 2, ciaA: 1,
      hw: { deviceType: "Desktop", manufacturer: "Dell", model: "OptiPlex 7020", serialNumber: "DELL7020BCDE", hostname: "DT-CYJ", os: "Windows", osVersion: "Windows 11 Pro 23H2", cpu: "Intel i7-14700", ram: "16GB DDR5", storage: "512GB SSD", assetTag: "DT-2023-002", condition: "B" }},
    { name: "Dell Monitor U2723QE x2", type: "HARDWARE" as const, subCategoryId: subCats["MN"].id, status: "IN_USE" as const, vendor: "Dell", cost: 1580000, purchaseDate: d("2024-01-15"), companyId: company.id, orgUnitId: depts["개발본부"].id, ciaC: 1, ciaI: 1, ciaA: 1,
      hw: { deviceType: "Peripheral", manufacturer: "Dell", model: "U2723QE", resolution: "3840x2160", assetTag: "MN-2024-001", condition: "A" }},
    { name: "Server-001 (On-Prem)", type: "HARDWARE" as const, subCategoryId: subCats["LI"].id, status: "IN_USE" as const, vendor: "Dell", cost: 8500000, purchaseDate: d("2023-06-01"), companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 3, ciaI: 3, ciaA: 3,
      hw: { deviceType: "Server", manufacturer: "Dell", model: "PowerEdge R750", serialNumber: "SVR750ABCDE", hostname: "srv-onprem-01", os: "Linux", osVersion: "Ubuntu 22.04 LTS", cpu: "Intel Xeon Gold 6342", ram: "128GB DDR4 ECC", storage: "4TB NVMe RAID10", ipAddress: "192.168.1.10", macAddress: "00:1A:2B:3C:4D:5E", assetTag: "SVR-2023-001", location: "본사 서버실 Rack A-01", condition: "A" }},
    { name: "FortiGate 60F", type: "HARDWARE" as const, subCategoryId: subCats["FW"].id, status: "IN_USE" as const, vendor: "Fortinet", cost: 3200000, purchaseDate: d("2023-09-01"), companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 3, ciaI: 3, ciaA: 3,
      hw: { deviceType: "Network", manufacturer: "Fortinet", model: "FortiGate 60F", serialNumber: "FGT60FABCDEF", hostname: "fw-main", ipAddress: "192.168.1.1", firmwareVersion: "7.4.3", assetTag: "NET-2023-001", location: "본사 서버실 Rack A-02", condition: "A" }},
    { name: "Cisco Switch C9200L", type: "HARDWARE" as const, subCategoryId: subCats["SW_NET"].id, status: "IN_USE" as const, vendor: "Cisco", cost: 4500000, purchaseDate: d("2023-09-01"), companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 2, ciaI: 3, ciaA: 3,
      hw: { deviceType: "Network", manufacturer: "Cisco", model: "Catalyst 9200L-48P", serialNumber: "FCW2ABCDEFG", hostname: "sw-core-01", ipAddress: "192.168.1.2", portCount: 48, firmwareVersion: "17.9.4a", assetTag: "NET-2023-002", location: "본사 서버실 Rack A-03", condition: "A" }},
    { name: "iPhone 15 Pro 안주혁", type: "HARDWARE" as const, subCategoryId: subCats["MB"].id, status: "IN_USE" as const, vendor: "Apple", cost: 1550000, purchaseDate: d("2024-11-01"), companyId: company.id, orgUnitId: depts["영업팀"].id, assigneeId: employees["안주혁"].id, ciaC: 2, ciaI: 1, ciaA: 2,
      hw: { deviceType: "Mobile", manufacturer: "Apple", model: "iPhone 15 Pro", serialNumber: "DNXYZ1234567", imei: "354123456789012", phoneNumber: "010-1234-5678", assetTag: "MB-2024-001", condition: "A" }},
    { name: "예비 노트북 (미할당)", type: "HARDWARE" as const, subCategoryId: subCats["NB"].id, status: "IN_STOCK" as const, vendor: "Lenovo", cost: 1800000, purchaseDate: d("2025-01-10"), companyId: company.id, ciaC: 1, ciaI: 1, ciaA: 1,
      hw: { deviceType: "Laptop", manufacturer: "Lenovo", model: "ThinkPad E14 Gen 6", serialNumber: "PF5SPARE01", os: "Windows", osVersion: "Windows 11 Pro", cpu: "Intel Core i5-1335U", ram: "16GB DDR5", storage: "256GB SSD", assetTag: "NB-2025-001", condition: "A" }},
    { name: "폐기 예정 데스크탑", type: "HARDWARE" as const, subCategoryId: subCats["DT"].id, status: "PENDING_DISPOSAL" as const, vendor: "HP", cost: 890000, purchaseDate: d("2019-03-01"), companyId: company.id, ciaC: 1, ciaI: 1, ciaA: 1,
      hw: { deviceType: "Desktop", manufacturer: "HP", model: "ProDesk 400 G5", serialNumber: "HP400G5ABCD", os: "Windows", osVersion: "Windows 10 Pro", cpu: "Intel i5-8500", ram: "8GB DDR4", storage: "256GB SSD", assetTag: "DT-2019-001", condition: "D", notes: "노후화로 폐기 예정" }},
    { name: "Galaxy Tab S9 서다은", type: "HARDWARE" as const, subCategoryId: subCats["MB"].id, status: "IN_USE" as const, vendor: "Samsung", cost: 1199000, purchaseDate: d("2024-09-15"), companyId: company.id, orgUnitId: depts["사업본부"].id, assigneeId: employees["서다은"].id, ciaC: 2, ciaI: 1, ciaA: 1,
      hw: { deviceType: "Mobile", manufacturer: "Samsung", model: "Galaxy Tab S9", serialNumber: "R52TABXYZ123", assetTag: "MB-2024-002", condition: "A" }},
  ];

  for (const a of hwAssets) {
    const { hw, ...assetData } = a;
    const existing = await prisma.asset.findFirst({ where: { name: a.name } });
    if (existing) { assets[a.name] = existing; continue; }
    const created = await prisma.asset.create({ data: { ...assetData, hardwareDetail: { create: hw } } });
    assets[a.name] = created;
  }
  console.log("✓ 하드웨어 자산 15개 생성");

  // ══════════════════════════════════════════════════
  // 7. 도메인·SSL 자산 (5개)
  // ══════════════════════════════════════════════════
  const domainAssets = [
    { name: "techsol.co.kr", type: "DOMAIN_SSL" as const, status: "IN_USE" as const, vendor: "가비아", monthlyCost: 1833, purchaseDate: d("2023-01-01"), expiryDate: d("2026-01-01"), renewalDate: d("2025-12-01"), companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 2, ciaI: 3, ciaA: 3,
      domain: { domainName: "techsol.co.kr", registrar: "가비아", sslType: "WILDCARD", issuer: "Let's Encrypt", billingCycleMonths: 12, autoRenew: true }},
    { name: "api.techsol.co.kr SSL", type: "DOMAIN_SSL" as const, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 0, purchaseDate: d("2024-06-01"), expiryDate: d("2025-06-01"), companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 3, ciaI: 3, ciaA: 3,
      domain: { domainName: "api.techsol.co.kr", registrar: "Route53", sslType: "DV", issuer: "Amazon Trust Services", billingCycleMonths: 12, autoRenew: true }},
    { name: "app.techsol.co.kr", type: "DOMAIN_SSL" as const, status: "IN_USE" as const, vendor: "가비아", monthlyCost: 917, purchaseDate: d("2024-01-01"), expiryDate: d("2026-01-01"), companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 2, ciaI: 2, ciaA: 3,
      domain: { domainName: "app.techsol.co.kr", registrar: "가비아", sslType: "DV", issuer: "Let's Encrypt", billingCycleMonths: 12, autoRenew: true }},
    { name: "datalab.co.kr", type: "DOMAIN_SSL" as const, status: "IN_USE" as const, vendor: "가비아", monthlyCost: 1833, purchaseDate: d("2024-03-01"), expiryDate: d("2026-03-01"), companyId: company2.id, orgUnitId: depts["데이터분석팀"].id, ciaC: 2, ciaI: 2, ciaA: 2,
      domain: { domainName: "datalab.co.kr", registrar: "가비아", sslType: "OV", issuer: "GlobalSign", billingCycleMonths: 12, autoRenew: true }},
    { name: "내부망 인증서 (*.internal)", type: "DOMAIN_SSL" as const, status: "IN_USE" as const, vendor: "자체 발급", monthlyCost: 0, purchaseDate: d("2025-01-01"), expiryDate: d("2026-01-01"), companyId: company.id, orgUnitId: depts["인프라팀"].id, ciaC: 3, ciaI: 3, ciaA: 2,
      domain: { domainName: "*.internal.techsol.co.kr", registrar: "자체", sslType: "WILDCARD", issuer: "자체 CA", billingCycleMonths: 12, autoRenew: false }},
  ];

  for (const a of domainAssets) {
    const { domain, ...assetData } = a;
    const existing = await prisma.asset.findFirst({ where: { name: a.name } });
    if (existing) { assets[a.name] = existing; continue; }
    const created = await prisma.asset.create({ data: { ...assetData, domainDetail: { create: domain } } });
    assets[a.name] = created;
  }
  console.log("✓ 도메인·SSL 자산 5개 생성");

  // ══════════════════════════════════════════════════
  // 8. 계약 (5개)
  // ══════════════════════════════════════════════════
  const contractAssets = [
    { name: "AWS 연간 지원 계약", type: "CONTRACT" as const, status: "IN_USE" as const, vendor: "AWS", monthlyCost: 250000, purchaseDate: d("2025-01-01"), expiryDate: d("2025-12-31"), companyId: company.id, orgUnitId: depts["인프라팀"].id,
      contract: { contractNumber: "CT-2025-001", counterparty: "Amazon Web Services", contractType: "유지보수", autoRenew: true }},
    { name: "사무실 네트워크 유지보수", type: "CONTRACT" as const, status: "IN_USE" as const, vendor: "LG유플러스", monthlyCost: 350000, purchaseDate: d("2024-07-01"), expiryDate: d("2025-06-30"), companyId: company.id, orgUnitId: depts["경영지원본부"].id,
      contract: { contractNumber: "CT-2024-003", counterparty: "LG유플러스", contractType: "유지보수", autoRenew: true }},
    { name: "보안관제 서비스 계약", type: "CONTRACT" as const, status: "IN_USE" as const, vendor: "안랩", monthlyCost: 500000, purchaseDate: d("2025-03-01"), expiryDate: d("2026-02-28"), companyId: company.id, orgUnitId: depts["인프라팀"].id,
      contract: { contractNumber: "CT-2025-002", counterparty: "안랩", contractType: "SLA", autoRenew: false }},
    { name: "ERP 시스템 외주 개발", type: "CONTRACT" as const, status: "IN_USE" as const, vendor: "더존비즈온", monthlyCost: 0, cost: 45000000, billingCycle: "ONE_TIME", purchaseDate: d("2025-06-01"), expiryDate: d("2025-11-30"), companyId: company.id, orgUnitId: depts["개발본부"].id,
      contract: { contractNumber: "CT-2025-003", counterparty: "더존비즈온", contractType: "외주" }},
    { name: "복합기 임대 계약", type: "CONTRACT" as const, status: "IN_USE" as const, vendor: "후지필름BI", monthlyCost: 180000, purchaseDate: d("2024-01-01"), expiryDate: d("2026-12-31"), companyId: company.id, orgUnitId: depts["경영지원본부"].id,
      contract: { contractNumber: "CT-2024-001", counterparty: "후지필름비즈니스이노베이션코리아", contractType: "기타", autoRenew: false }},
  ];

  for (const a of contractAssets) {
    const { contract, ...assetData } = a;
    const existing = await prisma.asset.findFirst({ where: { name: a.name } });
    if (existing) { assets[a.name] = existing; continue; }
    const created = await prisma.asset.create({ data: { ...assetData, contractDetail: { create: contract } } });
    assets[a.name] = created;
  }
  console.log("✓ 계약 5개 생성");

  // ══════════════════════════════════════════════════
  // 9. 라이선스 그룹
  // ══════════════════════════════════════════════════
  const groups = [
    { name: "개발 필수", description: "개발팀 필수 라이선스", licenses: ["JetBrains All Products Pack", "GitHub Enterprise", "Jira Software Cloud"] },
    { name: "전사 공통", description: "전 직원 사용 도구", licenses: ["Microsoft 365 Business", "Slack Pro", "Notion Team", "1Password Business"] },
    { name: "디자인", description: "디자인팀 도구", licenses: ["Figma Enterprise", "Adobe Creative Cloud"] },
  ];

  for (const g of groups) {
    const group = await prisma.licenseGroup.upsert({
      where: { name: g.name },
      update: {},
      create: { name: g.name, description: g.description },
    });
    for (const licName of g.licenses) {
      if (!licenses[licName]) continue;
      await prisma.licenseGroupMember.upsert({
        where: { licenseGroupId_licenseId: { licenseGroupId: group.id, licenseId: licenses[licName].id } },
        update: {},
        create: { licenseGroupId: group.id, licenseId: licenses[licName].id },
      });
    }
  }
  console.log("✓ 라이선스 그룹 3개 생성");

  // ══════════════════════════════════════════════════
  // 10. 감사 로그 (샘플)
  // ══════════════════════════════════════════════════
  const auditLogs = [
    { entityType: "LICENSE", entityId: licenses["Microsoft 365 Business"].id, action: "CREATE", actor: "admin", details: "Microsoft 365 Business 라이선스 등록", createdAt: daysAgo(180) },
    { entityType: "LICENSE", entityId: licenses["Slack Pro"].id, action: "CREATE", actor: "admin", details: "Slack Pro 라이선스 등록", createdAt: daysAgo(150) },
    { entityType: "EMPLOYEE", entityId: employees["김민수"].id, action: "CREATE", actor: "admin", details: "조직원 김민수 등록", createdAt: daysAgo(200) },
    { entityType: "ASSIGNMENT", entityId: 1, action: "ASSIGN", actor: "admin", details: "김민수에게 Microsoft 365 할당", createdAt: daysAgo(170) },
    { entityType: "LICENSE", entityId: licenses["Microsoft 365 Business"].id, action: "RENEW", actor: "admin", details: "Microsoft 365 갱신 완료", createdAt: daysAgo(30) },
    { entityType: "ASSET", entityId: assets["Web App Server (Prod)"]?.id ?? 1, action: "CREATE", actor: "admin", details: "프로덕션 웹 서버 등록", createdAt: daysAgo(120) },
    { entityType: "ASSET", entityId: assets["MBP-001 김민수"]?.id ?? 1, action: "ASSIGN", actor: "admin", details: "MacBook Pro를 김민수에게 배정", createdAt: daysAgo(100) },
    { entityType: "EMPLOYEE", entityId: employees["남기범"].id, action: "STATUS_CHANGE", actor: "admin", details: "남기범 상태 변경: ACTIVE → OFFBOARDING", createdAt: daysAgo(10) },
    { entityType: "ASSET", entityId: assets["폐기 예정 데스크탑"]?.id ?? 1, action: "STATUS_CHANGE", actor: "admin", details: "HP ProDesk 400 상태 변경: INACTIVE → PENDING_DISPOSAL", createdAt: daysAgo(15) },
    { entityType: "LICENSE", entityId: licenses["Figma Enterprise"].id, action: "RENEWAL_STATUS", actor: "admin", details: "Figma 갱신 상태: BEFORE_RENEWAL → IN_PROGRESS", createdAt: daysAgo(5) },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }
  console.log("✓ 감사 로그 10건 생성");

  // ══════════════════════════════════════════════════
  // 11. 환율 정보
  // ══════════════════════════════════════════════════
  const today = new Date().toISOString().slice(0, 10);
  const rates = [
    { date: today, currency: "USD", rateToKRW: 1350.50, source: "manual" },
    { date: today, currency: "EUR", rateToKRW: 1470.30, source: "manual" },
    { date: today, currency: "JPY", rateToKRW: 9.05, source: "manual" },
    { date: today, currency: "GBP", rateToKRW: 1710.80, source: "manual" },
    { date: today, currency: "CNY", rateToKRW: 186.40, source: "manual" },
  ];
  for (const r of rates) {
    await prisma.exchangeRate.upsert({
      where: { date_currency: { date: r.date, currency: r.currency } },
      update: { rateToKRW: r.rateToKRW },
      create: r,
    });
  }
  console.log("✓ 환율 정보 5개 생성");

  // ══════════════════════════════════════════════════
  // 12. 자산 간 연결 (AssetLink)
  // ══════════════════════════════════════════════════
  const assetLinks = [
    // 네트워크 흐름: ALB → Prod EC2
    { sourceName: "API Gateway (ALB)", targetName: "Web App Server (Prod)", linkType: "NETWORK", direction: "UNI", label: "HTTPS 트래픽 라우팅", protocol: "HTTPS" },
    // Prod EC2 → RDS
    { sourceName: "Web App Server (Prod)", targetName: "Main DB (PostgreSQL RDS)", linkType: "DATA_FLOW", direction: "UNI", label: "DB 쿼리", protocol: "TCP/5432", dataTypes: '["PII","LOG"]', piiItems: '["이름","이메일","전화번호"]' },
    // Prod EC2 → ElastiCache
    { sourceName: "Web App Server (Prod)", targetName: "Cache Server (ElastiCache)", linkType: "DATA_FLOW", direction: "BI", label: "세션/캐시", protocol: "TCP/6379" },
    // Prod EC2 → S3
    { sourceName: "Web App Server (Prod)", targetName: "Static Assets (S3)", linkType: "DATA_FLOW", direction: "UNI", label: "정적 파일 업로드", protocol: "HTTPS" },
    // Staging EC2 → RDS
    { sourceName: "Web App Server (Staging)", targetName: "Main DB (PostgreSQL RDS)", linkType: "DATA_FLOW", direction: "UNI", label: "Staging DB 접근", protocol: "TCP/5432" },
    // VPC에 포함
    { sourceName: "Production VPC", targetName: "Web App Server (Prod)", linkType: "NETWORK", direction: "UNI", label: "VPC 내부" },
    { sourceName: "Production VPC", targetName: "Main DB (PostgreSQL RDS)", linkType: "NETWORK", direction: "UNI", label: "VPC 내부" },
    // SG → EC2 (보안 의존)
    { sourceName: "Prod Security Group", targetName: "Web App Server (Prod)", linkType: "DEPENDENCY", direction: "UNI", label: "보안 그룹 적용" },
    { sourceName: "Prod Security Group", targetName: "Main DB (PostgreSQL RDS)", linkType: "DEPENDENCY", direction: "UNI", label: "보안 그룹 적용" },
    // 온프렘 서버 → 방화벽
    { sourceName: "Server-001 (On-Prem)", targetName: "FortiGate 60F", linkType: "NETWORK", direction: "BI", label: "방화벽 경유", protocol: "TCP" },
    // 스위치 → 서버
    { sourceName: "Cisco Switch C9200L", targetName: "Server-001 (On-Prem)", linkType: "NETWORK", direction: "BI", label: "내부 네트워크" },
    // 도메인 → ALB
    { sourceName: "techsol.co.kr", targetName: "API Gateway (ALB)", linkType: "NETWORK", direction: "UNI", label: "DNS 라우팅", protocol: "HTTPS" },
    // Datadog → Prod EC2 (모니터링)
    { sourceName: "Datadog Pro", targetName: "Web App Server (Prod)", linkType: "DEPENDENCY", direction: "UNI", label: "모니터링 에이전트" },
  ];

  let linkCount = 0;
  for (const link of assetLinks) {
    const src = assets[link.sourceName];
    const tgt = assets[link.targetName];
    if (!src || !tgt) continue;
    const exists = await prisma.assetLink.findFirst({
      where: { sourceAssetId: src.id, targetAssetId: tgt.id, linkType: link.linkType },
    });
    if (!exists) {
      await prisma.assetLink.create({
        data: {
          sourceAssetId: src.id, targetAssetId: tgt.id,
          linkType: link.linkType, direction: link.direction,
          label: link.label, protocol: link.protocol ?? null,
          dataTypes: link.dataTypes ?? null, piiItems: link.piiItems ?? null,
        },
      });
      linkCount++;
    }
  }
  console.log(`✓ 자산 간 연결 ${linkCount}건 생성`);

  // ══════════════════════════════════════════════════
  // 13. 자산-라이선스 연결 (AssetLicenseLink)
  // ══════════════════════════════════════════════════
  const alLinks = [
    // 노트북에 설치된 라이선스
    { asset: "MBP-001 김민수", license: "Microsoft 365 Business", note: "M365 데스크탑 앱 설치" },
    { asset: "MBP-001 김민수", license: "1Password Business", note: "1Password 데스크탑 앱" },
    { asset: "MBP-002 한도현", license: "JetBrains All Products Pack", note: "IntelliJ IDEA 설치" },
    { asset: "MBP-002 한도현", license: "GitHub Enterprise", note: "Git CLI 연동" },
    { asset: "MBP-003 윤서준", license: "JetBrains All Products Pack", note: "IntelliJ IDEA 설치" },
    { asset: "MBP-003 윤서준", license: "GitHub Enterprise", note: "Git CLI 연동" },
    { asset: "ThinkPad-001 배성민", license: "Figma Enterprise", note: "Figma 데스크탑 앱" },
    { asset: "ThinkPad-001 배성민", license: "JetBrains All Products Pack", note: "WebStorm 설치" },
    { asset: "ThinkPad-002 신재혁", license: "JetBrains All Products Pack", note: "IntelliJ IDEA 설치" },
    { asset: "ThinkPad-002 신재혁", license: "1Password Business", note: "1Password 데스크탑 앱" },
    // 데스크탑
    { asset: "Dell-DT-001 이서연", license: "Microsoft 365 Business", note: "M365 데스크탑 앱 설치" },
    { asset: "Dell-DT-001 이서연", license: "Windows 11 Pro", note: "OS 라이선스" },
    { asset: "Dell-DT-002 최유진", license: "Microsoft 365 Business", note: "M365 데스크탑 앱 설치" },
    { asset: "Dell-DT-002 최유진", license: "Windows 11 Pro", note: "OS 라이선스" },
    // 서버에 설치된 SW
    { asset: "Server-001 (On-Prem)", license: "GitHub Enterprise", note: "Self-hosted runner" },
    // 클라우드 서비스에 연결된 라이선스
    { asset: "Web App Server (Prod)", license: "GitHub Enterprise", note: "CI/CD 배포 대상" },
    { asset: "Datadog Pro", license: "Slack Pro", note: "알림 연동 (Slack webhook)" },
    { asset: "Google Workspace Business", license: "Notion Team", note: "SSO 연동" },
  ];

  let alCount = 0;
  for (const al of alLinks) {
    const a = assets[al.asset];
    const l = licenses[al.license];
    if (!a || !l) continue;
    const exists = await prisma.assetLicenseLink.findFirst({
      where: { assetId: a.id, licenseId: l.id },
    });
    if (!exists) {
      await prisma.assetLicenseLink.create({
        data: { assetId: a.id, licenseId: l.id, note: al.note },
      });
      alCount++;
    }
  }
  console.log(`✓ 자산-라이선스 연결 ${alCount}건 생성`);

  // ══════════════════════════════════════════════════
  // 14. 외부 엔티티 + 외부 연결
  // ══════════════════════════════════════════════════
  const externals = [
    { name: "AWS Korea", type: "PARTNER", description: "클라우드 인프라 공급사" },
    { name: "안랩 SOC", type: "PARTNER", description: "보안관제 센터" },
    { name: "금융감독원", type: "GOVERNMENT", description: "금융 규제 기관" },
  ];

  const extEntities: Record<string, { id: number }> = {};
  for (const ext of externals) {
    const existing = await prisma.externalEntity.findFirst({ where: { name: ext.name } });
    if (existing) { extEntities[ext.name] = existing; continue; }
    const created = await prisma.externalEntity.create({ data: ext });
    extEntities[ext.name] = created;
  }

  // 외부 → 자산 연결
  const extLinks = [
    { extName: "AWS Korea", assetName: "Production VPC", linkType: "DEPENDENCY", label: "클라우드 인프라 제공", direction: "UNI" },
    { extName: "안랩 SOC", assetName: "FortiGate 60F", linkType: "NETWORK", label: "보안 로그 전송", direction: "UNI" },
  ];

  let extLinkCount = 0;
  for (const el of extLinks) {
    const ext = extEntities[el.extName];
    const asset = assets[el.assetName];
    if (!ext || !asset) continue;
    const exists = await prisma.assetLink.findFirst({
      where: { sourceExternalId: ext.id, targetAssetId: asset.id, linkType: el.linkType },
    });
    if (!exists) {
      await prisma.assetLink.create({
        data: { sourceExternalId: ext.id, targetAssetId: asset.id, linkType: el.linkType, label: el.label, direction: el.direction },
      });
      extLinkCount++;
    }
  }
  console.log(`✓ 외부 엔티티 ${Object.keys(extEntities).length}개 + 연결 ${extLinkCount}건 생성`);

  console.log("\n🎉 시연용 더미 데이터 시드 완료!");
  console.log("   - 회사 2개, 조직 12개, 조직원 30명");
  console.log("   - 라이선스 12개, 할당 100+건");
  console.log("   - 클라우드 10개, 하드웨어 15개, 도메인·SSL 5개, 계약 5개");
  console.log("   - 라이선스 그룹 3개, 감사 로그 10건, 환율 5개");
  console.log("   - 자산 간 연결 13건, 자산-라이선스 연결 18건, 외부 엔티티 3개");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
