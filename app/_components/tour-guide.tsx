"use client";

import { useEffect, useCallback, useState } from "react";
import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface TourGuideProps {
  tourKey: string;
  steps: DriveStep[];
  autoStart?: boolean;
  showButton?: boolean;
}

function getTourCompletedKey(tourKey: string) {
  return `tour_completed_${tourKey}`;
}

export function TourGuide({
  tourKey,
  steps,
  autoStart = true,
  showButton = true,
}: TourGuideProps) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);

  const startTour = useCallback(() => {
    const config: Config = {
      animate: true,
      overlayColor: "rgba(0, 0, 0, 0.5)",
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: "tour-popover",
      nextBtnText: t.tour.nextBtn,
      prevBtnText: t.tour.prevBtn,
      doneBtnText: t.tour.doneBtn,
      progressText: "{{current}} / {{total}}",
      showProgress: true,
      steps,
      onDestroyed: () => {
        localStorage.setItem(getTourCompletedKey(tourKey), "true");
      },
    };
    const d = driver(config);
    d.drive();
  }, [tourKey, steps, t]);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !autoStart) return;
    const completed = localStorage.getItem(getTourCompletedKey(tourKey));
    if (!completed) {
      startTour();
    }
  }, [ready, autoStart, tourKey, startTour]);

  if (!showButton) return null;

  return (
    <button
      onClick={startTour}
      className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
      title={t.tour.guideBtnTooltip}
    >
      <HelpCircle className="h-4 w-4" />
      <span>{t.tour.guideBtn}</span>
    </button>
  );
}

export function resetTour(tourKey: string) {
  localStorage.removeItem(getTourCompletedKey(tourKey));
}

export function resetAllTours() {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith("tour_completed_"),
  );
  keys.forEach((k) => localStorage.removeItem(k));
}
