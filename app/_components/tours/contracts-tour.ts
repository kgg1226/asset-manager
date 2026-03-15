import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const CONTRACTS_TOUR_KEY = "contracts";

export function getContractsSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.contractsTitle,
        description: t.tour.contractsDesc,
      },
    },
    {
      element: "[data-tour='contract-search']",
      popover: {
        title: t.tour.contractSearchTitle,
        description: t.tour.contractSearchDesc,
      },
    },
    {
      element: "[data-tour='contract-filter']",
      popover: {
        title: t.tour.contractFilterTitle,
        description: t.tour.contractFilterDesc,
      },
    },
    {
      element: "[data-tour='contract-new-btn']",
      popover: {
        title: t.tour.contractNewTitle,
        description: t.tour.contractNewDesc,
      },
    },
    {
      element: "[data-tour='contract-table']",
      popover: {
        title: t.tour.contractTableTitle,
        description: t.tour.contractTableDesc,
      },
    },
  ];
}
