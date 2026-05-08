-- Add isSuperAdmin Boolean column to User.
-- Role(ADMIN/USER) 은 그대로 두고 그 위에 SUPER_ADMIN 권한 계층을 추가.
-- SUPER_ADMIN 은 시스템 설정 / 사용자 권한 변경 / 내용연수·재무 정보 노출 등 민감 영역 제어.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
