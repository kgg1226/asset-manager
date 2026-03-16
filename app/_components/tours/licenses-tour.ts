import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const LICENSES_TOUR_KEY = "licenses";

export function getLicensesSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.licensesTitle,
        description: t.tour.licensesDesc,
      },
    },
    {
      element: "[data-tour='license-table']",
      popover: {
        title: t.tour.licenseTableTitle,
        description: t.tour.licenseTableDesc,
      },
    },
    {
      element: "[data-tour='license-new-btn']",
      popover: {
        title: t.tour.licenseNewTitle,
        description: t.tour.licenseNewDesc,
      },
    },
    {
      element: "[data-tour='license-assign']",
      popover: {
        title: t.tour.licenseAssignTitle,
        description: t.tour.licenseAssignDesc,
      },
    },
  ];
}
