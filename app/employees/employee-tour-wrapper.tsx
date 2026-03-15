"use client";

import { TourGuide } from "@/app/_components/tour-guide";
import { EMPLOYEES_TOUR_KEY, employeesSteps } from "@/app/_components/tours/employees-tour";

export default function EmployeeTourWrapper() {
  return <TourGuide tourKey={EMPLOYEES_TOUR_KEY} steps={employeesSteps} />;
}
