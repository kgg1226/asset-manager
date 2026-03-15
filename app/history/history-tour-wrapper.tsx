"use client";

import { TourGuide } from "@/app/_components/tour-guide";
import { HISTORY_TOUR_KEY, historySteps } from "@/app/_components/tours/history-tour";

export default function HistoryTourWrapper() {
  return <TourGuide tourKey={HISTORY_TOUR_KEY} steps={historySteps} />;
}
