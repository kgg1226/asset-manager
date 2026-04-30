#!/usr/bin/env bash
# deploy.sh — 로컬(macOS)에서 실행하는 배포 트리거 스크립트
# 원본: deploy.ps1 (PowerShell, Windows)
#
# 흐름:
#   [1/3] Git 동기화 (commit → fetch → pull → push)
#   [2/3] git archive로 zip 생성 → S3 업로드
#   [3/3] deploy-remote.sh를 S3 업로드 → SSM 세션 진입
#         (세션 안에서 사용자가 클립보드에 복사된 명령어 붙여넣기)

set -euo pipefail

# ── [설정 구간] ────────────────────────────────────────────────
# 자신의 환경에 맞게 수정하세요.
PROFILE_NAME="hyeongunk"
REGION="ap-northeast-2"
S3_BUCKET="s3://triplecomma-releases/triplecomma-backoffice"
ZIP_NAME="asset-manager.zip"
EC2_ID="i-03b9c1979ef4a2142"
REMOTE_DIR="/home/ssm-user/app"
APP_NAME="asset-manager"
# ────────────────────────────────────────────────────────────────

# ── 색상 코드 ──
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
CYAN=$'\033[0;36m'
GRAY=$'\033[0;90m'
NC=$'\033[0m'

# ── 유틸리티 함수 ──
log()     { echo "[$(date +%H:%M:%S)] $*"; }
success() { echo "${GREEN}[$(date +%H:%M:%S)] $*${NC}"; }
warn()    { echo "${YELLOW}[$(date +%H:%M:%S)] $*${NC}"; }
fail()    { echo "${RED}[$(date +%H:%M:%S)] $*${NC}"; }

# 클립보드 복사 (macOS 기본은 pbcopy)
copy_to_clipboard() {
    if command -v pbcopy >/dev/null 2>&1; then
        printf "%s" "$1" | pbcopy
        return 0
    fi
    return 1
}

# ============================================================
# [1/3] Git Push
# ============================================================
log "=== [1/3] Git 작업 시작 ==="

# Git lock 파일 처리
LOCK_FILE="$(pwd)/.git/index.lock"
if [ -f "$LOCK_FILE" ]; then
    warn "Git Lock 파일 감지 — 제거 시도..."
    if ! rm -f "$LOCK_FILE"; then
        fail "Lock 파일 제거 실패. VS Code 등 다른 Git 프로그램을 종료하세요."
        exit 1
    fi
fi

# 변경사항 감지
if [ -n "$(git status --porcelain)" ]; then
    log "변경사항 감지. 커밋을 진행합니다."
    git add -A
    read -r -p "커밋 메시지 입력 (엔터 시 'deploy'): " COMMIT_MSG
    if [ -z "${COMMIT_MSG// }" ]; then
        COMMIT_MSG="deploy"
    fi
    git commit -m "$COMMIT_MSG"
else
    warn "커밋할 변경사항 없음."
fi

# master 브랜치 확인
CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "master" ]; then
    fail "현재 브랜치가 '$CURRENT_BRANCH'입니다. master 브랜치에서 실행하세요: git checkout master"
    exit 1
fi

git fetch origin master
git pull origin master
git push origin master
success "Git 동기화 완료"

# ============================================================
# [2/3] S3 업로드 (소스 패키지)
# ============================================================
log "=== [2/3] S3 업로드 준비 ==="

# macOS의 임시 디렉토리 활용
ZIP_PATH="${TMPDIR:-/tmp}/${ZIP_NAME}"
[ -f "$ZIP_PATH" ] && rm -f "$ZIP_PATH"

log "압축 파일 생성 중 (git archive)..."
git archive --format=zip HEAD -o "$ZIP_PATH"

log "S3 업로드 중..."
aws s3 cp "$ZIP_PATH" "${S3_BUCKET}/${ZIP_NAME}" \
    --profile "$PROFILE_NAME" \
    --region "$REGION"

rm -f "$ZIP_PATH"
success "S3 업로드 완료: ${S3_BUCKET}/${ZIP_NAME}"

# ============================================================
# [3/3] EC2 배포 (SSM Session Manager)
#   ※ SSM RunCommand(SendCommand)는 AWSManagementConsoleACL 정책의
#     aws:ViaAWSService 조건에 의해 차단되므로, Session Manager를 사용
# ============================================================
log "=== [3/3] EC2 배포 준비 ==="

# deploy-remote.sh 존재 확인
DEPLOY_SCRIPT_PATH="$(pwd)/deploy-remote.sh"
if [ ! -f "$DEPLOY_SCRIPT_PATH" ]; then
    fail "deploy-remote.sh 파일이 없습니다. 프로젝트 루트에 deploy-remote.sh가 필요합니다."
    exit 1
fi

log "deploy-remote.sh S3 업로드 중..."
aws s3 cp "$DEPLOY_SCRIPT_PATH" "${S3_BUCKET}/deploy-remote.sh" \
    --profile "$PROFILE_NAME" \
    --region "$REGION"
success "배포 스크립트 업로드 완료"

# 배포 명령어 생성 + 클립보드 복사
DEPLOY_CMD="cd ${REMOTE_DIR} && aws s3 cp ${S3_BUCKET}/deploy-remote.sh . && sed -i 's/\r\$//' deploy-remote.sh && chmod +x deploy-remote.sh && bash deploy-remote.sh"

if copy_to_clipboard "$DEPLOY_CMD"; then
    success "배포 명령어가 클립보드에 복사되었습니다!"
else
    warn "클립보드 복사 실패 (pbcopy 미설치) — 아래 명령어를 수동 복사하세요"
fi

echo ""
echo "${CYAN}============================================================${NC}"
echo "${CYAN}  SSM 세션이 열리면 아래 명령어를 붙여넣기(Cmd+V) 하세요:${NC}"
echo "${CYAN}============================================================${NC}"
echo ""
echo "  ${YELLOW}${DEPLOY_CMD}${NC}"
echo ""
echo "  ${GRAY}(이미 클립보드에 복사됨 — Cmd+V로 붙여넣기)${NC}"
echo ""
echo "${CYAN}============================================================${NC}"
echo ""

# SSM 세션 시작 (대화형)
# set -e가 켜져 있어도 사용자가 exit로 정상 종료 시 0이 반환되므로 문제 없음.
# 비정상 종료 시 후속 메시지 출력을 위해 || true 처리.
log "SSM 세션 연결 중..."
aws ssm start-session \
    --target "$EC2_ID" \
    --profile "$PROFILE_NAME" \
    --region "$REGION" || true

echo ""
success "SSM 세션 종료"
echo ""
echo "  ${CYAN}확인: http://<EC2_PUBLIC_IP>:8080${NC}"
echo "  ${GRAY}재접속: aws ssm start-session --target ${EC2_ID} --region ${REGION} --profile ${PROFILE_NAME}${NC}"
echo ""
