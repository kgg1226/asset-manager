$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# --- [설정 구간] ---
$PROFILE_NAME  = "hyeongunk"
$REGION        = "ap-northeast-2"
$S3_BUCKET     = "s3://triplecomma-releases/triplecomma-backoffice"
$ZIP_NAME      = "license-manager.zip"
$EC2_ID        = "i-0aeda7845a9634718"
$REMOTE_DIR    = "/home/ssm-user/app"

# --- [유틸리티 함수] ---
function Log($msg)     { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" }
function Success($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Green }
function Warn($msg)    { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Yellow }
function Fail($msg)    { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Red }

function Invoke-OrFail([scriptblock]$Script, [string]$ErrorMessage) {
    & $Script
    if ($LASTEXITCODE -ne 0) { Fail $ErrorMessage; exit 1 }
}

# --- [사전 체크: Git Lock 제거] ---
$lockFile = Join-Path (Get-Location) ".git/index.lock"
if (Test-Path $lockFile) {
    Warn "이전 Git 작업의 Lock 파일이 남아있어 제거를 시도합니다..."
    try { Remove-Item $lockFile -Force -ErrorAction Stop } catch {
        Fail "Lock 파일을 지울 수 없습니다. VS Code 등 다른 Git 사용 프로그램을 종료하세요."
        exit 1
    }
}

# --- [1/2] Git Push 단계 ---
Log "=== [1/2] Git 작업 시작 ==="

$hasChanges = (git status --porcelain)
if (-not [string]::IsNullOrWhiteSpace($hasChanges)) {
    Log "변경사항이 감지되었습니다. 커밋을 진행합니다."
    Invoke-OrFail { git add -A } "git add 실패"

    $commitMsg = Read-Host "커밋 메시지 입력 (엔터 시 'deploy')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "deploy" }

    Invoke-OrFail { git commit -m $commitMsg } "git commit 실패"
} else {
    Warn "커밋할 변경사항이 없습니다."
}

Log "원격 저장소 동기화 (Rebase)..."
Invoke-OrFail { git fetch origin } "git fetch 실패"
Invoke-OrFail { git pull --rebase origin master } "git pull 실패. 충돌이 발생했다면 수동 해결이 필요합니다."
Invoke-OrFail { git push origin master } "git push 실패"
Success "Git 동기화 완료"

# --- [2/2] S3 업로드 단계 ---
Log "=== [2/2] S3 업로드 준비 ==="
$zipPath = Join-Path $env:TEMP $ZIP_NAME
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$excludeList = @(".git*", "node_modules*", ".next*", ".env*", ".claude*", "*.zip")
$items = Get-ChildItem -Path . | Where-Object {
    $name = $_.Name
    $exclude = $false
    foreach ($pattern in $excludeList) {
        if ($name -like $pattern) { $exclude = $true; break }
    }
    -not $exclude
}

if ($null -eq $items -or ($items | Measure-Object).Count -eq 0) {
    Fail "압축할 대상이 없습니다. 현재 경로($pwd)를 확인하세요."
    exit 1
}

Log "압축 대상:"
$items | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }

Log "압축 파일 생성 중..."
Compress-Archive -Path ($items.FullName) -DestinationPath $zipPath -Force

Log "S3 업로드 중..."
Invoke-OrFail { aws s3 cp $zipPath "$S3_BUCKET/$ZIP_NAME" --profile $PROFILE_NAME --region $REGION } "S3 업로드 실패"
Success "S3 업로드 완료: $S3_BUCKET/$ZIP_NAME"

# --- [EC2 배포 명령어 안내] ---
$SSM_CMD = "aws ssm start-session --target $EC2_ID --region $REGION --profile $PROFILE_NAME"

# EC2는 IAM Role 사용 → --profile 불필요
$DEPLOY_CMDS = @(
    "# [1/5] 작업 디렉토리 이동 및 S3 다운로드",
    "cd $REMOTE_DIR",
    "aws s3 cp $S3_BUCKET/$ZIP_NAME .",
    "",
    "# [2/5] 압축 해제 (기존 소스 덮어쓰기)",
    "rm -rf license-manager && mkdir license-manager",
    "unzip -q $ZIP_NAME -d license-manager && rm $ZIP_NAME",
    "cd license-manager",
    "",
    "# [3/5] 스왑 확인 (RAM 부족 시 빌드 실패 방지)",
    "free -h",
    "if [ ! -f /swapfile ]; then sudo dd if=/dev/zero of=/swapfile bs=128M count=16 && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile; fi",
    "",
    "# [4/5] Docker 이미지 빌드",
    "sudo docker build -t license-manager:new .",
    "",
    "# [5/5] 컨테이너 교체 (기존 백업 후 신규 실행)",
    "sudo docker tag license-manager:latest license-manager:backup 2>/dev/null || true",
    "sudo docker rm -f license-app || true",
    "sudo docker run -d --name license-app -p 8080:3000 \",
    "  -e DATABASE_URL=file:/app/dev.db \",
    "  -e NODE_ENV=production \",
    "  -e SECURE_COOKIE=false \",
    "  -v /home/ssm-user/license-manager/data/dev.db:/app/dev.db \",
    "  license-manager:new",
    "sudo docker tag license-manager:new license-manager:latest",
    "",
    "# 확인",
    "sudo docker ps"
)

$ROLLBACK_CMD = "sudo docker rm -f license-app || true && sudo docker run -d --name license-app -p 8080:3000 -e DATABASE_URL=file:/app/dev.db -e NODE_ENV=production -e SECURE_COOKIE=false -v /home/ssm-user/license-manager/data/dev.db:/app/dev.db license-manager:backup"

Write-Host ""
Write-Host "================================================================" -ForegroundColor DarkGray
Write-Host "  EC2 배포 명령어 (순서대로 복사해서 붙여넣기)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "[ STEP 1 ] EC2 SSM 접속" -ForegroundColor Yellow
Write-Host "  $SSM_CMD" -ForegroundColor White
Write-Host ""
Write-Host "[ STEP 2 ] 배포 실행 (EC2 내부에서)" -ForegroundColor Yellow
foreach ($line in $DEPLOY_CMDS) {
    if ($line.StartsWith("#")) {
        Write-Host "  $line" -ForegroundColor DarkGray
    } elseif ($line -eq "") {
        Write-Host ""
    } else {
        Write-Host "  $line" -ForegroundColor White
    }
}
Write-Host ""
Write-Host "[ 롤백 필요 시 ]" -ForegroundColor Red
Write-Host "  $ROLLBACK_CMD" -ForegroundColor White
Write-Host ""
Write-Host "================================================================" -ForegroundColor DarkGray
