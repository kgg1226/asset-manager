import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const DOMAINS_TOUR_KEY = "domains";

export function getDomainsSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.domainsTitle,
        description: t.tour.domainsDesc,
      },
    },
    {
      element: "[data-tour='domain-new-btn']",
      popover: {
        title: t.tour.domainNewTitle,
        description: t.tour.domainNewDesc,
      },
    },
    {
      element: "[data-tour='domain-table']",
      popover: {
        title: t.tour.domainTableTitle,
        description: t.tour.domainTableDesc,
      },
    },
  ];
}
