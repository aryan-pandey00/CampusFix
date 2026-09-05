import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { recoveryCookie } from "@/lib/recovery";
import { safePath } from "@/lib/site-url";

/** Where the emailed link lands. */

/** Only these reach verifyOtp. `type` arrives in a URL, so it is not trusted. */
const OTP_TYPES = new Set<string>([
  "recovery",
  "email",
  "magiclink",
  "signup",
  "invite",
  "email_change",
]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // Supabase appends these when it has already rejected the token itself —
  // an expired link never reaches the exchange below.
  const rejected =
    searchParams.get("error_description") ?? searchParams.get("error");

  // Parsed, not prefix-tested: `/\host` reaches `http://host/` through
  // NextResponse.redirect() below, and this route redirects after setting the
  // session cookies. safePath() carries the measurement.
  const next = safePath(searchParams.get("next")) ?? "/auth/reset";

  /* Failures go back to /auth/forgot, not to a dead end. */
  const failed = (reason: string) =>
    NextResponse.redirect(new URL(`/auth/forgot?failed=${reason}`, origin));

  if (rejected) return failed("expired");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // A missing code verifier and a used code are indistinguishable from here,
    // and the wrong-browser case is by far the likelier of the two — nobody
    // clicks a reset link twice, but plenty of people read email on a phone.
    if (error) return failed("browser");
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) return failed("expired");
  } else {
    return failed("unreadable");
  }

  const response = NextResponse.redirect(new URL(next, origin));

  /*
     The one place the recovery marker is minted, and only after an exchange
     that actually succeeded — every failure above has already returned.
  */
  if (next === "/auth/reset") {
    response.cookies.set(recoveryCookie);
  }

  return response;
}
