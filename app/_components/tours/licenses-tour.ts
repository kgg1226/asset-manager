import type { DriveStep } from "driver.js";

export const LICENSES_TOUR_KEY = "licenses";

export const licensesSteps: DriveStep[] = [
  {
    popover: {
      title: "라이선스 관리",
      description:
        "회사에서 사용하는 모든 소프트웨어 라이선스를 관리하는 페이지입니다. Microsoft 365, Adobe, Slack 등 구독형 및 영구 라이선스를 등록하고 배정 현황을 추적합니다.",
    },
  },
  {
    element: "[data-tour='license-table']",
    popover: {
      title: "라이선스 목록",
      description:
        "등록된 라이선스 목록입니다.\n\n• 수량: 구매한 총 라이선스 수\n• 배정 현황: 배정된 수 / 전체 수 (막대 그래프로 시각화)\n• 갱신일: 라이선스 갱신 예정일\n• 월비용: 매월 발생하는 비용\n• 배정률이 높을수록 빨간색으로 표시됩니다",
    },
  },
  {
    element: "[data-tour='license-new-btn']",
    popover: {
      title: "새 라이선스 등록",
      description:
        "새로운 소프트웨어 라이선스를 등록합니다. 라이선스 유형(키 기반/볼륨/무키)에 따라 입력 항목이 달라집니다.\n\n• 키 기반: 개별 라이선스 키를 시트별로 관리\n• 볼륨: 수량 기반 관리 (예: 100석)\n• 무키: 키 없이 사용하는 라이선스",
    },
  },
  {
    element: "[data-tour='license-assign']",
    popover: {
      title: "라이선스 배정",
      description:
        "배정 버튼을 클릭하면 조직원에게 라이선스를 할당할 수 있습니다. 배정된 라이선스는 해당 조직원의 상세 페이지에서도 확인됩니다.",
    },
  },
];
