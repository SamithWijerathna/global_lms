export const getBackendApiUrl = (): string => {
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_BACKEND_API_URL) {
      return process.env.NEXT_PUBLIC_BACKEND_API_URL.replace(/\/$/, "");
    }
    const hostname = window.location.hostname;
    if (hostname.includes("circleone.asia") || hostname.endsWith(".circleone.asia")) {
      return "https://api.lms.circleone.asia";
    }
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${hostname}:5050`;
    }
    return "https://api.lms.circleone.asia";
  }
  return process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.lms.circleone.asia";
};
