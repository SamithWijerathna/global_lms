"use client";

import { useEffect, useRef } from "react";
import LoadingBar from "react-top-loading-bar";
import { usePathname, useRouter } from "next/navigation";

import { GlobalConfirmProvider } from "@/components/GlobalConfirm";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { CommandMenu } from "@/components/CommandMenu";
import Dock from "@/components/dock";

import {
  VscHome,
  VscGraphLine,
  VscPackage,
  VscBook,
  VscChecklist,
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

  const items = [
    { icon: <VscHome size={18} />, label: "Dashboard", onClick: () => handleNavigation("/dashboard") },
    { icon: <VscGraphLine size={18} />, label: "Performance", onClick: () => handleNavigation("/performance") },
    { icon: <VscPackage size={18} />, label: "Class Store", onClick: () => handleNavigation("/classStore") },
    { icon: <VscBook size={18} />, label: "My Classes", onClick: () => handleNavigation("/myClasses") },
    // { icon: <VscChecklist size={18} />, label: "Quiz", onClick: () => handleNavigation("/quiz") },
    { icon: <VscNotebook size={18} />, label: "Class Materials", onClick: () => handleNavigation("/classMaterials") },
    { icon: <VscAccount size={18} />, label: "Edit Profile", onClick: () => handleNavigation("/settings/editProfile") },
    { icon: <VscHistory size={18} />, label: "Payment History", onClick: () => handleNavigation("/settings/paymentHistory") },
  ];

  return (
    <>
      <LoadingBar
        color="#3b82f6"
        ref={loadingRef}
        height={3}
        shadow={true}
      />

      <GlobalConfirmProvider>
        <div className="flex h-screen">
          <Sidebar />

          <Dock
            items={items}
            panelHeight={70}
            baseItemSize={50}
            magnification={60}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 pb-28 sm:pb-8">
              {children}
            </main>
          </div>

          <CommandMenu />
        </div>
      </GlobalConfirmProvider>
    </>
  );
}