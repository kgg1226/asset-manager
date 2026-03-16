import type { DriveStep } from "driver.js";
import type { TranslationDict } from "@/lib/i18n/types";

export const EXCHANGE_RATES_TOUR_KEY = "exchange-rates";

export function getExchangeRatesSteps(t: TranslationDict): DriveStep[] {
  return [
    {
      popover: {
        title: t.tour.exchangeRatesTitle,
        description: t.tour.exchangeRatesDesc,
      },
    },
    {
      element: "[data-tour='exchange-rates-sync']",
      popover: {
        title: t.tour.exchangeRatesSyncTitle,
        description: t.tour.exchangeRatesSyncDesc,
      },
    },
    {
      element: "[data-tour='exchange-rates-table']",
      popover: {
        title: t.tour.exchangeRatesTableTitle,
        description: t.tour.exchangeRatesTableDesc,
      },
    },
  ];
}
