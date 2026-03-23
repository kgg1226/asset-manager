/**
 * POST /api/cloud/sync
 *
 * 클라우드 자산 자동 동기화 엔드포인트 (스텁)
 *
 * 향후 구현 시 흐름:
 *   1. 클라이언트 또는 크론이 이 엔드포인트 호출
 *   2. platform별 SDK로 리소스 목록 수집 (AWS SDK, GCP SDK 등)
 *   3. externalArn 기준으로 기존 자산과 매칭 (upsert)
 *   4. 새 리소스 → 자산 자동 생성
 *   5. 삭제된 리소스 → syncStatus = "ORPHAN"
 *   6. 변경 감지 → syncStatus = "DRIFT"
 *   7. 사용량 메트릭도 함께 수집하여 CloudUsageMetric에 저장
 *
 * 지원 예정 소스:
 *   - AWS_API: AWS SDK (STS + 각 서비스 API)
 *   - GCP_API: Google Cloud Client Libraries
 *   - AZURE_API: Azure SDK
 *   - TERRAFORM: Terraform state file 파싱
 *   - CSV: 수동 CSV 업로드 (이미 구현됨)
 *
 * 인증: 일반 사용자 세션 또는 CRON_SECRET Bearer 토큰
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { platform } = body; // AWS, GCP, AZURE 등

    // TODO: 실제 클라우드 SDK 연동 구현
    // 현재는 스텁으로 응답만 반환

    return NextResponse.json({
      success: false,
      message: `클라우드 동기화 기능은 아직 준비 중입니다. (platform: ${platform || "미지정"})`,
      supportedPlatforms: ["AWS_API", "GCP_API", "AZURE_API", "TERRAFORM", "CSV"],
      nextSteps: [
        "1. 클라우드 제공자의 API 키를 설정에 등록하세요",
        "2. 동기화할 계정/리전을 선택하세요",
        "3. 수동 동기화를 실행하거나 자동 스케줄을 설정하세요",
      ],
    }, { status: 501 });
  } catch (error) {
    console.error("Cloud sync error:", error);
    return NextResponse.json({ error: "동기화 요청 처리 실패" }, { status: 500 });
  }
}
