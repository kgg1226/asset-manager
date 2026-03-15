import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const HARDWARE_TOUR_KEY = "hardware";

export function getHardwareSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.hwTitle,
        description: t.tour.hwDesc,
      },
    },
    {
      element: "[data-tour='hw-search']",
      popover: {
        title: t.tour.hwSearchTitle,
        description: t.tour.hwSearchDesc,
      },
    },
    {
      element: "[data-tour='hw-status-filter']",
      popover: {
        title: t.tour.hwStatusFilterTitle,
        description: t.tour.hwStatusFilterDesc,
      },
    },
    {
      element: "[data-tour='hw-new-btn']",
      popover: {
        title: t.tour.hwNewTitle,
        description: t.tour.hwNewDesc,
      },
    },
    {
      element: "[data-tour='hw-table']",
      popover: {
        title: t.tour.hwTableTitle,
        description: t.tour.hwTableDesc,
      },
    },
    {
      element: "[data-tour='hw-actions']",
      popover: {
        title: t.tour.hwActionsTitle,
        description: t.tour.hwActionsDesc,
      },
    },
  ];
}
