import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth";

/** What an account is, as one chip. */
export function RoleChip({
  role,
  isSuperAdmin,
  className,
}: {
  role: Role;
  isSuperAdmin?: boolean;
  className?: string;
}) {
  const label = isSuperAdmin
    ? "Owner"
    : role === "staff"
      ? "Department"
      : role === "admin"
        ? "Admin"
        : "Student";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        isSuperAdmin
          ? "border-transparent bg-primary text-primary-foreground"
          : role === "admin"
            ? "border-transparent bg-primary/12 text-primary"
            : role === "staff"
              ? "border-transparent bg-secondary text-secondary-foreground"
              : "border-border bg-transparent text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
