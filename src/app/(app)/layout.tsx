import { AppShell } from "@/components/app-shell";
import { signOut } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth";

/**
 * Wraps every signed-in screen. The proxy has already turned away anyone
 * without a session; this re-checks server-side because the proxy is an
 * optimistic filter, not the authorization boundary.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireUser();

  return (
    <AppShell
      role={session.role}
      name={session.fullName}
      email={session.email}
      departmentName={session.departmentName}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}
