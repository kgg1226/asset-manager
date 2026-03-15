import type { DriveStep } from "driver.js";

export const HISTORY_TOUR_KEY = "history";

export const historySteps: DriveStep[] = [
  {
    popover: {
      title: "변경 이력 (감사 로그)",
      description:
        "시스템에서 발생한 모든 변경 사항을 기록합니다. 누가, 언제, 무엇을 변경했는지 추적할 수 있어 보안 감사와 문제 추적에 활용됩니다.",
    },
  },
  {
    element: "[data-tour='history-filter']",
    popover: {
      title: "필터 옵션",
      description:
        "유형(라이선스/하드웨어/조직원 등), 액션(생성/수정/삭제), 기간, 검색어로 이력을 필터링할 수 있습니다. 특정 기간의 변경 사항만 조회할 때 유용합니다.",
    },
  },
  {
    element: "[data-tour='history-table']",
    popover: {
      title: "이력 목록",
      description:
        "각 행은 하나의 변경 기록입니다.\n\n• 유형: 어떤 종류의 자산이 변경되었는지\n• 대상 ID: 변경된 항목의 식별자\n• 액션: 생성(CREATE), 수정(UPDATE), 삭제(DELETE) 등\n• 수행자: 변경을 수행한 관리자\n• 상세: 변경된 구체적 내용 (이전값 → 새값)",
    },
  },
];
