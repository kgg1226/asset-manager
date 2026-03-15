"use client";

import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { HISTORY_TOUR_KEY, getHistorySteps } from "@/app/_components/tours/history-tour";

export default function HistoryTourWrapper() {
  const { t } = useTranslation();
  return <TourGuide tourKey={HISTORY_TOUR_KEY} steps={getHistorySteps(t)} />;
}
