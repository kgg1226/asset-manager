import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const GROUPS_TOUR_KEY = "groups";

export function getGroupsSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.groupsTitle,
        description: t.tour.groupsDesc,
      },
    },
    {
      element: "[data-tour='group-new-btn']",
      popover: {
        title: t.tour.groupNewTitle,
        description: t.tour.groupNewDesc,
      },
    },
    {
      element: "[data-tour='group-table']",
      popover: {
        title: t.tour.groupTableTitle,
        description: t.tour.groupTableDesc,
      },
    },
  ];
}
