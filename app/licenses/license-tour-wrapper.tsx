"use client";

import { TourGuide } from "@/app/_components/tour-guide";
import { LICENSES_TOUR_KEY, licensesSteps } from "@/app/_components/tours/licenses-tour";

export default function LicenseTourWrapper() {
  return <TourGuide tourKey={LICENSES_TOUR_KEY} steps={licensesSteps} />;
}
