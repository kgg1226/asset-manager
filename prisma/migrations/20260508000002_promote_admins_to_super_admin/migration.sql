-- Seed initial SUPER_ADMIN: 가장 먼저 생성된(=가장 작은 id) ADMIN 사용자를 SUPER_ADMIN 으로 승격.
-- 운영 환경에서는 보통 admin/admin 계정이 첫 ADMIN. 다른 ADMIN 들에게도 부여하려면 별도 SQL 실행.
-- (UI 에서 SUPER_ADMIN 만 다른 사용자를 SUPER_ADMIN 으로 승격할 수 있도록 후속 작업 예정)

UPDATE "User"
SET "isSuperAdmin" = true
WHERE "id" = (
  SELECT "id" FROM "User"
  WHERE "role" = 'ADMIN' AND "isActive" = true
  ORDER BY "id" ASC
  LIMIT 1
);
