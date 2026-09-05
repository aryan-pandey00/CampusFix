import { requireStaff } from "@/lib/auth";

/** The department gate. */
export default async function WorkLayout({ children }: LayoutProps<"/work">) {
  await requireStaff();
  return <>{children}</>;
}
