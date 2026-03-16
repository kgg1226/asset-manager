"use client";

import { useTranslation } from "@/lib/i18n";
import { TourGuide } from "@/app/_components/tour-guide";
import { EMPLOYEES_TOUR_KEY, getEmployeesSteps } from "@/app/_components/tours/employees-tour";

export default function EmployeeTourWrapper() {
  const { t } = useTranslation();
  return <TourGuide tourKey={EMPLOYEES_TOUR_KEY} steps={getEmployeesSteps(t)} />;
}
