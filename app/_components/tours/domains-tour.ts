import type { DriveStep } from "driver.js";

export const DOMAINS_TOUR_KEY = "domains";

export const domainsSteps: DriveStep[] = [
  {
    popover: {
      title: "도메인 & SSL 관리",
      description:
        "회사가 보유한 도메인과 SSL 인증서를 관리합니다. 만료일을 추적하여 갱신을 놓치지 않도록 합니다.",
    },
  },
  {
    element: "[data-tour='domain-new-btn']",
    popover: {
      title: "새 도메인/SSL 등록",
      description:
        "도메인 또는 SSL 인증서를 등록합니다. 등록기관(가비아, AWS Route53 등), 만료일, 자동갱신 여부 등을 관리할 수 있습니다.",
    },
  },
  {
    element: "[data-tour='domain-table']",
    popover: {
      title: "도메인 목록",
      description:
        "만료일이 가까운 도메인은 빨간색으로 강조됩니다. 자동갱신이 꺼져 있는 도메인은 특히 주의가 필요합니다.",
    },
  },
];
