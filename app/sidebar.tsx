"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Users,
  Network,
  Cloud,
  HardDrive,
  Globe,
  BarChart3,
  History,
  Settings,
  Upload,
  FileSignature,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Package,
  UserCircle,
  BookOpen,
  Bell,
  Map,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  authRequired?: boolean;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
  collapsible?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "",
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/asset-map", labelKey: "assetMap", icon: <Map className="h-4 w-4" /> },
      { href: "/hardware", labelKey: "hardware", icon: <HardDrive className="h-4 w-4" /> },
      { href: "/licenses", labelKey: "licenses", icon: <FileText className="h-4 w-4" /> },
      { href: "/cloud", labelKey: "cloud", icon: <Cloud className="h-4 w-4" /> },
      { href: "/domains", labelKey: "domainSsl", icon: <Globe className="h-4 w-4" /> },
      { href: "/contracts", labelKey: "contracts", icon: <FileSignature className="h-4 w-4" /> },
      { href: "/employees", labelKey: "employees", icon: <Users className="h-4 w-4" /> },
      { href: "/org", labelKey: "orgChart", icon: <Network className="h-4 w-4" /> },
      { href: "/reports", labelKey: "reports", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/history", labelKey: "changeHistory", icon: <History className="h-4 w-4" /> },
    ],
  },
  {
    titleKey: "settings",
    collapsible: true,
    items: [
      { href: "/settings/profile", labelKey: "profile", icon: <UserCircle className="h-4 w-4" />, authRequired: true },
      { href: "/settings/groups", labelKey: "groupSettings", icon: <Settings className="h-4 w-4" /> },
      { href: "/settings/notifications", labelKey: "notificationSettings", icon: <Bell className="h-4 w-4" /> },
      { href: "/settings/import", labelKey: "dataImport", icon: <Upload className="h-4 w-4" />, authRequired: true },
      { href: "/guide", labelKey: "adminGuide", icon: <BookOpen className="h-4 w-4" /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getLabel = (key: string) => {
    return (t.nav as Record<string, string>)[key] ?? key;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col" data-tour="sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <Package className="h-5 w-5 text-blue-600" />
        <Link href="/dashboard" className="text-sm font-bold text-gray-900">
          Asset Manager
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const groupTitle = group.titleKey ? getLabel(group.titleKey) : "";
          const isCollapsed = group.collapsible && collapsedGroups[group.titleKey];

          return (
            <div key={group.titleKey || "main"} className={groupTitle ? "mt-6" : ""}>
              {groupTitle && (
                <button
                  onClick={() => group.collapsible && toggleGroup(group.titleKey)}
                  className="mb-1 flex w-full items-center gap-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
                >
                  {group.collapsible && (
                    isCollapsed
                      ? <ChevronRight className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />
                  )}
                  {groupTitle}
                </button>
              )}
              {!isCollapsed && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive(item.href)
                            ? "bg-blue-50 font-medium text-blue-700"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        {item.icon}
                        {getLabel(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-gray-200 bg-white pt-14 md:block">
        {sidebarContent}
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-md bg-white p-2 shadow-md md:hidden"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-60 bg-white shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-3 rounded p-1 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
