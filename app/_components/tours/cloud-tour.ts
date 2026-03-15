import type { DriveStep } from "driver.js";

export const CLOUD_TOUR_KEY = "cloud";

export const cloudSteps: DriveStep[] = [
  {
    popover: {
      title: "클라우드 서비스 관리",
      description:
        "회사에서 사용하는 모든 클라우드 서비스(AWS, GCP, Azure 등)와 SaaS 구독을 관리합니다. 월별 비용, 구독 갱신일, 담당자 등을 추적합니다.",
    },
  },
  {
    element: "[data-tour='cloud-new-btn']",
    popover: {
      title: "새 클라우드 서비스 등록",
      description:
        "새로운 클라우드 서비스나 SaaS 구독을 등록합니다. 플랫폼, 계정 ID, 리전, 비용 정보 등을 입력할 수 있습니다.",
    },
  },
  {
    element: "[data-tour='cloud-table']",
    popover: {
      title: "서비스 목록",
      description:
        "등록된 클라우드 서비스 목록입니다. 서비스명을 클릭하면 상세 정보를 확인할 수 있고, 만료일이 임박한 서비스는 빨간색으로 표시됩니다.",
    },
  },
];
