#!/bin/sh
set -e

# ── [1/3] DB 스키마 동기화 ──────────────────────────────────────────
# prisma db push: 테이블 없으면 생성, 새 필드 추가, 삭제된 필드 제거
# Prisma v7: --skip-generate 플래그 제거됨 (db push가 자동 generate 하지 않음)

# [1-0] unique 제약 적용 전 중복 assetTag 정리 (idempotent — 중복 없으면 0건 업데이트)
echo "[entrypoint] 중복 assetTag 정리 중..."
DEDUP_SQL="DO \$\$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='HardwareDetail') THEN UPDATE \"HardwareDetail\" SET \"assetTag\"=NULL WHERE id NOT IN (SELECT MIN(id) FROM \"HardwareDetail\" WHERE \"assetTag\" IS NOT NULL GROUP BY \"assetTag\") AND \"assetTag\" IS NOT NULL; END IF; END \$\$;"
if [ -f ./scripts/dedup-asset-tag.sql ]; then
    npx prisma db execute --file ./scripts/dedup-asset-tag.sql 2>&1 \
      && echo "[entrypoint] 중복 assetTag 정리 완료 (파일)" \
      || echo "[entrypoint] 중복 assetTag 정리 스킵 (오류 무시)"
else
    echo "$DEDUP_SQL" | npx prisma db execute --stdin 2>&1 \
      && echo "[entrypoint] 중복 assetTag 정리 완료 (inline)" \
      || echo "[entrypoint] 중복 assetTag 정리 스킵 (오류 무시)"
fi

echo "[entrypoint] DB 스키마 동기화 중..."

if npx prisma db push 2>&1; then
    echo "[entrypoint] 스키마 동기화 완료"
else
    echo "[entrypoint] 스키마 변경 감지 (필드 삭제 등) — 변경분만 적용 중..."
    npx prisma db push --accept-data-loss
    echo "[entrypoint] 스키마 동기화 완료 (필드 변경 포함)"
fi

# ── [2/3] 초기 데이터 확인 ──────────────────────────────────────────
# User 테이블이 비어있으면 관리자 계정 자동 생성
# 데이터가 이미 있으면 아무것도 하지 않음
echo "[entrypoint] 초기 데이터 확인 중..."
node scripts/init-db.mjs || echo "[entrypoint] init-db 스킵 (앱 시작에 영향 없음)"

# ── [3/3] 앱 시작 ──────────────────────────────────────────────────
echo "[entrypoint] 앱 시작..."
exec npm start
