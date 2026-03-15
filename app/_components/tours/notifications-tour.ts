import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const NOTIFICATIONS_TOUR_KEY = "notifications";

export function getNotificationsSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.notifTitle,
        description: t.tour.notifDesc,
      },
    },
    {
      element: "[data-tour='notif-test']",
      popover: {
        title: t.tour.notifTestTitle,
        description: t.tour.notifTestDesc,
      },
    },
    {
      element: "[data-tour='notif-log']",
      popover: {
        title: t.tour.notifLogTitle,
        description: t.tour.notifLogDesc,
      },
    },
  ];
}
