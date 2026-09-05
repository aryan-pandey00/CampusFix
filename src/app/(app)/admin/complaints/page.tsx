import Link from "next/link";
import { CircleDashed, Inbox, MapPin, PlusCircle, X } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PriorityTag, StatusChip } from "@/components/status-chip";
import { CategoryMark } from "@/components/category-mark";
import { EmptyState, Page, Panel } from "@/components/page";
import { buttonVariants } from "@/components/ui/button";
import { Pager } from "@/components/pager";
import { QueueFilters } from "./filter-bar";
import {
  GROUP_STATUSES,
  QUEUE_ORDER,
  formatAge,
  formatWhen,
  relName,
  statusGroupParam,
  type Status,
} from "@/lib/complaints/display";

export const metadata = { title: "Queue · CampusFix" };

const PAGE_SIZE = 20;

/**
 * PostgREST parses `or=(a.ilike.x,b.ilike.y)` as a mini-expression, so commas,
 * parentheses and dots inside the value break the filter or change its
 * meaning.
 */
function safeSearch(input: string) {
  return input
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .slice(0, 60);
}

/* `queue` is the default, and it is the reason this screen is called a queue. */
const SORTS = {
  queue: QUEUE_ORDER,
  newest: [{ column: "created_at", ascending: false }],
  oldest: [{ column: "created_at", ascending: true }],
} as const;

