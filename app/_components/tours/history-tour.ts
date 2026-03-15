import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const HISTORY_TOUR_KEY = "history";

export function getHistorySteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.historyTitle,
        description: t.tour.historyDesc,
      },
    },
    {
      element: "[data-tour='history-filter']",
      popover: {
        title: t.tour.historyFilterTitle,
        description: t.tour.historyFilterDesc,
      },
    },
    {
      element: "[data-tour='history-table']",
      popover: {
        title: t.tour.historyTableTitle,
        description: t.tour.historyTableDesc,
      },
    },
  ];
}
