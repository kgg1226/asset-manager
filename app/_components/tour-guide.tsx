"use client";

import { useEffect, useCallback, useState } from "react";
import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";

interface TourGuideProps {
  /** 이 투어의 고유 키 (localStorage에 완료 여부 저장) */
  tourKey: string;
  /** 투어 스텝 목록 */
  steps: DriveStep[];
  /** 첫 방문 시 자동 실행 여부 (기본: true) */
  autoStart?: boolean;
  /** 버튼 표시 여부 (기본: true) */
  showButton?: boolean;
  /** 투어 제목 (팝오버 상단) */
  title?: string;
}

const TOUR_CONFIG: Config = {
  animate: true,
  overlayColor: "rgba(0, 0, 0, 0.5)",
  smoothScroll: true,
  stagePadding: 8,
  stageRadius: 8,
  popoverClass: "tour-popover",
  nextBtnText: "다음 →",
  prevBtnText: "← 이전",
  doneBtnText: "완료 ✓",
  progressText: "{{current}} / {{total}}",
  showProgress: true,
};

function getTourCompletedKey(tourKey: string) {
  return `tour_completed_${tourKey}`;
}

export function TourGuide({
  tourKey,
  steps,
  autoStart = true,
  showButton = true,
}: TourGuideProps) {
  const [ready, setReady] = useState(false);

  const startTour = useCallback(() => {
    const d = driver({
      ...TOUR_CONFIG,
      steps,
      onDestroyed: () => {
        localStorage.setItem(getTourCompletedKey(tourKey), "true");
      },
    });
    d.drive();
  }, [tourKey, steps]);

  useEffect(() => {
    // DOM이 렌더링된 후 실행
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
      title="페이지 가이드 보기"
    >
      <HelpCircle className="h-4 w-4" />
      <span>가이드</span>
    </button>
  );
}

/** 특정 투어의 완료 상태를 리셋 (다시 보기) */
export function resetTour(tourKey: string) {
  localStorage.removeItem(getTourCompletedKey(tourKey));
}

/** 모든 투어의 완료 상태를 리셋 */
export function resetAllTours() {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith("tour_completed_"),
  );
  keys.forEach((k) => localStorage.removeItem(k));
}
