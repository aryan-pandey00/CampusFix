/**
 * What a role is, and where that role lives.
 *
 * Its own module with no imports, because the two places that most need it
 * cannot reach `lib/auth.ts` — that file pulls in the server Supabase client,
 * which is unavailable in the proxy and in a Client Component. Both had
 * therefore grown their own copy of this three-line mapping, which is how the
 * nav rail and the sign-in redirect end up disagreeing about where somebody
 * belongs. `lib/auth.ts` re-exports both names, so every existing import of
 * them still works.
 */

export type Role = "student" | "staff" | "admin";

/** Where a role belongs after signing in. */
export function homeFor(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/work";
  return "/home";
}
