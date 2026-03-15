import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const REPORTS_TOUR_KEY = "reports";

export function getReportsSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.reportsTitle,
        description: t.tour.reportsDesc,
      },
    },
    {
      element: "[data-tour='report-period']",
      popover: {
        title: t.tour.reportPeriodTitle,
        description: t.tour.reportPeriodDesc,
      },
    },
    {
      element: "[data-tour='report-export']",
      popover: {
        title: t.tour.reportExportTitle,
        description: t.tour.reportExportDesc,
      },
    },
    {
      element: "[data-tour='report-email']",
      popover: {
        title: t.tour.reportEmailTitle,
        description: t.tour.reportEmailDesc,
      },
    },
  ];
}
