"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  LineChart,
  Megaphone,
  LogOut,
  PlusCircle,
  UserCog,
  Wrench,
} from "lucide-react";
import { Initial } from "@/components/initial";
import { homeFor } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth";

type Item = {
  href: string;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Other routes this entry owns. A grouped screen has one nav entry and
   * several URLs — see SubNav — and the entry has to stay lit on all of them,
   * or moving between tabs looks like leaving the section.
   */
  matches?: string[];
};

/* Four, and Notices was nearly left out. */
const STUDENT: Item[] = [
  { href: "/home", label: "Home", short: "Home", icon: LayoutDashboard },
  { href: "/report", label: "Report an issue", short: "Report", icon: PlusCircle },
  { href: "/my-complaints", label: "My complaints", short: "Mine", icon: ClipboardList },
  { href: "/notices", label: "Notices", short: "Notices", icon: Megaphone },
];

/*
   Two destinations, which is the whole of a department's job here: the work in
   front of them, and what the office has announced.
*/
const STAFF: Item[] = [
  { href: "/work", label: "My queue", short: "Queue", icon: Inbox },
  { href: "/notices", label: "Notices", short: "Notices", icon: Megaphone },
];

/* Five, and it was seven. */
const ADMIN: Item[] = [
  { href: "/admin", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/admin/complaints", label: "Queue", short: "Queue", icon: Inbox },
  { href: "/admin/announcements", label: "Announcements", short: "Notices", icon: Megaphone },
  {
    href: "/admin/reports",
    label: "Reports",
    short: "Reports",
    icon: LineChart,
    matches: ["/admin/departments", "/admin/activity", "/admin/roles"],
  },
  { href: "/admin/users", label: "Users", short: "Users", icon: UserCog },
];

function isCurrent(pathname: string, item: Item) {
  const { href, matches } = item;
  if (matches?.some((m) => pathname === m || pathname.startsWith(`${m}/`))) {
    return true;
  }
  if (href === "/admin") return pathname === "/admin";
  if (href === "/report") return pathname === "/report" || pathname.startsWith("/report/");
  // /work holds the complaint detail pages under it, so a plain prefix match
  // is right. The exception this used to carve out for /work/notices went away
  // when notices moved to /notices, shared with the student side.
  if (href === "/work") {
    return pathname === "/work" || pathname.startsWith("/work/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The application shell. */
export function AppShell({
  role,
  name,
  email,
  departmentName,
  signOut,
  children,
}: {
  role: Role;
  name: string | null;
  email: string | null;
  /** Staff only. Their department is who they are on every screen. */
  departmentName?: string | null;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = role === "admin" ? ADMIN : role === "staff" ? STAFF : STUDENT;
  const home = homeFor(role);
  // A department member is identified by their department, not by the word
  // "staff" — which is internal vocabulary nobody would use about themselves.
  const roleLabel =
    role === "admin"
      ? "Administrator"
      : role === "staff"
        ? (departmentName ?? "Department")
        : "Student";

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_minmax(0,1fr)]">
      {/* ---------- desktop rail ---------- */}
      <aside className="hidden bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link href={home} className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Wrench className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em]">
              CampusFix
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <p className="px-2.5 pb-2 text-[10px] font-semibold tracking-[0.11em] text-sidebar-muted uppercase">
            {role === "admin"
              ? "Maintenance office"
              : role === "staff"
                ? "Assigned to you"
                : "Your issues"}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const current = isCurrent(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      current
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    {/* A 2px mint edge on the active item. The fill alone is a
                        very low-contrast change on an ink ground. */}
                    {current ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-sidebar-primary"
                      />
                    ) : null}
                    <item.icon
                      className={cn(
                        "size-[17px] shrink-0",
                        current ? "text-sidebar-primary" : "",
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          {/* The account block is the way to /profile, on purpose. */}
          <Link
            href="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={cn(
              "mb-1 flex items-center gap-2.5 rounded-md px-1.5 py-2 transition-colors",
              pathname === "/profile"
                ? "bg-sidebar-accent"
                : "hover:bg-sidebar-accent/60",
            )}
          >
            <Initial
              name={name}
              email={email}
              className="bg-sidebar-accent text-sidebar-foreground"
            />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{name ?? email}</p>
              <p className="truncate text-[11px] text-sidebar-muted">
                {roleLabel}
              </p>
            </div>
            <ChevronRight className="ml-auto size-4 shrink-0 text-sidebar-muted" />
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogOut className="size-[17px]" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ---------- canvas ---------- */}
      <div className="flex min-w-0 flex-col">
        {/* mobile top bar: the rail's job, in one line */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <Link href={home} className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded bg-primary text-primary-foreground">
              <Wrench className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-[-0.01em]">
              CampusFix
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {role === "student" ? null : (
              <span className="max-w-[9rem] truncate rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                {role === "admin" ? "Admin" : roleLabel}
              </span>
            )}
            <Link
              href="/profile"
              aria-label="Your account"
              aria-current={pathname === "/profile" ? "page" : undefined}
              className="shrink-0 rounded-full"
            >
              <Initial
                name={name}
                email={email}
                size="md"
                className={cn(
                  "transition-colors",
                  pathname === "/profile"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              />
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      {/* ---------- mobile bottom tabs ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <ul
          className="mx-auto grid max-w-lg"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const current = isCurrent(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                    current ? "font-medium text-primary" : "text-muted-foreground",
                  )}
                >
                  {current ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-primary"
                    />
                  ) : null}
                  <item.icon className="size-[18px]" />
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
