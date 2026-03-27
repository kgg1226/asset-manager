-- 중복 assetTag 정리: unique 제약 추가 전 중복 값을 NULL로 변경
-- 동일 assetTag 중 MIN(id) 레코드만 보존, 나머지는 NULL 처리
-- 테이블이 없으면(최초 설치) 안전하게 스킵
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'HardwareDetail'
  ) THEN
    UPDATE "HardwareDetail"
    SET "assetTag" = NULL
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM "HardwareDetail"
      WHERE "assetTag" IS NOT NULL
      GROUP BY "assetTag"
    )
    AND "assetTag" IS NOT NULL;

    RAISE NOTICE 'dedup-asset-tag: 완료 (중복 assetTag → NULL 처리)';
  ELSE
    RAISE NOTICE 'dedup-asset-tag: HardwareDetail 테이블 없음 (스킵)';
  END IF;
END $$;
