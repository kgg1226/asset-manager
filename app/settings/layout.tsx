"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserCircle, Users, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TABS = [
  { href: "/settings/profile", label: "내 프로필", icon: UserCircle, adminOnly: false },
  { href: "/settings/groups", label: "그룹 관리", icon: Users, adminOnly: true },
  { href: "/settings/import", label: "데이터 가져오기", icon: Upload, adminOnly: true },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <>
      {/* 설정 탭 네비게이션 바 */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {visibleTabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
