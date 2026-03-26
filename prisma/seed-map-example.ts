import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (process.env.NODE_ENV === "production") {
  console.error("❌  프로덕션에서 실행 불가");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🗺️  자산 지도 예시 데이터 생성 시작...\n");

  // ── 1. 외부 조직 생성 ──
  const externals = [
    { name: "AWS", type: "PARTNER", description: "클라우드 인프라 공급자" },
    { name: "가비아", type: "PARTNER", description: "도메인 등록·관리 업체" },
    { name: "개인정보보호위원회", type: "GOVERNMENT", description: "개인정보 감독 기관" },
    { name: "스마트인프라", type: "TRUSTEE", description: "서버 유지보수 수탁사" },
    { name: "시큐어솔루션", type: "TRUSTEE", description: "보안 컨설팅 수탁사" },
  ];

  const extMap: Record<string, number> = {};
  for (const ext of externals) {
    const existing = await prisma.externalEntity.findFirst({ where: { name: ext.name } });
    if (existing) {
      extMap[ext.name] = existing.id;
    } else {
      const created = await prisma.externalEntity.create({ data: ext });
      extMap[ext.name] = created.id;
    }
  }
  console.log(`✓ 외부 조직 ${externals.length}개`);

  // ── 2. 자산 ID 매핑 ──
  const assets = await prisma.asset.findMany({ select: { id: true, name: true, type: true } });
  const a = (name: string) => {
    const asset = assets.find((x) => x.name.includes(name));
    if (!asset) throw new Error(`Asset not found: ${name}`);
    return asset.id;
  };

  // ── 3. 기존 링크 삭제 (초기화) ──
  await prisma.assetLink.deleteMany({});
  console.log("✓ 기존 링크 초기화");

  // ── 4. 연결 생성 ──
  // 구조:
  // [사용자] → MacBook/Dell → VPC → EC2(웹서버) → RDS(DB)
  //                                  ↓             ↑
  //                            CloudFront ← S3    Route53 → 도메인
  //                                  ↓
  //                              [인터넷 사용자]
  //
  // 개인정보 흐름: 사용자 → 웹서버 → DB → S3(백업) → 스마트인프라(위탁)
  // 네트워크: VPC → EC2, RDS, S3 / 스위치 → 서버 → MacBook
  // 데이터 흐름: EC2 → Datadog / EC2 → S3 / RDS → S3

  const links = [
    // ── 네트워크 연결 (NETWORK) ──
    // 물리 네트워크
    { src: a("Cisco"), tgt: a("PowerEdge"), type: "NETWORK", dir: "BI", label: "서버↔스위치", protocol: "Ethernet", srcH: "right", tgtH: "left" },
    { src: a("Cisco"), tgt: a("MacBook Pro 16"), type: "NETWORK", dir: "BI", label: "개발자↔스위치", protocol: "Ethernet", srcH: "top", tgtH: "bottom" },
    { src: a("Cisco"), tgt: a("MacBook Pro 14"), type: "NETWORK", dir: "BI", label: "개발자↔스위치", protocol: "Ethernet", srcH: "top", tgtH: "bottom" },
    { src: a("Cisco"), tgt: a("Dell Latitude"), type: "NETWORK", dir: "BI", label: "관리자↔스위치", protocol: "Ethernet", srcH: "bottom", tgtH: "top" },
    // 클라우드 네트워크
    { src: a("VPC"), tgt: a("EC2"), type: "NETWORK", dir: "UNI", label: "VPC→EC2", protocol: "TCP/IP", srcH: "right", tgtH: "left" },
    { src: a("VPC"), tgt: a("RDS"), type: "NETWORK", dir: "UNI", label: "VPC→RDS", protocol: "TCP/IP", srcH: "right", tgtH: "left" },
    { src: a("VPC"), tgt: a("S3"), type: "NETWORK", dir: "UNI", label: "VPC→S3", protocol: "HTTPS", srcH: "bottom", tgtH: "top" },
    { src: a("Route53"), tgt: a("CloudFront"), type: "NETWORK", dir: "UNI", label: "DNS→CDN", protocol: "DNS", srcH: "right", tgtH: "left" },
    { src: a("CloudFront"), tgt: a("EC2"), type: "NETWORK", dir: "UNI", label: "CDN→웹서버", protocol: "HTTPS", srcH: "right", tgtH: "top" },

    // ── 데이터 흐름 (DATA_FLOW) ──
    // 웹 트래픽 흐름
    { src: a("EC2"), tgt: a("RDS"), type: "DATA_FLOW", dir: "BI", label: "웹↔DB 쿼리", protocol: "PostgreSQL", dataTypes: '["LOG","CREDENTIAL"]', srcH: "right", tgtH: "left" },
    { src: a("EC2"), tgt: a("S3"), type: "DATA_FLOW", dir: "UNI", label: "정적 파일 저장", protocol: "S3 API", dataTypes: '["LOG"]', srcH: "bottom", tgtH: "top" },
    { src: a("EC2"), tgt: a("Datadog"), type: "DATA_FLOW", dir: "UNI", label: "모니터링 메트릭", protocol: "HTTPS", dataTypes: '["LOG"]', srcH: "right", tgtH: "left" },
    { src: a("RDS"), tgt: a("S3"), type: "DATA_FLOW", dir: "UNI", label: "DB 백업", protocol: "S3 API", dataTypes: '["PII","LOG"]', srcH: "bottom", tgtH: "left" },
    { src: a("Google Workspace"), tgt: a("EC2"), type: "DATA_FLOW", dir: "UNI", label: "OAuth 인증", protocol: "HTTPS", dataTypes: '["CREDENTIAL"]', srcH: "right", tgtH: "left" },

    // ── 개인정보 흐름 (DATA_FLOW + PII) ──
    { src: a("CloudFront"), tgt: a("EC2"), type: "DATA_FLOW", dir: "UNI", label: "사용자 요청", protocol: "HTTPS",
      dataTypes: '["PII"]', piiItems: "이름,이메일,전화번호", legalBasis: "동의", retentionPeriod: "5년", srcH: "right", tgtH: "top" },
    { src: a("EC2"), tgt: a("RDS"), type: "DATA_FLOW", dir: "UNI", label: "개인정보 저장", protocol: "PostgreSQL",
      dataTypes: '["PII"]', piiItems: "이름,이메일,전화번호,주소", legalBasis: "동의", retentionPeriod: "5년", destructionMethod: "DB DELETE", srcH: "right", tgtH: "left" },

    // ── 의존성 (DEPENDENCY) ──
    { src: a("test-company.com"), tgt: a("Route53"), type: "DEPENDENCY", dir: "UNI", label: "DNS 호스팅", srcH: "right", tgtH: "left" },
    { src: a("test-company.co.kr"), tgt: a("Route53"), type: "DEPENDENCY", dir: "UNI", label: "DNS 호스팅", srcH: "right", tgtH: "left" },
    { src: a("api.test-company.com"), tgt: a("EC2"), type: "DEPENDENCY", dir: "UNI", label: "API 서비스", srcH: "right", tgtH: "top" },
    { src: a("admin.test-company.com"), tgt: a("EC2"), type: "DEPENDENCY", dir: "UNI", label: "관리자 패널", srcH: "right", tgtH: "top" },
    { src: a("서버 유지보수"), tgt: a("PowerEdge"), type: "DEPENDENCY", dir: "UNI", label: "유지보수 대상", srcH: "right", tgtH: "bottom" },
    { src: a("네트워크 장비"), tgt: a("Cisco"), type: "DEPENDENCY", dir: "UNI", label: "유지보수 대상", srcH: "right", tgtH: "bottom" },
    { src: a("IDC 코로케이션"), tgt: a("PowerEdge"), type: "DEPENDENCY", dir: "UNI", label: "호스팅 장소", srcH: "right", tgtH: "bottom" },

    // ── 인증 (AUTH) ──
    { src: a("Google Workspace"), tgt: a("MacBook Pro 16"), type: "AUTH", dir: "UNI", label: "SSO 인증", protocol: "OAuth 2.0", srcH: "bottom", tgtH: "right" },
    { src: a("Google Workspace"), tgt: a("MacBook Pro 14"), type: "AUTH", dir: "UNI", label: "SSO 인증", protocol: "OAuth 2.0", srcH: "bottom", tgtH: "right" },

    // ── 외부 조직 연결 ──
    // AWS ↔ 클라우드 자산
    { srcExt: extMap["AWS"], tgt: a("EC2"), type: "NETWORK", dir: "UNI", label: "AWS 인프라", protocol: "AWS API", srcH: "right", tgtH: "left" },
    { srcExt: extMap["AWS"], tgt: a("RDS"), type: "NETWORK", dir: "UNI", label: "AWS 인프라", protocol: "AWS API", srcH: "right", tgtH: "left" },
    // 가비아 → 도메인
    { srcExt: extMap["가비아"], tgt: a("test-company.com"), type: "DEPENDENCY", dir: "UNI", label: "도메인 등록", srcH: "right", tgtH: "left" },
    { srcExt: extMap["가비아"], tgt: a("test-company.co.kr"), type: "DEPENDENCY", dir: "UNI", label: "도메인 등록", srcH: "right", tgtH: "left" },
    // 수탁사 개인정보
    { src: a("RDS"), tgtExt: extMap["스마트인프라"], type: "DATA_FLOW", dir: "UNI", label: "DB 유지보수 위탁",
      dataTypes: '["PII"]', piiItems: "이름,이메일", legalBasis: "위탁계약", retentionPeriod: "계약기간", destructionMethod: "계약종료 후 파기", srcH: "right", tgtH: "left" },
    { src: a("EC2"), tgtExt: extMap["시큐어솔루션"], type: "DATA_FLOW", dir: "UNI", label: "보안 점검 접근",
      dataTypes: '["LOG"]', legalBasis: "위탁계약", srcH: "bottom", tgtH: "left" },
    // 개인정보보호위원회
    { src: a("RDS"), tgtExt: extMap["개인정보보호위원회"], type: "DATA_FLOW", dir: "UNI", label: "개인정보 현황 보고",
      dataTypes: '["PII"]', piiItems: "통계 데이터", legalBasis: "법적 의무", retentionPeriod: "보고 후 파기", srcH: "bottom", tgtH: "left" },
  ];

  for (const link of links) {
    await prisma.assetLink.create({
      data: {
        sourceAssetId: link.src ?? null,
        targetAssetId: link.tgt ?? null,
        sourceExternalId: link.srcExt ?? null,
        targetExternalId: link.tgtExt ?? null,
        linkType: link.type,
        direction: link.dir,
        label: link.label,
        protocol: link.protocol ?? null,
        dataTypes: link.dataTypes ?? null,
        piiItems: link.piiItems ?? null,
        legalBasis: link.legalBasis ?? null,
        retentionPeriod: link.retentionPeriod ?? null,
        destructionMethod: link.destructionMethod ?? null,
        sourceHandle: link.srcH,
        targetHandle: link.tgtH,
      },
    });
  }
  console.log(`✓ 연결 ${links.length}개 생성`);

  // ── 5. 워크스페이스에 노드 위치 설정 ──
  const view = await prisma.assetMapView.findFirst({ where: { name: { contains: "예시" } } });
  if (!view) {
    console.log("⚠️  예시 워크스페이스를 찾을 수 없음");
    return;
  }

  // 깔끔한 인프라 구성도 레이아웃
  const nodePositions: Record<string, { x: number; y: number }> = {
    // ── 왼쪽: 사용자 장비 (하드웨어) ──
    [String(a("MacBook Pro 16"))]:   { x: 0, y: 0 },
    [String(a("MacBook Pro 14"))]:   { x: 0, y: 180 },
    [String(a("Dell Latitude"))]:    { x: 0, y: 360 },
    [String(a("Dell OptiPlex"))]:    { x: 0, y: 540 },
    [String(a("iPhone"))]:           { x: 0, y: 720 },
    [String(a("모니터"))]:            { x: 250, y: 0 },

    // ── 중앙 하단: 물리 인프라 ──
    [String(a("Cisco"))]:            { x: 320, y: 360 },
    [String(a("PowerEdge"))]:        { x: 600, y: 360 },

    // ── 중앙: 클라우드 인프라 ──
    [String(a("VPC"))]:              { x: 600, y: 0 },
    [String(a("EC2"))]:              { x: 900, y: 0 },
    [String(a("RDS"))]:              { x: 1200, y: 0 },
    [String(a("S3"))]:               { x: 1200, y: 200 },
    [String(a("CloudFront"))]:       { x: 900, y: -200 },
    [String(a("Route53"))]:          { x: 600, y: -200 },
    [String(a("Datadog"))]:          { x: 1200, y: -200 },
    [String(a("Google Workspace"))]: { x: 600, y: 180 },

    // ── 오른쪽 상단: 도메인·SSL ──
    [String(a("test-company.com"))]:       { x: 300, y: -200 },
    [String(a("test-company.co.kr"))]:     { x: 300, y: -380 },
    [String(a("api.test-company.com"))]:   { x: 600, y: -380 },
    [String(a("admin.test-company.com"))]: { x: 900, y: -380 },

    // ── 하단: 계약 ──
    [String(a("서버 유지보수"))]:    { x: 600, y: 560 },
    [String(a("보안 컨설팅"))]:      { x: 900, y: 560 },
    [String(a("IDC 코로케이션"))]:   { x: 600, y: 740 },
    [String(a("네트워크 장비"))]:    { x: 320, y: 560 },

    // ── 외부 조직 ──
    [`ext-${extMap["AWS"]}`]:                 { x: 1500, y: 0 },
    [`ext-${extMap["가비아"]}`]:               { x: 0, y: -300 },
    [`ext-${extMap["스마트인프라"]}`]:          { x: 1500, y: 200 },
    [`ext-${extMap["시큐어솔루션"]}`]:          { x: 1500, y: 400 },
    [`ext-${extMap["개인정보보호위원회"]}`]:     { x: 1500, y: 600 },
  };

  await prisma.assetMapView.update({
    where: { id: view.id },
    data: {
      nodePositions: JSON.stringify(nodePositions),
      viewport: JSON.stringify({ x: 200, y: 400, zoom: 0.6 }),
    },
  });
  console.log(`✓ 워크스페이스 '${view.name}' 노드 위치 설정 (${Object.keys(nodePositions).length}개 노드)`);

  console.log("\n🎉 자산 지도 예시 데이터 생성 완료!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
