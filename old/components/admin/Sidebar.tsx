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
  CheckCheck,
  Users
} from "lucide-react";

const mainNavItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: Home },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Students", href: "/admin/students", icon: UserRound },
];

const classManagementItems = [
  { name: "Add New Class", href: "/admin/classes/add", icon: PlusCircle },
  { name: "Class List", href: "/admin/classes", icon: List },
  { name: "Class Materials", href: "/admin/classes/materials", icon: BookOpen },
  { name: "Add Material", href: "/admin/classes/materials/add", icon: Upload },
];

const studyPackItems = [
  { name: "Add New Pack", href: "/admin/studypack/add", icon: PlusCircle },
  { name: "Pack List", href: "/admin/studypack", icon: Package },
];
const paymentManagementItems = [
  { name: "Payments Management", href: "/admin/payments/manage", icon: Banknote },
  { name: "Payments Approval", href: "/admin/payments", icon: CheckCheck },
];

const paperManagerItems = [
  { name: "Add New Paper", href: "/admin/papers/add", icon: PlusCircle },
  { name: "Paper List", href: "/admin/papers", icon: FileText },
  { name: "Add Marks", href: "/admin/papers/marks/add", icon: CheckSquare },
  { name: "Marks Management", href: "/admin/papers/marks", icon: List },
];

const quizzesManagerItems = [
  { name: "Quizz Manager", href: "/admin/quizzes", icon: List },
];

import { useEffect } from "react";
export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen?: boolean; setMobileOpen?: (open: boolean) => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [showMobile, setShowMobile] = useState(false);
  const firstPaint = useRef(true);
  useLayoutEffect(() => {
    firstPaint.current = false;
  }, []);
  useLayoutEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);
  useEffect(() => {
    setShowMobile(!!mobileOpen);
  }, [mobileOpen]);
  const renderNavItem = (item: any) => {
    const Icon = item.icon;
    const isActive = pathname.endsWith(item.href);
    return (
      <Link
        key={item.name}
        href={item.href}
        className={`relative flex items-center h-11 px-3 mx-2 rounded-lg group ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        } ${!showMobile && collapsed ? "justify-center" : "gap-3"} ${
          firstPaint.current ? "" : "transition-all duration-300"
        }`}
        onClick={() => {
          if (showMobile && setMobileOpen) setMobileOpen(false);
        }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span
          className={`text-sm font-medium whitespace-nowrap ${
            !showMobile && collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 flex-1 min-w-0 truncate"
          } ${firstPaint.current ? "" : "transition-all duration-300"}`}
        >
          {item.name}
        </span>
        {!showMobile && collapsed && (
          <div className="absolute left-14 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {item.name}
          </div>
        )}
      </Link>
    );
  };
  const renderSectionDivider = (label: string) => {
    if (!showMobile && collapsed) {
      return <div className="my-3 mx-3 border-t border-gray-200 dark:border-gray-800" />;
    }
    return (
      <div className="mt-5 mb-2 px-4 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
          {label}
        </span>
        <div className="flex-1 h-px bg-gray-200/80 dark:bg-gray-800" />
      </div>
    );
  };
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${showMobile ? "block" : "hidden"} md:hidden`}
        onClick={() => setMobileOpen && setMobileOpen(false)}
      />
      <aside
        className={`h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col ${
          showMobile ? "w-64" : collapsed ? "w-16" : "w-64"
        } ${firstPaint.current ? "" : "transition-all duration-300"} 
        ${showMobile ? "fixed z-50 left-0 top-0" : "hidden md:flex md:static"}`}
        style={showMobile ? { height: "100vh" } : {}}
      >
        {/* Brand */}
        <div
          className={`h-14 border-b border-gray-200 dark:border-gray-800 flex items-center ${
            !showMobile && collapsed ? "justify-center" : "px-4"
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden w-full">
            <img src="/assets/logo.png" alt="LASHINIGEO LMS" className="w-8 h-8 flex-shrink-0 object-contain filter dark:brightness-0 dark:invert transition-all" />
            <span
              className={`text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap tracking-tight flex-1 ${
                !showMobile && collapsed ? "opacity-0 w-0 max-w-0" : "opacity-100 w-auto"
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
            {renderSectionDivider("Class Management")}
            {classManagementItems.map(renderNavItem)}
            {renderSectionDivider("Payment Management")}
            {paymentManagementItems.map(renderNavItem)}
            {/* {renderSectionDivider("Study Pack")}
            {studyPackItems.map(renderNavItem)} */}
            {renderSectionDivider("Paper Manager")}
            {paperManagerItems.map(renderNavItem)}
            {/* {renderSectionDivider("Quizzes Manager")}
            {quizzesManagerItems.map(renderNavItem)} */}
          </div>
        </nav>
        {/* Bottom */}
        <div className="border-t border-gray-200 dark:border-gray-800 py-3">
          <Link
            href="/admin/settings?tab=usermanagement"
            onClick={() => {
              if (showMobile && setMobileOpen) setMobileOpen(false);
            }}
            className={`relative flex items-center h-11 px-3 mx-2 rounded-lg group ${
              pathname === "/admin/settings"
                ? "bg-primary/10 text-primary font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            } ${!showMobile && collapsed ? "justify-center" : "gap-3"} ${
              firstPaint.current ? "" : "transition-all duration-300"
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            <span
              className={`text-sm font-medium whitespace-nowrap ${
                !showMobile && collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 flex-1 min-w-0 truncate"
              } ${firstPaint.current ? "" : "transition-all duration-300"}`}
            >
              User Manager
            </span>
          </Link>
          <Link
            href="/admin/settings"
            onClick={() => {
              if (showMobile && setMobileOpen) setMobileOpen(false);
            }}
            className={`relative flex items-center h-11 px-3 mx-2 rounded-lg group text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 ${!showMobile && collapsed ? "justify-center" : "gap-3"} ${
              firstPaint.current ? "" : "transition-all duration-300"
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span
              className={`text-sm font-medium whitespace-nowrap ${
                !showMobile && collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 flex-1 min-w-0 truncate"
              } ${firstPaint.current ? "" : "transition-all duration-300"}`}
            >
              Settings
            </span>
          </Link>
          <div className="my-3 mx-6 border-t border-gray-200 dark:border-gray-700"></div>
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (showMobile && setMobileOpen) {
                  setMobileOpen(false);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={showMobile ? "Close sidebar" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {showMobile ? <ChevronLeft className="w-5 h-5" /> : collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}