/** Supabase auth errors, in words someone can act on. */
const KNOWN: Record<string, string> = {
  same_password: "That is already your password. Pick a different one.",
  weak_password: "That password is too easy to guess. Try a longer one.",
  over_request_rate_limit:
    "Too many attempts just now. Wait a minute, then try again.",
  over_email_send_rate_limit:
    "That is a lot of reset emails. Wait a few minutes, then try again.",
  session_not_found:
    "That reset link has expired or has already been used. Ask for a new one.",
};

export function friendly(error: { code?: string; message: string }): string {
  if (error.code && KNOWN[error.code]) return KNOWN[error.code];
  const m = error.message.toLowerCase();
  if (m.includes("should be different")) return KNOWN.same_password;
  if (m.includes("rate limit") || m.includes("only request this after")) {
    return KNOWN.over_request_rate_limit;
  }
  return error.message;
}
