import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all request paths including /api except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - uploads (static media)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|uploads).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "lms.circleone.asia").toLowerCase();

  // Clean host (remove port if local)
  const currentHost = hostname.replace(/:\d+$/, "").toLowerCase();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-domain", currentHost);

  // 1. Subdomain Check: e.g. "academy1.lms.circleone.asia"
  if (currentHost !== rootDomain && currentHost.endsWith(`.${rootDomain}`)) {
    const subdomain = currentHost.slice(0, -(rootDomain.length + 1));
    if (subdomain && !["www", "admin", "app", "cname", "api"].includes(subdomain)) {
      requestHeaders.set("x-tenant-slug", subdomain);
      requestHeaders.set("x-is-subdomain", "true");
    }
  } else if (
    currentHost !== rootDomain &&
    !currentHost.includes("localhost") &&
    !currentHost.includes("127.0.0.1")
  ) {
    // 2. Custom Domain Check: e.g. "app.rchem.lk"
    requestHeaders.set("x-custom-domain", currentHost);
    requestHeaders.set("x-is-custom-domain", "true");
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
