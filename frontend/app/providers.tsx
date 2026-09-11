"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
  initialSettings?: any;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

import { SystemSettingsProvider } from "@/src/lib/useSystemSettings";

export function Providers({ children, themeProps, initialSettings }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <SystemSettingsProvider initialSettings={initialSettings}>{children}</SystemSettingsProvider>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
