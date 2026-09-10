import type { SessionOptions } from "iron-session";

const secret =
  process.env.SESSION_SECRET ||
  process.env.SECRET_COOKIE_PASSWORD ||
  process.env.SESSION_PASSWORD ||
  "complex_password_at_least_32_characters_long_for_lms_payment_session";

export const sessionOptions: SessionOptions = {
  password: secret.length >= 32 ? secret : secret.padEnd(32, "0"),
  cookieName: "lesson_payment_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};