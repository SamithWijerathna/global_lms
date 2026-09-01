"use client";

import "@/styles/globals.css";
import React from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/admin/Header";
import { Sidebar } from "@/components/admin/Sidebar";
import { CommandMenu } from "@/components/admin/CommandMenu";
import { GlobalConfirmProvider } from "@/components/admin/GlobalConfirm";

import {
  Home,
  BarChart3,
  UserRound,
  List,
  Banknote,
  Settings,
  PlusCircle,
  BookOpen,
  Package,
  FileText,
  Upload,
  CheckSquare,
  CheckCheck
} from "lucide-react";

export default function RootLayout({
  
  children,
}: {
  children: React.ReactNode;
}) {
  
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <>
      <GlobalConfirmProvider>
        <div className="flex h-screen">
          <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMobileMenuClick={() => setMobileSidebarOpen(true)} />     
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-2 sm:p-4 md:p-8">
              {children}
            </main>
          </div>
          <CommandMenu />
        </div>
      </GlobalConfirmProvider>
    </>
  );
}
