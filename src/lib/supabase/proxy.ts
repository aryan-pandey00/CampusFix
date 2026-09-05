import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { homeFor, type Role } from "@/lib/roles";

/** Routes reachable without a session. Everything else needs one. */
const PUBLIC_ROUTES = ["/login", "/signup", "/auth"];

/**
 * `/` is the public landing page, so it is reachable without a session — but
 * only exactly. Everything below it still requires one.
 */
const isPublic = (pathname: string) =>
  pathname === "/" ||
  PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

/**
 * Refreshes the Supabase session cookie on every request and turns unsigned-in
 * visitors away from protected routes.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Both halves matter: the request copy is what the rest of this
          // request sees, the response copy is what the browser stores. Drop
          // either and the user is silently signed out on the next navigation.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates the token with Supabase. getSession() would just
  // trust whatever cookie arrived, which is not a decision to make here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed so login can send them back.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    /*
      Their own screen, not the front door. A stale /login link, a bookmark or
      the back button after signing in used to land on the landing page, which
      is the same "press one more button to get where you were going" that
      sign-up had.

      Falls back to "/" when there is no profile row, and that is not
      defensive dressing: requireUser() sends a session with no profile to
      /login, so redirecting one to /home here would bounce it straight back
      and loop. The landing page is public and handles it.
    */
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname = profile ? homeFor(profile.role as Role) : "/";
    return NextResponse.redirect(url);
  }

  return response;
}
