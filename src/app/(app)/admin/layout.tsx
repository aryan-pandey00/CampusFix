import { requireAdmin } from "@/lib/auth";

/**
 * The admin gate. A student who types /admin into the address bar is bounced
 * to /report here — hiding the link in the UI is not enforcement.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return <>{children}</>;
}
