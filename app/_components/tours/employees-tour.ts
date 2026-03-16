import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const EMPLOYEES_TOUR_KEY = "employees";

export function getEmployeesSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.empTitle,
        description: t.tour.empDesc,
      },
    },
    {
      element: "[data-tour='emp-search']",
      popover: {
        title: t.tour.empSearchTitle,
        description: t.tour.empSearchDesc,
      },
    },
    {
      element: "[data-tour='emp-filter']",
      popover: {
        title: t.tour.empFilterTitle,
        description: t.tour.empFilterDesc,
      },
    },
    {
      element: "[data-tour='emp-new-btn']",
      popover: {
        title: t.tour.empNewTitle,
        description: t.tour.empNewDesc,
      },
    },
    {
      element: "[data-tour='emp-table']",
      popover: {
        title: t.tour.empTableTitle,
        description: t.tour.empTableDesc,
      },
    },
  ];
}
