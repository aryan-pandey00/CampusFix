/** Where an emailed link should come back to. */
export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** The one redirect target every reset link uses. */
export function resetRedirectTo() {
  return `${siteUrl()}/auth/callback?next=/auth/reset`;
}

/**
 * A `?next=` value reduced to a path on this site, or null.
 *
 * MEASURED, because a string test is not enough: the old guard was
 * `startsWith("/") && !startsWith("//")`, and `/\evil.com` passes both while
 * `new URL()` — which is what the browser and NextResponse.redirect() use —
 * resolves it to `http://evil.com/`. A backslash is a path separator to the URL
 * parser, so the only honest test is to parse it and look at the host.
 */
export function safePath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.length > 512) return null;
  try {
    const url = new URL(value, "http://campusfix.invalid");
    if (url.host !== "campusfix.invalid") return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
