import Link from "next/link";
import { UserCog, Users } from "lucide-react";
import { requireAdmin, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Page, Panel, Stat } from "@/components/page";
import { RoleChip } from "@/components/role-chip";
import { formatDay } from "@/lib/complaints/display";
import { UserSearch } from "./user-search";
import { UserRowActions, type Person } from "./row-actions";

export const metadata = { title: "Users · CampusFix" };

const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default async function UsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const q = first(sp.q).trim().toLowerCase().slice(0, 60);
  /* Anything else is ignored rather than shown as an empty list. */
  const role = ["student", "staff", "admin"].includes(first(sp.role))
    ? first(sp.role)
    : "";
  // Looked up by key, never printed from the URL — the same rule as ?failed= on
  // /auth/forgot. Deliberately not naming the account: the name would come from
  // a reader-controlled string, and the activity log has the detail.
  const deleted = first(sp.deleted) === "1";

  const supabase = await createClient();

  /* The roster comes from a function, not a table. */
  const [{ data: rows, error }, { data: filed }, { data: departments }] =
    await Promise.all([
      supabase.rpc("admin_list_users"),
      supabase.from("complaints").select("reporter_id"),
      supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
    ]);

  /*
     admin_list_users (0012) orders by created_at with no tiebreaker, and the
     seed created several accounts inside one transaction — Test Admin and Test
     Student share a timestamp to the microsecond. Postgres is free to return a
     tie either way, and it has: the same roster came back with a different
     first row between two sessions. Sorted here rather than in a new migration,
     because a display order is the screen's business.
  */
  const people = [...((rows ?? []) as Person[])].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) ||
      (a.full_name ?? "").localeCompare(b.full_name ?? "") ||
      a.id.localeCompare(b.id),
  );

  // Tallied here rather than asked for per user: one query for the whole board
  // beats one per row, and the admin can already read every complaint.
  const counts = new Map<string, number>();
  for (const c of filed ?? []) {
    // Skipped rather than counted: reporter_id is nullable since 0015, and a
    // null key in a map whose keys are otherwise people is a trap for whoever
    // reads this next. Nothing looks it up today, which is luck, not design.
    if (c.reporter_id) {
      counts.set(c.reporter_id, (counts.get(c.reporter_id) ?? 0) + 1);
    }
  }

  const visible = people
    .filter(
      (p) =>
        !q ||
        [p.full_name, p.roll_no, p.email]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(q)),
    )
    .filter((p) => !role || p.role === role);

  const students = people.filter((p) => p.role === "student").length;
  const staff = people.filter((p) => p.role === "staff").length;
  const admins = people.filter((p) => p.role === "admin").length;
  // The only figure here that says anything about whether the app is used.
  const active = people.filter((p) => (counts.get(p.id) ?? 0) > 0).length;

  /*
     The four figures were dead numbers, and the screen had no way to ask for
     one role — only a text search, which cannot express "the department
     accounts". They are the filter now, keeping any search alongside.
  */
  const roleHref = (r: string) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (r) next.set("role", r);
    const s = next.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };
  const scope =
    role === "student"
      ? "Students"
      : role === "staff"
        ? "Department accounts"
        : role === "admin"
          ? "Admins"
          : "Everyone";

  return (
    <Page
      title="Users"
      description={
        session.isSuperAdmin
          ? "Everyone with an account. You are the owner, so roles are yours to change."
          : "Everyone with an account. Only the owner can change roles."
      }
      icon={UserCog}
      width="wide"
    >
      {deleted ? (
        <p
          role="status"
          className="mb-4 rounded-[var(--radius)] border border-border bg-muted px-4 py-3 text-sm"
        >
          That account has been deleted. What they reported is still on the
          record, without their name on it &mdash; and the deletion itself is in{" "}
          <Link
            href="/admin/activity"
            className="font-medium text-primary underline underline-offset-4"
          >
            the activity log
          </Link>
          .
        </p>
      ) : null}

      {error ? (
        <p className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Registered"
              value={people.length}
              hint={`${active} ${active === 1 ? "has" : "have"} filed something`}
              href={roleHref("")}
              active={role === ""}
            />
            <Stat
              label="Students"
              value={students}
              href={roleHref("student")}
              active={role === "student"}
            />
            <Stat
              label="Department staff"
              value={staff}
              href={roleHref("staff")}
              active={role === "staff"}
            />
            <Stat
              label="Admins"
              value={admins}
              href={roleHref("admin")}
              active={role === "admin"}
            />
          </div>

          <Panel
            bodyClassName=""
            actions={<UserSearch />}
            title={
              q
                ? role
                  ? `${scope} matching “${q}”`
                  : `Matching “${q}”`
                : scope
            }
            description={`${visible.length} ${visible.length === 1 ? "account" : "accounts"}`}
          >
            {visible.length > 0 ? (
              <>
                {/* Cards below md, table above — the same split as both queues.
                    Five columns of names and controls do not fit 390px. */}
                <ul className="divide-y divide-border md:hidden">
                  {visible.map((p) => (
                    <li key={p.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium tracking-[-0.01em]">
                            {p.full_name ?? "No name given"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.email}
                          </p>
                        </div>
                        <RoleChip
                          role={p.role as Role}
                          isSuperAdmin={p.is_super_admin}
                        />
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {p.department ? <span>{p.department}</span> : null}
                        {p.roll_no ? (
                          <span className="tnum">{p.roll_no}</span>
                        ) : null}
                        <FiledCount
                          id={p.id}
                          n={counts.get(p.id) ?? 0}
                          verbose
                        />
                        <span className="tnum">
                          Joined {formatDay(p.created_at)}
                        </span>
                      </p>
                      <div className="mt-3">
                        <UserRowActions
                          person={p}
                          departments={departments ?? []}
                          viewerIsOwner={session.isSuperAdmin}
                          isSelf={p.id === session.userId}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[58rem] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left">
                        <Th>Person</Th>
                        <Th>Role</Th>
                        <Th className="text-right">Filed</Th>
                        <Th>Joined</Th>
                        <Th>Change</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visible.map((p) => (
                        <tr key={p.id}>
                          <td className="max-w-[18rem] px-4 py-3 align-top">
                            <span className="block truncate font-medium">
                              {p.full_name ?? "No name given"}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {p.email}
                            </span>
                            {p.roll_no ? (
                              <span className="tnum block text-xs text-muted-foreground">
                                {p.roll_no}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <RoleChip
                              role={p.role as Role}
                              isSuperAdmin={p.is_super_admin}
                            />
                            {p.department ? (
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {p.department}
                              </span>
                            ) : null}
                          </td>
                          <td className="tnum px-4 py-3 text-right align-top whitespace-nowrap">
                            <FiledCount id={p.id} n={counts.get(p.id) ?? 0} />
                          </td>
                          <td className="tnum px-4 py-3 align-top text-xs whitespace-nowrap text-muted-foreground">
                            {formatDay(p.created_at)}
                          </td>
                          <td className="w-[19rem] px-4 py-3 align-top">
                            <UserRowActions
                              person={p}
                              departments={departments ?? []}
                              viewerIsOwner={session.isSuperAdmin}
                              isSelf={p.id === session.userId}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyState
                icon={Users}
                title="Nobody matches that"
                description={
                  role
                    ? "No account with that role matches. Try another role, or search everyone."
                    : "Search by name, roll number or email address."
                }
                action={
                  <Link
                    href="/admin/users"
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Show everyone
                  </Link>
                }
              />
            )}
          </Panel>
        </>
      )}
    </Page>
  );
}

/** How many complaints they have filed, as a way into the queue. */
function FiledCount({
  id,
  n,
  verbose,
}: {
  id: string;
  n: number;
  verbose?: boolean;
}) {
  if (n === 0) {
    return (
      <span className="text-muted-foreground/60">
        {verbose ? "Nothing filed" : "None"}
      </span>
    );
  }
  return (
    <Link
      href={`/admin/complaints?reporter=${id}`}
      className="font-medium text-primary transition-opacity hover:opacity-80"
    >
      {n}
      {verbose ? " filed" : ""}
    </Link>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase ${className}`}
    >
      {children}
    </th>
  );
}
