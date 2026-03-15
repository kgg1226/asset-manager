import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const ORG_TOUR_KEY = "org";

export function getOrgSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.orgTitle,
        description: t.tour.orgDesc,
      },
    },
    {
      element: "[data-tour='org-tabs']",
      popover: {
        title: t.tour.orgTabsTitle,
        description: t.tour.orgTabsDesc,
      },
    },
    {
      element: "[data-tour='org-new-company']",
      popover: {
        title: t.tour.orgNewCompanyTitle,
        description: t.tour.orgNewCompanyDesc,
      },
    },
    {
      element: "[data-tour='org-tree']",
      popover: {
        title: t.tour.orgTreeTitle,
        description: t.tour.orgTreeDesc,
      },
    },
  ];
}
