/** The marker that says "this session came from a password-reset email". */
export const RECOVERY_COOKIE = "campusfix-recovery";
export const RECOVERY_MAX_AGE = 60 * 60;

export const recoveryCookie = {
  name: RECOVERY_COOKIE,
  value: "1",
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: RECOVERY_MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};
