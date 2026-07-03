"use client";

// 자산맵 범용 컨텍스트 메뉴 (dev-055) — 엣지/다중선택/빈 캔버스 우클릭 공용.
// 위치(x,y)와 항목 배열만 받는 표현 컴포넌트. 바깥 클릭/Escape 로 닫힌다.
// children 이 있는 항목은 hover 시 오른쪽에 서브메뉴를 펼친다(유형/방향 변경).

import { useEffect, useRef, useState } from "react";

export type MenuItem = {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: MenuItem[];
};

export default function MapContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSub, setOpenSub] = useState<number | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // 화면 밖으로 넘치지 않게 보정 (메뉴 폭 ~192px, 항목 높이 ~32px)
  const left = Math.min(x, typeof window !== "undefined" ? window.innerWidth - 200 : x);
  const top = Math.min(y, typeof window !== "undefined" ? window.innerHeight - items.length * 34 - 16 : y);

  const renderItems = (list: MenuItem[], depth: number) => (
    <div
      className="min-w-[11rem] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
      style={depth > 0 ? { position: "absolute", left: "100%", top: -4 } : undefined}
    >
      {list.map((item, i) => (
        <div
          key={`${depth}-${i}`}
          className="relative"
          onMouseEnter={() => depth === 0 && setOpenSub(item.children ? i : null)}
        >
          <button
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled || item.children) return;
              item.onClick?.();
              onClose();
            }}
            className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition ${
              item.disabled
                ? "cursor-not-allowed text-gray-300"
                : item.danger
                  ? "text-red-600 hover:bg-red-50"
                  : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span>{item.label}</span>
            {item.children && <span className="text-gray-400">▸</span>}
          </button>
          {item.children && openSub === i && renderItems(item.children, depth + 1)}
        </div>
      ))}
    </div>
  );

  return (
    <div ref={ref} className="fixed z-[60]" style={{ left, top }}>
      {renderItems(items, 0)}
    </div>
  );
}
