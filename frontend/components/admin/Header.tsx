"use client";
import React from "react";
import {useAuth} from "@/src/lib/useAdminAuth";
import { useTheme } from "next-themes";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from "@heroui/dropdown";
import { Button, ButtonGroup } from "@heroui/button";
import { Avatar, AvatarGroup, AvatarIcon } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { ThemeSwitch } from "@/components/theme-switch";
import { useRouter } from "next/navigation";
import { CommandMenu, commandMenu } from "@/components/admin/CommandMenu";

import {
  TwitterIcon,
  GithubIcon,
  DiscordIcon,
  HeartFilledIcon,
  SearchIcon,
  Logo,
} from "@/components/icons";
import { Input } from "@heroui/input";
import { Kbd } from "@heroui/kbd";
import { Bell, Settings, LogOut, User } from "lucide-react";
export const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      >
        <path d="M6 12h12" />
        <path d="M12 18V6" />
      </g>
    </svg>
  );
};

export const CopyDocumentIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M15.5 13.15h-2.17c-1.78 0-3.23-1.44-3.23-3.23V7.75c0-.41-.33-.75-.75-.75H6.18C3.87 7 2 8.5 2 11.18v6.64C2 20.5 3.87 22 6.18 22h5.89c2.31 0 4.18-1.5 4.18-4.18V13.9c0-.42-.34-.75-.75-.75Z"
        fill="currentColor"
        opacity={0.4}
      />
      <path
        d="M17.82 2H11.93C9.67 2 7.84 3.44 7.76 6.01c.06 0 .11-.01.17-.01h5.89C16.13 6 18 7.5 18 10.18V16.83c0 .06-.01.11-.01.16 2.23-.07 4.01-1.55 4.01-4.16V6.18C22 3.5 20.13 2 17.82 2Z"
        fill="currentColor"
      />
      <path
        d="M11.98 7.15c-.31-.31-.84-.1-.84.33v2.62c0 1.1.93 2 2.07 2 .71.01 1.7.01 2.55.01.43 0 .65-.5.35-.8-1.09-1.09-3.03-3.04-4.13-4.16Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const EditDocumentIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M15.48 3H7.52C4.07 3 2 5.06 2 8.52v7.95C2 19.94 4.07 22 7.52 22h7.95c3.46 0 5.52-2.06 5.52-5.52V8.52C21 5.06 18.93 3 15.48 3Z"
        fill="currentColor"
        opacity={0.4}
      />
      <path
        d="M21.02 2.98c-1.79-1.8-3.54-1.84-5.38 0L14.51 4.1c-.1.1-.13.24-.09.37.7 2.45 2.66 4.41 5.11 5.11.03.01.08.01.11.01.1 0 .2-.04.27-.11l1.11-1.12c.91-.91 1.36-1.78 1.36-2.67 0-.9-.45-1.79-1.36-2.71ZM17.86 10.42c-.27-.13-.53-.26-.77-.41-.2-.12-.4-.25-.59-.39-.16-.1-.34-.25-.52-.4-.02-.01-.08-.06-.16-.14-.31-.25-.64-.59-.95-.96-.02-.02-.08-.08-.13-.17-.1-.11-.25-.3-.38-.51-.11-.14-.24-.34-.36-.55-.15-.25-.28-.5-.4-.76-.13-.28-.23-.54-.32-.79L7.9 10.72c-.35.35-.69 1.01-.76 1.5l-.43 2.98c-.09.63.08 1.22.47 1.61.33.33.78.5 1.28.5.11 0 .22-.01.33-.02l2.97-.42c.49-.07 1.15-.4 1.5-.76l5.38-5.38c-.25-.08-.5-.19-.78-.31Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const DeleteDocumentIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M21.07 5.23c-1.61-.16-3.22-.28-4.84-.37v-.01l-.22-1.3c-.15-.92-.37-2.3-2.71-2.3h-2.62c-2.33 0-2.55 1.32-2.71 2.29l-.21 1.28c-.93.06-1.86.12-2.79.21l-2.04.2c-.42.04-.72.41-.68.82.04.41.4.71.82.67l2.04-.2c5.24-.52 10.52-.32 15.82.21h.08c.38 0 .71-.29.75-.68a.766.766 0 0 0-.69-.82Z"
        fill="currentColor"
      />
      <path
        d="M19.23 8.14c-.24-.25-.57-.39-.91-.39H5.68c-.34 0-.68.14-.91.39-.23.25-.36.59-.34.94l.62 10.26c.11 1.52.25 3.42 3.74 3.42h6.42c3.49 0 3.63-1.89 3.74-3.42l.62-10.25c.02-.36-.11-.7-.34-.95Z"
        fill="currentColor"
        opacity={0.399}
      />
      <path
        clipRule="evenodd"
        d="M9.58 17a.75.75 0 0 1 .75-.75h3.33a.75.75 0 0 1 0 1.5h-3.33a.75.75 0 0 1-.75-.75ZM8.75 13a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
};
export function Header({ onMobileMenuClick }: { onMobileMenuClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        body: new URLSearchParams({ action: "logout" }),
      });
      if (res.ok) {
        router.replace("/admin/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  const searchInput = (
    <Input
      onClick={() => commandMenu.open()}
      aria-label="Search"
      classNames={{
        inputWrapper: "bg-default-100",
        input: "text-sm",
      }}
      endContent={
        <Kbd className="hidden lg:inline-block" keys={["command"]}>
          K
        </Kbd>
      }
      labelPlacement="outside"
      placeholder="Search..."
      startContent={
        <SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />
      }
      type="search"
    />
  );
  return (
    <header className="flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-2 sm:px-4 md:px-8 h-14">
      {/* Left: Mobile menu button & Search */}
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-2 mr-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          aria-label="Open menu"
          onClick={onMobileMenuClick}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {searchInput}
      </div>
      {/* Right: Notifications + User */}
      <div className="flex items-center gap-4">
        {/* Notifications Button */}
        <ThemeSwitch />
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button isIconOnly variant="light" className="relative">
              <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Notifications"
            className="w-[280px] p-0 "
            itemClasses={{
              base: "gap-4 data-[hover=true]:bg-default-100",
            }}
          >
            <DropdownItem key="header" isReadOnly className="h-14 gap-2 bg-default-50 opacity-100 cursor-default">
              <p className="font-semibold text-base">Notifications</p>
            </DropdownItem>
            {/* <DropdownItem key="1" className="py-3">
              🔔 New system update available
            </DropdownItem>
            <DropdownItem key="2" className="py-3">
              🔔 New message from Admin
            </DropdownItem>
            <DropdownItem key="3" className="py-3">
              🔔 Scheduled maintenance tomorrow
            </DropdownItem> */}
          </DropdownMenu>
        </Dropdown>
        {/* User Menu */}
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Avatar
              isBordered
              as="button"
              className="transition-transform"
              src={
                user?.profile_photo
                  ? `/uploads/${user.profile_photo}`
                  : "/assets/default-avatar.png"
              }
              imgProps={{
                onError: (e: any) => {
                  e.target.src = "/assets/default-avatar.png";
                }
              }}
            />

          </DropdownTrigger>
          <DropdownMenu
            aria-label="Custom item styles"
            className="p-1"
            disabledKeys={["profile"]}
            itemClasses={{
              base: [
                "rounded-md",
                "text-default-500",
                "transition-opacity",
                "data-[hover=true]:text-foreground",
                "data-[hover=true]:bg-default-100",
                "dark:data-[hover=true]:bg-default-50",
                "data-[selectable=true]:focus:bg-default-50",
                "data-[pressed=true]:opacity-70",
                "data-[focus-visible=true]:ring-default-500",
              ],
            }}
          >
            <DropdownSection showDivider aria-label="Profile & Actions">
              <DropdownItem key="profile" className="h-14 gap-2">
                <p className="font-normal">{user?.first_name} {user?.last_name}</p>
                <p className="font-normal">{user?.user_email}</p>
              </DropdownItem>
              <DropdownItem key="dashboard">Dashboard</DropdownItem>
              <DropdownItem key="settings">Settings</DropdownItem>
              {/* <DropdownItem key="new_project" endContent={<PlusIcon className="text-large" />}>
            New Project
          </DropdownItem> */}
            </DropdownSection>

            <DropdownSection showDivider aria-label="Preferences">
              <DropdownItem key="quick_search" shortcut="⌘K" onPress={() => commandMenu.open()}>
                Quick search
              </DropdownItem>
              <DropdownItem
                key="theme"
                isReadOnly
                className="cursor-default"
                endContent={
                  <select
                    className="z-10 outline-solid outline-transparent w-16 py-0.5 rounded-md text-tiny group-data-[hover=true]:border-default-500 border-small border-default-300 dark:border-default-200 bg-transparent text-default-500"
                    value={theme} // <-- bind current theme
                    onChange={(e) => setTheme(e.target.value.toLowerCase())} // <-- update theme
                  >
                    <option value="system">System</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                }
              >
                Theme
              </DropdownItem>
            </DropdownSection>

            <DropdownSection aria-label="Help & Feedback">
              <DropdownItem key="help_and_feedback">Help & Feedback</DropdownItem>
              <DropdownItem color="danger" key="logout" onPress={handleLogout}>Log Out</DropdownItem>
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>

      </div>
    </header>
  );
}