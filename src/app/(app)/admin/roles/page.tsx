import { UserCog, UserMinus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Medallion } from "@/components/medallion";
import { EmptyState, Page, Panel } from "@/components/page";
import { Pager } from "@/components/pager";
import { REPORT_TABS, SubNav } from "@/components/sub-nav";
import {
  formatRelative,
  formatWhen,
  relFullName,
} from "@/lib/complaints/display";

export const metadata = { title: "Roles · CampusFix" };

/*
   Its own screen since screen review 22, after two goes at making it share one
   with the complaint stream.

   Sharing cost a second page parameter, a second href builder, a `scroll` prop
   on Pager so paging the lower list did not throw away the reader's place, and
   an assertion that could only run when the log had two pages. All of that was
   the price of two paginated lists on one page. A sibling route costs a tab.
*/
const PAGE_SIZE = 20;

type AdminAction = {
  id: string;
  action: string;
  detail: {
    from?: string;
    to?: string;
    department?: string | null;
    /** Copied in at write time, because target_id goes null on a delete. */
    name?: string | null;
    email?: string | null;
    role?: string;
    by?: "self" | "owner";
  };
  created_at: string;
  actor: unknown;
  target: unknown;
};

export default async function RolesPage({
  searchParams,
}: PageProps<"/admin/roles">) {
  await requireAdmin();
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";
  const requestedPage = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();

  // Counted first so the page number can be clamped: PostgREST answers a range
  // starting past the end with a 416.
  const { count } = await supabase
    .from("admin_actions")
    .select("id", { count: "exact", head: true });

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, lastPage);
  const start = (page - 1) * PAGE_SIZE;

  const { data: rows } = await supabase
    .from("admin_actions")
    .select(
      "id, action, detail, created_at, actor:profiles!admin_actions_actor_id_fkey(full_name), target:profiles!admin_actions_target_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  const changes = (rows ?? []) as unknown as AdminAction[];

  return (
    <Page
      /* "Reports", not "Roles". The H1 names the group and the tab picks the
         view — the same rule the other three tabs follow. */
      title="Reports"
      description="Who was made what, and whose account was removed."
      /* The default width, which is what the other three Reports tabs use.
         `wide` made this one card stretch past the three beside it, and moving
         between tabs is where a column that changes width is most obvious. */
    >
      <SubNav items={REPORT_TABS} />

      <Panel
        title="Roles, and accounts removed"
        description={`Written by the database when a role changes or an account is deleted, and editable by nobody.${
          total > PAGE_SIZE
            ? ` ${total} in all, ${start + 1}–${Math.min(
                start + PAGE_SIZE,
                total,
              )} here.`
            : ""
        }`}
        bodyClassName=""
        footer={
          lastPage > 1 ? (
            <Pager
              page={page}
              lastPage={lastPage}
              href={(n) => (n > 1 ? `/admin/roles?page=${n}` : "/admin/roles")}
            />
          ) : undefined
        }
      >
        {changes.length > 0 ? (
          <ul className="divide-y divide-border">
            {changes.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-3 px-4 py-3 text-sm sm:gap-3.5 sm:px-5"
              >
                {/* Two kinds of row, two marks. A promotion and a deletion are
                    the two things this list holds, and telling them apart is
                    the first thing anybody does to it. */}
                <Medallion
                  icon={c.action === "account_deleted" ? UserMinus : UserCog}
                  size="sm"
                />
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium">{actorOf(c)}</span>
                  <span className="text-muted-foreground">
                    {describeAction(c)}
                  </span>
                  <span
                    className="tnum ml-auto shrink-0 text-xs text-muted-foreground"
                    title={formatWhen(c.created_at)}
                  >
                    {formatRelative(c.created_at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={UserCog}
            title="No account has been changed or removed yet"
            description="When the owner promotes someone, moves them to a department, or deletes an account, it is recorded here."
          />
        )}
      </Panel>
    </Page>
  );
}

function actorOf(c: AdminAction) {
  const actor = relFullName(c.actor);
  if (c.action === "account_deleted" && c.detail.by === "self") {
    return c.detail.name ?? c.detail.email ?? "Someone";
  }
  return actor ?? "The owner";
}

/** What they did, as the second half of a sentence starting with actorOf(). */
function describeAction(c: AdminAction) {
  const name = (
    <span className="font-medium text-foreground">
      {relFullName(c.target) ?? c.detail.name ?? c.detail.email ?? "an account"}
    </span>
  );

  if (c.action === "account_deleted") {
    return c.detail.by === "self" ? (
      "deleted their own account"
    ) : (
      <>deleted the account of {name}</>
    );
  }

  return (
    <>
      made {name} {becameWhat(c.detail)}
    </>
  );
}

function becameWhat(detail: AdminAction["detail"]) {
  switch (detail.to) {
    case "admin":
      return "an admin";
    case "student":
      return "a student";
    case "staff":
      return `part of ${detail.department ?? "a department"}`;
    default:
      return "something else";
  }
}
