"use client";

import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { LICENSES_TOUR_KEY, getLicensesSteps } from "@/app/_components/tours/licenses-tour";

export default function LicenseTourWrapper() {
  const { t } = useTranslation();
  return <TourGuide tourKey={LICENSES_TOUR_KEY} steps={getLicensesSteps(t)} />;
}
