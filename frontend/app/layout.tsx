import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";

import { getSystemSettingsServer } from "@/src/lib/getSystemSettings";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSystemSettingsServer();
    const title = settings.site_title || "LMS Platform";
    const favicon = settings.site_favicon_url || "/assets/logo-icon.png";

    return {
      title: {
        default: title,
        template: `%s - ${title}`,
      },
      description: `${title} Learning Management System`,
      icons: {
        icon: favicon,
        shortcut: favicon,
        apple: favicon,
      },
    };
  } catch (err) {
    return {
      title: {
        default: "LMS Platform",
        template: "%s - LMS Platform",
      },
      description: "LMS Platform",
      icons: {
        icon: "/assets/logo-icon.png",
        shortcut: "/assets/logo-icon.png",
        apple: "/assets/logo-icon.png",
      },
    };
  }
}


export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen text-foreground bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
  


              {children}
       
           
       
        </Providers>
      </body>
    </html>
  );
}
