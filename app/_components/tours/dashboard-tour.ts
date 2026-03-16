import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const DASHBOARD_TOUR_KEY = "dashboard";

export function getDashboardSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.dashboardWelcomeTitle,
        description: t.tour.dashboardWelcomeDesc,
      },
    },
    {
      element: "[data-tour='sidebar']",
      popover: {
        title: t.tour.sidebarTitle,
        description: t.tour.sidebarDesc,
      },
    },
    {
      element: "[data-tour='global-search']",
      popover: {
        title: t.tour.globalSearchTitle,
        description: t.tour.globalSearchDesc,
      },
    },
    {
      element: "[data-tour='user-menu']",
      popover: {
        title: t.tour.userMenuTitle,
        description: t.tour.userMenuDesc,
      },
    },
    {
      element: "[data-tour='dashboard-summary']",
      popover: {
        title: t.tour.dashboardSummaryTitle,
        description: t.tour.dashboardSummaryDesc,
      },
    },
    {
      element: "[data-tour='dashboard-categories']",
      popover: {
        title: t.tour.dashboardCategoriesTitle,
        description: t.tour.dashboardCategoriesDesc,
      },
    },
  ];
}
