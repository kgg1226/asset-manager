import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const IMPORT_TOUR_KEY = "import";

export function getImportSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.importTitle,
        description: t.tour.importDesc,
      },
    },
    {
      element: "[data-tour='import-form']",
      popover: {
        title: t.tour.importFormTitle,
        description: t.tour.importFormDesc,
      },
    },
  ];
}
