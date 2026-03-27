"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, LogIn } from "lucide-react";
import GlobalSearch from "./global-search";
import NotificationBell from "./notification-bell";
import LanguageToggle from "./language-toggle";
import { useTranslation } from "@/lib/i18n";

interface TopHeaderProps {
  user: { username: string; role: string } | null;
}

export default function TopHeader({ user }: TopHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:left-60">
      <div className="hidden sm:block" data-tour="global-search">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3" data-tour="user-menu">
        <NotificationBell />

        {/* Language Toggle */}
        <LanguageToggle />

        {/* User / Login */}
        {user ? (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700">{user.username}</span>
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${user.role === "ADMIN" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
              {user.role === "ADMIN" ? t.header.administrator : t.header.user}
            </span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="ml-1 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              title={t.common.logout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <LogIn className="h-4 w-4" />
            {t.common.login}
          </Link>
        )}
      </div>
    </header>
  );
}
