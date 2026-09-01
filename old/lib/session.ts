export const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "lesson_payment_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};