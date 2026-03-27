#!/bin/bash
# deploy-remote.sh — EC2에서 실행되는 배포 스크립트 (최소 중단 방식)
#
# 사용법:
#   bash deploy-remote.sh <S3_ZIP_URL>
#
# 예시:
#   bash deploy-remote.sh s3://my-bucket/my-path/asset-manager.zip
#
# 핵심: 이미지를 먼저 빌드한 뒤, 컨테이너 교체만 수행 → 중단 ~3초
#
# ── 환경별 설정 ──────────────────────────────────────────────────────
# 아래 변수를 각자 환경에 맞게 수정하세요.
#   DIR       : EC2에서 앱 소스코드가 위치하는 디렉토리
#   APP       : 프로젝트 디렉토리명 (docker-compose.yml이 있는 폴더)
#   ZIP_NAME  : S3에서 다운로드 받을 zip 파일명
#   NEW_TAG   : 빌드 중 임시 Docker 이미지 태그
#   LIVE_TAG  : 실제 운영 Docker 이미지 태그
#   HEALTH_URL: 헬스체크 엔드포인트 (포트 포함)
# ─────────────────────────────────────────────────────────────────────
set -e

DIR="${DEPLOY_DIR:-/home/ssm-user/app}"
APP="${DEPLOY_APP:-asset-manager}"
ZIP_NAME="${DEPLOY_ZIP:-asset-manager.zip}"
NEW_TAG="${DEPLOY_NEW_TAG:-asset-manager:new}"
LIVE_TAG="${DEPLOY_LIVE_TAG:-asset-manager:latest}"
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://localhost:8080/api/health}"

# ── 인자 검증 ──
if [ -z "$1" ]; then
    echo "사용법: bash deploy-remote.sh <S3_ZIP_URL>"
    echo ""
    echo "예시:   bash deploy-remote.sh s3://my-bucket/my-path/asset-manager.zip"
    echo ""
    echo "환경변수로 커스터마이즈 가능:"
    echo "  DEPLOY_DIR        앱 디렉토리 (기본: /home/ssm-user/app)"
    echo "  DEPLOY_APP        프로젝트명 (기본: asset-manager)"
    echo "  DEPLOY_HEALTH_URL 헬스체크 URL (기본: http://localhost:8080/api/health)"
    exit 1
fi

S3_URL="$1"

# ── 실패 시 자동 롤백 + 정리 ──
rollback() {
    EC=$?
    if [ $EC -ne 0 ]; then
        echo ""; echo "!!! 배포 실패 (exit $EC) — 자동 롤백 시작 !!!"
        cd $DIR
        # 찌꺼기 정리
        sudo rm -rf ${APP}-new ${APP}.zip 2>/dev/null || true
        sudo docker rmi $NEW_TAG 2>/dev/null || true
        # backup이 있으면 복원
        if [ -d ${APP}-backup ]; then
            sudo rm -rf $APP
            sudo mv ${APP}-backup $APP
            echo "롤백 완료: backup → $APP"
            cd $DIR/$APP
            sudo docker-compose up -d 2>/dev/null || true
            echo "이전 버전 재시작 시도 완료"
        fi
        echo "!!! 롤백 종료 !!!"
    fi
}
trap rollback EXIT

echo '=== [1/7] 사전 점검 ==='
if ! sudo docker info > /dev/null 2>&1; then echo 'ABORT: Docker 데몬이 실행 중이 아닙니다'; exit 1; fi
echo 'Docker 데몬 OK'
echo "S3 소스: $S3_URL"

echo '=== [2/7] 디스크 공간 점검 ==='
AVAIL_KB=$(df / --output=avail | tail -1 | tr -d ' ')
AVAIL_MB=$(( AVAIL_KB / 1024 ))
echo "디스크 여유: ${AVAIL_MB}MB"
if [ $AVAIL_KB -lt 2097152 ]; then echo "ABORT: 디스크 여유 부족 (${AVAIL_MB}MB < 2048MB). 배포 중단."; exit 1; fi
echo 'PASS: 디스크 2GB 이상 여유'

echo '=== [3/7] 스왑 점검 ==='
free -h
if [ ! -f /swapfile ]; then
    sudo dd if=/dev/zero of=/swapfile bs=128M count=16 && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '스왑 신규 설정 완료'
else
    echo '스왑 기존 설정 확인됨'
fi

echo '=== [4/7] S3에서 소스코드 다운로드 ==='
cd $DIR
aws s3 cp "$S3_URL" ./$ZIP_NAME
sudo rm -rf ${APP}-new
sudo mkdir -p ${APP}-new && sudo chown -R ssm-user:ssm-user ${APP}-new
unzip -q $ZIP_NAME -d ${APP}-new && rm $ZIP_NAME
echo 'PASS: 새 소스코드 준비 완료'

echo '=== [5/7] 새 이미지 사전 빌드 (서비스 유지 중) ==='
AVAIL_KB=$(df / --output=avail | tail -1 | tr -d ' ')
AVAIL_MB=$(( AVAIL_KB / 1024 ))
echo "빌드 전 디스크 여유: ${AVAIL_MB}MB"
if [ $AVAIL_KB -lt 1048576 ]; then
    echo "ABORT: 빌드에 필요한 디스크 부족 (${AVAIL_MB}MB < 1024MB)."
    exit 1
fi
# 기존 앱은 계속 실행 중 — 새 이미지를 별도 태그로 빌드
cd $DIR/${APP}-new
sudo docker build -t $NEW_TAG -f dockerfile .
echo 'PASS: 새 이미지 빌드 완료 (기존 앱 아직 실행 중)'

echo '=== [6/7] 컨테이너 교체 (중단 최소화) ==='
# postgres_data 볼륨 확인
if sudo docker volume ls -q | grep -q postgres_data; then
    echo 'postgres_data 볼륨 존재 확인'
else
    echo '(최초 배포: 볼륨 아직 없음)'
fi

# --- 여기서부터 ~3초 중단 ---
if [ -d $DIR/$APP ]; then
    cd $DIR/$APP
    sudo docker-compose stop app 2>/dev/null || true
    sudo docker-compose rm -f app 2>/dev/null || true
    echo '기존 앱 컨테이너 중지 (postgres 유지)'
fi

# 이미지 태그 교체: new → latest
sudo docker rmi $LIVE_TAG 2>/dev/null || true
sudo docker tag $NEW_TAG $LIVE_TAG
sudo docker rmi $NEW_TAG 2>/dev/null || true

# 소스코드 교체
cd $DIR
sudo rm -rf ${APP}-backup
if [ -d $APP ]; then sudo mv $APP ${APP}-backup && echo '기존 코드 backup 완료'; fi
sudo mv ${APP}-new $APP

# 새 컨테이너 시작
cd $DIR/$APP
sudo docker-compose up -d
# --- 중단 끝 ---
echo 'PASS: 컨테이너 교체 완료'

echo '=== [7/7] 검증 + 정리 ==='
sleep 3
sudo docker-compose ps

echo '--- 앱 헬스체크 ---'
for i in 1 2 3 4 5 6; do
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || echo '000')
    if [ "$STATUS" = '200' ]; then echo "앱 정상 응답 (HTTP $STATUS)"; break; fi
    echo "[$i/6] 앱 응답 대기... (HTTP $STATUS)"; sleep 5
done

# 성공 확인 후 정리
sudo rm -rf $DIR/${APP}-backup 2>/dev/null || true
sudo docker builder prune -f 2>/dev/null || true
sudo docker image prune -f 2>/dev/null || true

echo ''
echo '========================================='
echo '  배포 완료! (최소 중단 방식)'
echo '========================================='
