import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { relName } from "@/lib/complaints/display";

export { homeFor, type Role } from "@/lib/roles";
import { homeFor, type Role } from "@/lib/roles";

export type SessionProfile = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  /** Null for everyone but staff — see the CHECK in 0011_staff.sql. */
  departmentId: string | null;
  departmentName: string | null;
  /**
   * The one account nobody can demote. Not a fourth role: the owner is an
   * ordinary admin carrying a flag, so every policy written against
   * `is_admin()` is untouched by it.
   */
  isSuperAdmin: boolean;
  /** A shared demo account. It cannot delete itself — see 0018. */
  isProtected: boolean;
};

/** A staff session, with the department the CHECK constraint guarantees. */
export type StaffSession = SessionProfile & { departmentId: string };

/** The signed-in user and their profile, or null. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // The department comes along on this same query rather than a second one:
  // every signed-in screen loads this, and the shell prints the department name
  // beside a staff member's own name.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, department_id, is_super_admin, is_protected, departments(name)",
    )
    .eq("id", user.id)
    .single();

  // No profile means the sign-up trigger did not fire (see 0005). Treat it as
  // unauthenticated rather than guessing a role.
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role as Role,
    departmentId: (profile.department_id as string | null) ?? null,
    departmentName: relName(profile.departments),
    isSuperAdmin: profile.is_super_admin === true,
    isProtected: profile.is_protected === true,
  };
}

export async function requireUser(): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  return session;
}

/**
 * The real admin gate. The proxy only checks that *someone* is signed in; this
 * is what stops a student who types /admin into the address bar.
 */
export async function requireAdmin(): Promise<SessionProfile> {
  const session = await requireUser();
  if (session.role !== "admin") redirect(homeFor(session.role));
  return session;
}

/** The same gate for /work. */
export async function requireStaff(): Promise<StaffSession> {
  const session = await requireUser();
  if (session.role !== "staff") redirect(homeFor(session.role));
  // Unreachable while profiles_staff_has_department holds, and not
  // redirected with homeFor: staff's home IS /work, so that would be a
  // redirect loop.
  if (!session.departmentId) redirect("/home");
  return session as StaffSession;
}
