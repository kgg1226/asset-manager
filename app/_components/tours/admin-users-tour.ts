import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const ADMIN_USERS_TOUR_KEY = "admin-users";

export function getAdminUsersSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.adminUsersTitle,
        description: t.tour.adminUsersDesc,
      },
    },
    {
      element: "[data-tour='admin-users-search']",
      popover: {
        title: t.tour.adminUsersSearchTitle,
        description: t.tour.adminUsersSearchDesc,
      },
    },
    {
      element: "[data-tour='admin-users-table']",
      popover: {
        title: t.tour.adminUsersTableTitle,
        description: t.tour.adminUsersTableDesc,
      },
    },
  ];
}
