// backfill-license-renewal.mjs — 만료일/갱신일 분리 데이터 보정 (dev-028)
//
// 구버전 신규-라이선스 폼은 자동 계산된 "갱신일"을 expiryDate 에 잘못 저장했다.
// 이 스크립트는 그렇게 잘못 들어간 레코드만 골라 renewalDate 로 이전하고 expiryDate 를 비운다.
//
// 대상 조건(보수적 — 자동계산 값과 정확히 일치하는 것만):
//   renewalDate IS NULL                       (아직 갱신일 미설정)
//   AND expiryDate IS NOT NULL
//   AND paymentCycle IS NOT NULL
//   AND expiryDate == purchaseDate + 1주기     (= 폼이 자동 채운 값)
// 관리자가 직접 넣은 실제 종료일(자동계산과 다른 값)은 건드리지 않는다.
//
// 멱등: 이전 후 renewalDate 가 채워지므로 재실행해도 0건.
// 사용: DATABASE_URL=<prod> node scripts/backfill-license-renewal.mjs

import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  // License 테이블 없으면(최초 설치) 안전 스킵
  const exists = await client.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'License'
  `);
  if (exists.rowCount === 0) {
    console.log("[backfill-license-renewal] License 테이블 없음 — 스킵");
    process.exit(0);
  }

  const result = await client.query(`
    UPDATE "License"
    SET "renewalDate" = "expiryDate",
        "expiryDate" = NULL
    WHERE "renewalDate" IS NULL
      AND "expiryDate" IS NOT NULL
      AND "paymentCycle" IS NOT NULL
      AND (
        ("paymentCycle" = 'MONTHLY' AND date("expiryDate") = date("purchaseDate" + interval '1 month'))
        OR ("paymentCycle" = 'YEARLY' AND date("expiryDate") = date("purchaseDate" + interval '1 year'))
      )
  `);

  console.log(`[backfill-license-renewal] 보정 완료: ${result.rowCount}건 (expiryDate→renewalDate 이전)`);
} catch (err) {
  console.error("[backfill-license-renewal] 오류 (앱 시작에 영향 없음):", err.message);
  process.exit(0); // 배포 흐름을 막지 않도록 비-치명 처리
} finally {
  await client.end().catch(() => {});
}
