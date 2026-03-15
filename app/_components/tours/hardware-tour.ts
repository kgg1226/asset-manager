import type { DriveStep } from "driver.js";

export const HARDWARE_TOUR_KEY = "hardware";

export const hardwareSteps: DriveStep[] = [
  {
    popover: {
      title: "하드웨어 관리",
      description:
        "회사의 모든 하드웨어 자산(노트북, 데스크톱, 서버, 모니터 등)을 등록하고 관리하는 페이지입니다. 장비의 입고부터 할당, 회수, 폐기까지 전체 수명주기를 추적합니다.",
    },
  },
  {
    element: "[data-tour='hw-search']",
    popover: {
      title: "장비 검색",
      description:
        "자산명으로 하드웨어를 검색할 수 있습니다. 노트북 모델명, 서버 이름 등을 입력해보세요.",
    },
  },
  {
    element: "[data-tour='hw-status-filter']",
    popover: {
      title: "상태 필터",
      description:
        "장비의 현재 상태별로 필터링할 수 있습니다.\n\n• 재고: 아직 아무에게도 배정되지 않은 장비\n• 사용 중: 누군가에게 배정된 장비\n• 미사용: 일시적으로 사용하지 않는 장비\n• 불용/폐기: 더 이상 사용할 수 없는 장비",
    },
  },
  {
    element: "[data-tour='hw-new-btn']",
    popover: {
      title: "새 하드웨어 등록",
      description:
        "새로운 장비를 시스템에 등록합니다. 장비 유형, 제조사, 모델, 시리얼 번호, 구매 정보 등을 입력할 수 있습니다.",
    },
  },
  {
    element: "[data-tour='hw-table']",
    popover: {
      title: "장비 목록",
      description:
        "등록된 모든 하드웨어를 한눈에 볼 수 있습니다. 각 열의 제목을 클릭하면 정렬할 수 있고, 장비명을 클릭하면 상세 페이지로 이동합니다.\n\n• 상태 옆의 A/B/C/D는 장비 상태 등급입니다\n• 할당자 열에서 누가 사용 중인지 확인할 수 있습니다",
    },
  },
  {
    element: "[data-tour='hw-actions']",
    popover: {
      title: "장비 관리 작업",
      description:
        "각 장비에 대해 상세 보기(👁), 수정(✏), 삭제(🗑) 작업을 수행할 수 있습니다. 관리자 계정에서만 표시됩니다.",
    },
  },
];
