$lockFile = "C:/license-manager/.git/index.lock"
if (Test-Path $lockFile) {
    Warn "기존 Git Lock 파일이 발견되었습니다. 정리를 시도합니다..."
    try {
        Remove-Item $lockFile -Force -ErrorAction Stop
        Success "Lock 파일 제거 완료."
    } catch {
        Fail "Lock 파일을 제거할 수 없습니다. 다른 에디터(VS Code 등)에서 Git 작업을 수행 중인지 확인하세요."
        exit 1
    }
}
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$PROFILE = "hyeongunk"
$REGION = "ap-northeast-2"
$S3_BUCKET_PATH = "s3://triplecomma-releases/triplecomma-backoffice"
$ZIP_NAME = "license-manager.zip"

function Log($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" }
function Success($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Red }

function Invoke-OrFail([scriptblock]$Script, [string]$ErrorMessage) {
    & $Script
    if ($LASTEXITCODE -ne 0) {
        Fail $ErrorMessage
        exit 1
    }
}

# 1. Git Push 단계
Log "=== [1/2] Git Push 단계 ==="

# 1-1. 변경사항이 있다면 먼저 커밋하여 Index를 비움
$hasChanges = (git status --porcelain)
if (-not [string]::IsNullOrWhiteSpace($hasChanges)) {
    Log "로컬 변경사항이 감지되었습니다. 커밋을 먼저 진행합니다."
    Invoke-OrFail { git add -A } "git add 실패"
    
    $commitMsg = Read-Host "커밋 메시지 (Default: 'deploy')"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "deploy" }
    
    & git commit -m $commitMsg
    if ($LASTEXITCODE -ne 0) { Fail "git commit 실패"; exit 1 }
}

# 1-2. 커밋된 상태에서 안전하게 최신 코드 가져오기 (Rebase)
Log "원격 저장소의 최신 내용을 반영합니다 (Rebase)..."
Invoke-OrFail { git fetch origin } "git fetch 실패"
Invoke-OrFail { git pull --rebase origin master } "git pull --rebase 실패. 충돌(Conflict)을 확인하세요."

# 1-3. 푸시
Invoke-OrFail { git push origin master } "git push 실패"
Success "Git Push 완료"



# 2. S3 업로드 단계 (중첩 방지를 위한 압축 구조 최적화)
Log "=== [2/2] S3 업로드 단계 ==="
$zipPath = "$env:TEMP\$ZIP_NAME"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# 빌드 컨텍스트에 포함되지 않아야 할 목록 (정규화)
$exclude = @(".git", "node_modules", ".next", ".env*", ".claude", ".claire", "*.zip", "license-manager")
$items = Get-ChildItem -Path . -Exclude $exclude

Log "압축 파일 생성 중..."
Compress-Archive -Path $items -DestinationPath $zipPath -Force

Log "S3 업로드 중..."
& aws s3 cp $zipPath "$S3_BUCKET_PATH/$ZIP_NAME" --profile $PROFILE --region $REGION
if ($LASTEXITCODE -ne 0) { Fail "S3 업로드 실패"; exit 1 }

Success "모든 로컬 작업 완료!"

# 3. EC2 실행 가이드 (경로 정규화 반영)
$EC2_ID = "i-0aeda7845a9634718"
$REMOTE_BASE_DIR = "/home/ssm-user/app"
$TARGET_DIR = "license-manager"

Write-Host ""
Write-Host "----------------------------------------------------------------" -ForegroundColor Gray
Write-Host " [EC2 배포 실행 가이드] " -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------"
Write-Host "1. EC2 접속:"
Write-Host "   aws ssm start-session --target $EC2_ID --region $REGION --profile $PROFILE" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. 배포 명령 (복사하여 붙여넣기):"
Write-Host "   cd $REMOTE_BASE_DIR && \" -ForegroundColor Cyan
Write-Host "   aws s3 cp $S3_BUCKET_PATH/$ZIP_NAME . --profile $PROFILE && \" -ForegroundColor Cyan
Write-Host "   rm -rf $TARGET_DIR && mkdir $TARGET_DIR && \" -ForegroundColor Cyan
Write-Host "   unzip -q $ZIP_NAME -d $TARGET_DIR && rm $ZIP_NAME && \" -ForegroundColor Cyan
Write-Host "   cd $TARGET_DIR && \" -ForegroundColor Cyan
Write-Host "   sudo docker build -t license-manager:latest . && \" -ForegroundColor Cyan
Write-Host "   sudo docker restart license-app" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------"