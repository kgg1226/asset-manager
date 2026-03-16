import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const CLOUD_TOUR_KEY = "cloud";

export function getCloudSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.cloudTitle,
        description: t.tour.cloudDesc,
      },
    },
    {
      element: "[data-tour='cloud-new-btn']",
      popover: {
        title: t.tour.cloudNewTitle,
        description: t.tour.cloudNewDesc,
      },
    },
    {
      element: "[data-tour='cloud-table']",
      popover: {
        title: t.tour.cloudTableTitle,
        description: t.tour.cloudTableDesc,
      },
    },
  ];
}
