import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const GUIDE_TOUR_KEY = "guide";

export function getGuideSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.guideTourTitle,
        description: t.tour.guideTourDesc,
      },
    },
    {
      element: "[data-tour='guide-progress']",
      popover: {
        title: t.tour.guideProgressTitle,
        description: t.tour.guideProgressDesc,
      },
    },
    {
      element: "[data-tour='guide-sections']",
      popover: {
        title: t.tour.guideSectionsTitle,
        description: t.tour.guideSectionsDesc,
      },
    },
    {
      element: "[data-tour='guide-quick-links']",
      popover: {
        title: t.tour.guideQuickLinksTitle,
        description: t.tour.guideQuickLinksDesc,
      },
    },
  ];
}