const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminQueuePage({
  searchParams,
}: PageProps<"/admin/complaints">) {
  await requireAdmin();
  const sp = await searchParams;

  const status = first(sp.status);
  // No category control on the filter bar any more — the seeded departments
  // mirror the categories one for one, so the two dropdowns filtered to the
  // same rows.
  const category = first(sp.category);
  const priority = first(sp.priority);
  const department = first(sp.department);
  const location = first(sp.location);
  // Set by the Users screen, which links "3" in someone's row to their three
  // complaints. There is no control for it on the filter bar — it is a way in
  // from somewhere else, not a filter an admin would reach for here.
  const reporter = first(sp.reporter);
  const q = safeSearch(first(sp.q));
  const sortKey = (first(sp.sort) || "queue") as keyof typeof SORTS;
  const sort = SORTS[sortKey] ? sortKey : "queue";
  const requestedPage = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();

  const [{ data: departments }, { data: locations }, { data: filedBy }] =
    await Promise.all([
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("locations").select("id, name").order("sort_order"),
      // Only when it is being used, and only to name the person: a queue
      // silently showing three of thirty complaints reads as a bug.
      reporter
        ? supabase
            .from("profiles")
            .select("full_name")
            .eq("id", reporter)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  // The filters are described once as data, then applied to two different
  // query builders. Sharing a generic *function* between them instead makes
  // TypeScript unfold Supabase's recursive builder types until it gives up
  // (TS2589), so the values are shared and the three lines of loop are not.
  const eqFilters: Array<[string, string]> = [];
  /*
     Status takes a group as well as a single value, and a group needs `in`
     rather than `eq` — so it goes beside `unassignedOnly` below as its own
     clause instead of into the eq list.
  */
  const statusGroup = statusGroupParam(status);
  if (status && !statusGroup) eqFilters.push(["status", status]);
  if (category) eqFilters.push(["category", category]);
  if (priority) eqFilters.push(["priority", priority]);
  if (location) eqFilters.push(["location_id", location]);
  if (reporter) eqFilters.push(["reporter_id", reporter]);
  if (department && department !== "none") {
    eqFilters.push(["department_id", department]);
  }
  const unassignedOnly = department === "none";
  const orExpr = q
    ? `title.ilike.%${q}%,description.ilike.%${q}%,ticket_no.ilike.%${q}%`
    : null;

  // Count first so the page number can be clamped. Asking PostgREST for a range
  // that starts past the end is a 416 "Requested range not satisfiable", which
  // would otherwise reach the admin as a raw error instead of an empty table.
  let countQuery = supabase
    .from("complaints")
    .select("id", { count: "exact", head: true });
  for (const [col, val] of eqFilters) countQuery = countQuery.eq(col, val);
  if (statusGroup) {
    countQuery = countQuery.in("status", GROUP_STATUSES[statusGroup]);
  }
  if (unassignedOnly) countQuery = countQuery.is("department_id", null);
  if (orExpr) countQuery = countQuery.or(orExpr);
  const { count } = await countQuery;

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, lastPage);

  let query = supabase
    .from("complaints")
    .select(
      "id, ticket_no, title, status, category, priority, location_detail, created_at, locations(name), departments(name)",
    );
  for (const [col, val] of eqFilters) query = query.eq(col, val);
  if (statusGroup) query = query.in("status", GROUP_STATUSES[statusGroup]);
  if (unassignedOnly) query = query.is("department_id", null);
  if (orExpr) query = query.or(orExpr);

  for (const { column, ascending } of SORTS[sort]) {
    query = query.order(column, { ascending });
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: complaints, error } = await query.range(
    from,
    from + PAGE_SIZE - 1,
  );

  // Preserve every other filter when moving between pages.
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({
      status,
      category,
      priority,
      department,
      location,
      reporter,
      q,
      sort: sort === "queue" ? "" : sort,
    })) {
      if (v) params.set(k, String(v));
    }
    if (n > 1) params.set("page", String(n));
    const s = params.toString();
    return s ? `/admin/complaints?${s}` : "/admin/complaints";
  };

  return (
    <Page
      title="Queue"
      description={
        total === 0
          ? "Nothing matches."
          : `${total} complaint${total === 1 ? "" : "s"}${
              total > PAGE_SIZE
                ? ` · showing ${from + 1}–${Math.min(from + PAGE_SIZE, total)}`
                : ""
            }`
      }
      width="wide"
      /* Left the sidebar when the nav was cut to five. This is where an admin
         already is when a student phones something in, so it is a better home
         for it than a permanent tab nobody used. */
      actions={
        <Link href="/report" className={buttonVariants()}>
          <PlusCircle className="size-4" />
          File a complaint
        </Link>
      }
    >
      {reporter ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius)] border border-border bg-card px-4 py-2.5 text-sm shadow-xs">
          <span>
            Only what{" "}
            <span className="font-medium">
              {(filedBy as { full_name: string | null } | null)?.full_name ??
                "this student"}
            </span>{" "}
            has filed.
          </span>
          <Link
            href="/admin/complaints"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            <X className="size-3.5" />
            Show the whole queue
          </Link>
        </div>
      ) : null}

      <QueueFilters
        departments={departments ?? []}
        locations={locations ?? []}
      />

      {error ? (
        <p className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : (
        <Panel
          bodyClassName=""
          footer={
            lastPage > 1 ? (
              <Pager page={page} lastPage={lastPage} href={pageHref} />
            ) : undefined
          }
        >
          {complaints && complaints.length > 0 ? (
            <>
              {/* Two renderings of the same rows. The table needs 56rem to hold
                  seven columns, so on a phone it becomes a sideways scroll just
                  to reach the status — the one column an admin is scanning for. */}
              <ul className="divide-y divide-border md:hidden">
                {complaints.map((c) => {
                  const where = [relName(c.locations), c.location_detail]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/admin/complaints/${c.id}`}
                        className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40"
                      >
                        <CategoryMark
                          category={c.category}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-xs text-muted-foreground">
                              {c.ticket_no}
                            </span>
                            <StatusChip status={c.status as Status} />
                          </div>
                          <p className="mt-1 text-[15px] font-medium tracking-[-0.01em]">
                            {c.title}
                          </p>
                          {/* A pin on the card and not in the table, which is
                              not an inconsistency: the table has a column
                              headed "Where" doing this job, so a pin in every
                              cell there would be the header repeated forty
                              times. */}
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin aria-hidden className="size-3 shrink-0" />
                            {where}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <PriorityTag
                              priority={c.priority}
                              className="text-xs"
                            />
                            {relName(c.departments) ? (
                              <span className="truncate">
                                {relName(c.departments)}
                              </span>
                            ) : (
                              <Unassigned />
                            )}
                            <span
                              className="ml-auto shrink-0 tnum"
                              title={formatWhen(c.created_at)}
                            >
                              {formatAge(c.created_at)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[57rem] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left">
                      {/* Its own column rather than a mark inside Issue, for
                          two reasons: the marks then form one straight stripe
                          down the left edge that can be scanned without
                          reading, and the title keeps all 20rem of its width
                          instead of losing 36px of it. */}
                      <Th className="w-10">Kind</Th>
                      <Th>Ticket</Th>
                      <Th>Issue</Th>
                      <Th>Department</Th>
                      <Th>Priority</Th>
                      <Th className="text-right">Age</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {complaints.map((c) => {
                      const href = `/admin/complaints/${c.id}`;
                      return (
                        <tr
                          key={c.id}
                          className="transition-colors hover:bg-accent/40"
                        >
                          <td className="pl-4 py-3 align-top">
                            <CategoryMark category={c.category} />
                          </td>
                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            <Link
                              href={href}
                              className="font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
                            >
                              {c.ticket_no}
                            </Link>
                          </td>
                          <td className="max-w-[20rem] px-4 py-3 align-top">
                            {/* Title only, and the category is back — as the
                                mark in the first column rather than as words
                                here. */}
                            <Link
                              href={href}
                              className="block truncate font-medium transition-colors hover:text-primary"
                            >
                              {c.title}
                            </Link>
                            {/* The location, under the title rather than in
                                a column of its own — and pinned, because
                                there is no longer a header saying what this
                                line is. */}
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin aria-hidden className="size-3 shrink-0" />
                              <span className="truncate">
                                {[relName(c.locations), c.location_detail]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top whitespace-nowrap">
                            {relName(c.departments) ?? <Unassigned />}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <PriorityTag priority={c.priority} />
                          </td>
                          <td
                            className="tnum px-4 py-3 text-right align-top text-xs leading-5 whitespace-nowrap text-muted-foreground"
                            title={formatWhen(c.created_at)}
                          >
                            {formatAge(c.created_at)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusChip status={c.status as Status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Inbox}
              title="Nothing matches those filters"
              description="Widen them, or clear them to see the whole queue."
              action={
                <Link
                  href="/admin/complaints"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Clear filters
                </Link>
              }
            />
          )}
        </Panel>
      )}
    </Page>
  );
}

/** "Unassigned", with the amber the rest of the app gives that state. */
function Unassigned() {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <CircleDashed
        aria-hidden
        className="size-3 shrink-0 text-amber-600 dark:text-amber-400"
      />
      Unassigned
    </span>
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
