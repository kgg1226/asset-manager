import type { DriveStep } from "driver.js";

export const EMPLOYEES_TOUR_KEY = "employees";

export const employeesSteps: DriveStep[] = [
  {
    popover: {
      title: "조직원 관리",
      description:
        "회사의 모든 구성원을 관리하는 페이지입니다. 각 조직원에게 어떤 자산(노트북, 라이선스 등)이 배정되어 있는지 확인할 수 있습니다.",
    },
  },
  {
    element: "[data-tour='emp-search']",
    popover: {
      title: "조직원 검색",
      description:
        "이름 또는 부서로 조직원을 검색할 수 있습니다.",
    },
  },
  {
    element: "[data-tour='emp-filter']",
    popover: {
      title: "상태 필터",
      description:
        "재직 중인 조직원만 보거나, 퇴사한 조직원도 포함하여 볼 수 있습니다. 퇴사자의 미반납 자산을 확인할 때 유용합니다.",
    },
  },
  {
    element: "[data-tour='emp-new-btn']",
    popover: {
      title: "새 조직원 등록",
      description:
        "새로운 구성원을 등록합니다. 이름, 이메일, 부서, 직급 등을 입력하세요. 등록 후 해당 조직원에게 장비와 라이선스를 배정할 수 있습니다.",
    },
  },
  {
    element: "[data-tour='emp-table']",
    popover: {
      title: "조직원 목록",
      description:
        "이름을 클릭하면 해당 조직원의 상세 페이지로 이동합니다. 상세 페이지에서는 배정된 모든 자산 목록을 확인하고, 자산 배정/회수를 할 수 있습니다.",
    },
  },
];
