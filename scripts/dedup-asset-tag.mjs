// dedup-asset-tag.mjs — unique 제약 적용 전 중복 assetTag 정리
// prisma db execute 대신 pg 드라이버 직접 사용 (경로·버전 무관하게 안정적)
// 테이블이 없으면(최초 설치) 안전하게 스킵

import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const result = await client.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'HardwareDetail'
      ) THEN
        UPDATE "HardwareDetail" SET "assetTag" = NULL
        WHERE id NOT IN (
          SELECT MIN(id) FROM "HardwareDetail"
          WHERE "assetTag" IS NOT NULL
          GROUP BY "assetTag"
        ) AND "assetTag" IS NOT NULL;
      END IF;
    END $$;
  `);
  console.log("[dedup-asset-tag] 완료");
} catch (e) {
  console.log("[dedup-asset-tag] 스킵:", e.message);
} finally {
  await client.end();
}
