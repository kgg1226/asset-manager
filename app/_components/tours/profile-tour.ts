import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const PROFILE_TOUR_KEY = "profile";

export function getProfileSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.profileTitle,
        description: t.tour.profileDesc,
      },
    },
    {
      element: "[data-tour='profile-info']",
      popover: {
        title: t.tour.profileInfoTitle,
        description: t.tour.profileInfoDesc,
      },
    },
    {
      element: "[data-tour='profile-password']",
      popover: {
        title: t.tour.profilePasswordTitle,
        description: t.tour.profilePasswordDesc,
      },
    },
  ];
}
