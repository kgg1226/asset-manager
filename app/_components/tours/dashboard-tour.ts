import type { DriveStep } from "driver.js";

export const DASHBOARD_TOUR_KEY = "dashboard";

export const dashboardSteps: DriveStep[] = [
  {
    popover: {
      title: "대시보드에 오신 것을 환영합니다!",
      description:
        "이 페이지에서는 회사의 모든 자산 현황을 한눈에 파악할 수 있습니다. 라이선스, 하드웨어, 클라우드, 도메인 등 모든 자산의 요약 정보를 확인하세요.",
    },
  },
  {
    element: "[data-tour='sidebar']",
    popover: {
      title: "사이드바 메뉴",
      description:
        "왼쪽 메뉴에서 각 자산 유형별 페이지로 이동할 수 있습니다. 하드웨어, 라이선스, 클라우드, 도메인 등 카테고리별로 관리합니다.",
    },
  },
  {
    element: "[data-tour='global-search']",
    popover: {
      title: "통합 검색",
      description:
        "상단 검색창에서 자산명, 조직원명, 시리얼 번호 등을 한 번에 검색할 수 있습니다. 어떤 페이지에서든 빠르게 원하는 정보를 찾아보세요.",
    },
  },
  {
    element: "[data-tour='user-menu']",
    popover: {
      title: "사용자 메뉴",
      description:
        "현재 로그인한 계정 정보를 확인하고, 로그아웃할 수 있습니다. 관리자(ADMIN) 계정은 자산 등록/수정/삭제가 가능합니다.",
    },
  },
  {
    element: "[data-tour='dashboard-summary']",
    popover: {
      title: "자산 요약 카드",
      description:
        "전체 자산 수, 월 총비용, 활성 자산 비율 등 핵심 지표를 보여줍니다. 숫자를 클릭하면 해당 목록으로 이동합니다.",
    },
  },
  {
    element: "[data-tour='dashboard-categories']",
    popover: {
      title: "자산 유형별 탭",
      description:
        "라이선스, 하드웨어, 클라우드, 도메인 등 유형별로 탭을 전환하여 세부 현황을 확인할 수 있습니다.",
    },
  },
];
