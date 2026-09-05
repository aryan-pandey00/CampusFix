"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SubNavItem = { href: string; label: string };

/** The four admin screens that are all "look at the record". */
export const REPORT_TABS: SubNavItem[] = [
  { href: "/admin/reports", label: "Overview" },
  { href: "/admin/departments", label: "Departments" },
  { href: "/admin/activity", label: "Activity" },
  /* "Roles", not "Accounts": Users in the main nav is the roster you act on,
     and two tabs a word apart would be read as the same place. */
  { href: "/admin/roles", label: "Roles" },
];

/** A segmented row that switches between sibling screens. */
export function SubNav({ items }: { items: SubNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Report views"
      className="mb-5 flex w-full rounded-[var(--radius)] border border-border bg-card p-1 shadow-xs sm:inline-flex sm:w-auto"
    >
      {items.map((item) => {
        const current = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex-1 rounded-[var(--radius-md)] px-3.5 py-1.5 text-center text-[13px] font-medium whitespace-nowrap transition-colors sm:flex-none",
              current
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
