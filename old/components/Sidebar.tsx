"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/useAuth";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import { Avatar } from "@heroui/avatar";
import {
  Home,
  BarChart3,
  UserRound,
  BookOpen,
  Package,
  FileText,
  List,
  PanelLeft,
  LogOut,
  Settings,
} from "lucide-react";
import {
  AnimatedSidebarProvider,
  AnimatedSidebar,
  AnimatedSidebarHeader,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarGroupContent,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuButton,
  AnimatedSidebarTrigger,
  AnimatedSidebarRail,
  useAnimatedSidebar,
} from "@/components/motion/animated-sidebar";

const mainNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: <Home className="size-4" /> },
  { name: "Performance", href: "/performance", icon: <BarChart3 className="size-4" /> },
  { name: "Class Store", href: "/class-store", icon: <Package className="size-4" /> },
  { name: "My Classes", href: "/my-classes", icon: <List className="size-4" /> },
  { name: "Class Materials", href: "/class-materials", icon: <BookOpen className="size-4" /> },
];

const settingsItems = [
  { name: "Edit Profile", href: "/settings/edit-profile", icon: <UserRound className="size-4" /> },
  { name: "Payment History", href: "/settings/payment-history", icon: <FileText className="size-4" /> },
];

import { useSystemSettings } from "@/src/lib/useSystemSettings";

function BrandHeader() {
  const { state } = useAnimatedSidebar();
  const { settings } = useSystemSettings();
  const collapsed = state === "collapsed";
  const logoUrl = settings.site_logo_url || "/assets/logo.png";
  const title = settings.site_title || "LASHINIGEO LMS";

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden font-semibold">
        <img
          src={logoUrl}
          alt={title}
          className="size-7 shrink-0 object-contain filter dark:brightness-0 dark:invert"
          onError={(e: any) => {
            e.target.src = "/assets/logo.png";
          }}
        />
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight whitespace-nowrap text-foreground">
            {title}
          </span>
        )}
      </Link>
    </div>
  );
}

function UserAccountFooter() {
  const { user } = useAuth();
  const { state } = useAnimatedSidebar();
  const collapsed = state === "collapsed";
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "signout" }),
      });
      if (res.ok) {
        router.replace("/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const initial = user?.first_name?.[0] || user?.user_email?.[0] || "S";
  const fullName = user?.first_name ? `${user.first_name} ${user.last_name || ""}` : "Student Account";
  const userSubtitle = user?.student_id ? `ID: ${user.student_id}` : (user?.user_email || "Student");

  return (
    <Dropdown placement="top-start">
      <DropdownTrigger>
        <button
          type="button"
          className="flex items-center gap-3 w-full p-1.5 rounded-xl hover:bg-muted/70 transition-colors text-left outline-none group cursor-pointer"
        >
          <Avatar
            size="sm"
            name={initial.toUpperCase()}
            src={user?.profile_url || "/assets/default-avatar.png"}
            className="flex-shrink-0 size-8 text-xs font-bold"
            imgProps={{
              onError: (e: any) => {
                e.target.src = "/assets/default-avatar.png";
              },
            }}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {fullName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate font-mono">
                {userSubtitle}
              </p>
            </div>
          )}
        </button>
      </DropdownTrigger>
      <DropdownMenu aria-label="User Actions" className="w-56 p-1">
        <DropdownSection showDivider aria-label="Profile Header">
          <DropdownItem key="user_info" className="h-12 gap-1 cursor-default opacity-100">
            <p className="font-semibold text-xs text-foreground">{fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.user_email || ""}</p>
          </DropdownItem>
          <DropdownItem key="edit_profile" onPress={() => router.push("/settings/edit-profile")}>
            Edit Profile
          </DropdownItem>
          <DropdownItem key="payment_history" onPress={() => router.push("/settings/payment-history")}>
            Payment History
          </DropdownItem>
        </DropdownSection>
        <DropdownSection aria-label="Account Actions">
          <DropdownItem key="logout" color="danger" className="text-danger" onPress={handleLogout}>
            Log Out
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <AnimatedSidebar collapsible="icon" side="left" variant="sidebar">
      <AnimatedSidebarHeader>
        <BrandHeader />
      </AnimatedSidebarHeader>

      <AnimatedSidebarContent>
        <AnimatedSidebarGroup>
          <AnimatedSidebarGroupLabel>Menu</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = (pathname ?? "").endsWith(item.href);
                return (
                  <AnimatedSidebarMenuItem key={item.href}>
                    <AnimatedSidebarMenuButton
                      href={item.href}
                      icon={item.icon}
                      isActive={isActive}
                    >
                      {item.name}
                    </AnimatedSidebarMenuButton>
                  </AnimatedSidebarMenuItem>
                );
              })}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>

        <AnimatedSidebarGroup>
          <AnimatedSidebarGroupLabel>Settings</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {settingsItems.map((item) => {
                const isActive = (pathname ?? "").endsWith(item.href);
                return (
                  <AnimatedSidebarMenuItem key={item.href}>
                    <AnimatedSidebarMenuButton
                      href={item.href}
                      icon={item.icon}
                      isActive={isActive}
                    >
                      {item.name}
                    </AnimatedSidebarMenuButton>
                  </AnimatedSidebarMenuItem>
                );
              })}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      </AnimatedSidebarContent>

      <AnimatedSidebarFooter>
        <UserAccountFooter />
      </AnimatedSidebarFooter>
      <AnimatedSidebarRail />
    </AnimatedSidebar>
  );
}