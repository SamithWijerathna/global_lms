"use client";

import { useState, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  Settings,
  ChevronLeft,
  Menu,
  UserRound,
  BookOpen,
  Package,
  FileText,
  PlusCircle,
  List,
  Upload,
  CheckSquare,
  Banknote,
  CheckCheck
} from "lucide-react";

const mainNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Performance", href: "/performance", icon: BarChart3 },
  { name: "Class Store", href: "/classStore", icon: Package },
  { name: "My Classes", href: "/myClasses", icon: List },
  // { name: "Quiz", href: "/quiz", icon: CheckSquare },
  { name: "Class Materials", href: "/classMaterials", icon: BookOpen },
];

const settingsItems = [
  { name: "Edit Profile", href: "/settings/editProfile", icon: UserRound },
  { name: "Payment History", href: "/settings/paymentHistory", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  // Always start as false (expanded) → matches server render
  const [collapsed, setCollapsed] = useState(false);

  // Load saved preference only after component mounts (avoids hydration mismatch)
  useLayoutEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  // Save to localStorage whenever it changes
  useLayoutEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const firstPaint = useRef(true);
  useLayoutEffect(() => {
    firstPaint.current = false;
  }, []);

  const renderNavItem = (item: any) => {
    const Icon = item.icon;
    const isActive = (pathname ?? "").endsWith(item.href);
    return (
      <Link
        key={item.name}
        href={item.href}
        className={`relative flex items-center h-11 px-4 mx-2 rounded-lg group ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        } ${collapsed ? "justify-center" : "gap-3"} ${
          firstPaint.current ? "" : "transition-all duration-300"
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span
          className={`text-sm whitespace-nowrap ${
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-[140px]"
          } ${firstPaint.current ? "" : "transition-all duration-300"}`}
        >
          {item.name}
        </span>
        {collapsed && (
          <div className="absolute left-14 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            {item.name}
          </div>
        )}
      </Link>
    );
  };

  const renderSectionDivider = (label: string) => (
    <div className="my-4 px-4">
      <div className="relative flex items-center">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        {!collapsed && (
          <span className="px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-white dark:bg-gray-900">
            {label}
          </span>
        )}
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );

  return (
    <aside
      className={`h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col ${
        collapsed ? "w-16" : "w-56"
      } ${firstPaint.current ? "" : "transition-all duration-300"} hidden sm:flex`}
      /*
        hidden: always hidden by default
        sm:flex: visible as flex on small screens (>=640px) and up
        On mobile (<640px), sidebar will be hidden
      */
    >
      {/* Brand */}
      <div
        className={`h-14 border-b border-gray-200 dark:border-gray-800 flex items-center ${
          collapsed ? "justify-center" : "px-4"
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <img src="/assets/logo.png" alt="LASHINIGEO LMS" className="w-8 h-8 flex-shrink-0 object-contain filter dark:brightness-0 dark:invert transition-all" />
          <span
            className={`text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap tracking-tight ${
              collapsed ? "opacity-0 w-0 max-w-0" : "opacity-100 w-auto max-w-[170px]"
            } ${firstPaint.current ? "" : "transition-all duration-300"}`}
          >
            LASHINIGEO LMS
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-x-hidden overflow-y-auto hide-scrollbar">
        <div className="space-y-1">
          {mainNavItems.map(renderNavItem)}
          {renderSectionDivider("Settings")}
          {settingsItems.map(renderNavItem)}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-200 dark:border-gray-800 py-3">
        <div className="flex justify-center">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-9 h-9 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}