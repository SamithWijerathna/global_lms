"use client";

import { useEffect, useRef } from "react";
import LoadingBar from "react-top-loading-bar";
import { usePathname, useRouter } from "next/navigation";

import { GlobalConfirmProvider } from "@/components/GlobalConfirm";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { CommandMenu } from "@/components/CommandMenu";
import { ExpandableTabs, ExpandableTabsItem } from "@/components/motion/expandable-tabs";
import { AnimatedSidebarProvider } from "@/components/motion/animated-sidebar";

import {
  VscHome,
  VscGraphLine,
  VscPackage,
  VscBook,
  VscNotebook,
  VscAccount,
  VscHistory,
} from "react-icons/vsc";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const loadingRef = useRef<any>(null);

  useEffect(() => {
    loadingRef.current?.complete();
  }, [pathname]);

  const handleNavigation = (path: string) => {
    loadingRef.current?.continuousStart();
    router.push(path);
  };

  const items: ExpandableTabsItem[] = [
    { id: "/dashboard", label: "Dashboard", icon: <VscHome size={18} />, content: null },
    { id: "/performance", label: "Performance", icon: <VscGraphLine size={18} />, content: null },
    { id: "/class-store", label: "Class Store", icon: <VscPackage size={18} />, content: null },
    { id: "/my-classes", label: "My Classes", icon: <VscBook size={18} />, content: null },
    { id: "/class-materials", label: "Class Materials", icon: <VscNotebook size={18} />, content: null },
    { id: "/settings/edit-profile", label: "Edit Profile", icon: <VscAccount size={18} />, content: null },
    { id: "/settings/payment-history", label: "Payment History", icon: <VscHistory size={18} />, content: null },
  ];

  const activeTabId = items.find((item) => pathname === item.id || (item.id !== "/" && (pathname ?? "").startsWith(item.id)))?.id ?? null;

  return (
    <>
      <LoadingBar
        color="#3b82f6"
        ref={loadingRef}
        height={3}
        shadow={true}
      />

      <GlobalConfirmProvider>
        <AnimatedSidebarProvider defaultOpen={true}>
          <div className="flex h-screen w-full min-w-0 overflow-hidden">
            <Sidebar />

            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 sm:hidden">
              <ExpandableTabs
                items={items}
                value={activeTabId}
                onValueChange={(id) => {
                  if (id && id !== pathname) {
                    handleNavigation(id);
                  }
                }}
              />
            </div>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto bg-background text-foreground p-4 sm:p-8 pb-28 sm:pb-8">
                {children}
              </main>
            </div>

            <CommandMenu />
          </div>
        </AnimatedSidebarProvider>
      </GlobalConfirmProvider>
    </>
  );
}