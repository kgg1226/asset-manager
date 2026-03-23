"use client";

/**
 * LifecycleGauge — 자산 수명 게이지
 *
 * 구매일(startDate) ~ 만료일(endDate) 기준으로 경과율을 계산하여
 * 파란색(0%) → 노란색(50%) → 빨간색(100%) 그라데이션 게이지를 표시합니다.
 *
 * Props:
 *  - startDate: 구매일 / 시작일 (ISO string 또는 Date)
 *  - endDate: 만료일 (ISO string 또는 Date)
 *  - size?: "sm" | "md" | "lg" — 게이지 크기
 *  - showLabel?: boolean — 퍼센트 텍스트 표시 여부
 *  - showDates?: boolean — 시작/종료일 텍스트 표시 여부
 *  - thresholds?: number[] — 알림 임계치 표시 (기본 [50, 80, 95])
 */

type LifecycleGaugeProps = {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showDates?: boolean;
  showThresholds?: boolean;
};

function parseDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? null : date;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function calcLifecyclePercent(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
): { percent: number; daysLeft: number; totalDays: number; elapsedDays: number } {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) return { percent: 0, daysLeft: 0, totalDays: 0, elapsedDays: 0 };

  const now = new Date();
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();

  if (totalMs <= 0) return { percent: 100, daysLeft: 0, totalDays: 0, elapsedDays: 0 };

  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil(elapsedMs / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, totalDays - elapsedDays);
  const percent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  return { percent, daysLeft, totalDays, elapsedDays };
}

function getGaugeColor(percent: number): string {
  // 파란(0%) → 노란(50%) → 빨간(100%)
  if (percent <= 0) return "rgb(59, 130, 246)"; // blue-500
  if (percent >= 100) return "rgb(239, 68, 68)"; // red-500

  if (percent <= 50) {
    // blue → yellow
    const t = percent / 50;
    const r = Math.round(59 + (234 - 59) * t);
    const g = Math.round(130 + (179 - 130) * t);
    const b = Math.round(246 + (8 - 246) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // yellow → red
    const t = (percent - 50) / 50;
    const r = Math.round(234 + (239 - 234) * t);
    const g = Math.round(179 + (68 - 179) * t);
    const b = Math.round(8 + (68 - 8) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function getGaugeBgGradient(percent: number): string {
  const color = getGaugeColor(percent);
  return `linear-gradient(to right, rgb(59, 130, 246), ${color})`;
}

export default function LifecycleGauge({
  startDate,
  endDate,
  size = "md",
  showLabel = true,
  showDates = false,
  showThresholds = false,
}: LifecycleGaugeProps) {
  const { percent, daysLeft, totalDays } = calcLifecyclePercent(startDate, endDate);
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) {
    return (
      <div className="text-xs text-gray-400">날짜 미설정</div>
    );
  }

  const heightMap = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };
  const barHeight = heightMap[size];
  const color = getGaugeColor(percent);
  const isExpired = percent >= 100;

  return (
    <div className="w-full">
      {/* Label row */}
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color }}>
            {isExpired ? "만료됨" : `${Math.round(percent)}% 경과`}
          </span>
          <span className="text-xs text-gray-500">
            {isExpired ? "만료" : `D-${daysLeft}`}
          </span>
        </div>
      )}

      {/* Gauge bar */}
      <div className={`w-full ${barHeight} rounded-full bg-gray-100 overflow-hidden relative`}>
        <div
          className={`${barHeight} rounded-full transition-all duration-500`}
          style={{
            width: `${Math.max(2, percent)}%`,
            background: getGaugeBgGradient(percent),
          }}
        />
        {/* Threshold markers */}
        {showThresholds && (
          <>
            {[50, 80, 95].map((th) => (
              <div
                key={th}
                className="absolute top-0 bottom-0 w-px bg-gray-300"
                style={{ left: `${th}%` }}
                title={`${th}%`}
              />
            ))}
          </>
        )}
      </div>

      {/* Dates & detail */}
      {showDates && (
        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
          <span>{formatDate(start)}</span>
          <span className="text-gray-500">{totalDays}일 중 {Math.min(totalDays, totalDays - daysLeft)}일 경과</span>
          <span>{formatDate(end)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline gauge for list pages (table cells)
 */
export function LifecycleGaugeInline({
  startDate,
  endDate,
}: {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}) {
  const { percent, daysLeft } = calcLifecyclePercent(startDate, endDate);
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) return <span className="text-xs text-gray-300">—</span>;

  const color = getGaugeColor(percent);
  const isExpired = percent >= 100;

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${Math.max(2, percent)}%`,
            background: getGaugeBgGradient(percent),
          }}
        />
      </div>
      <span className="text-[10px] font-medium whitespace-nowrap" style={{ color }}>
        {isExpired ? "만료" : `D-${daysLeft}`}
      </span>
    </div>
  );
}
