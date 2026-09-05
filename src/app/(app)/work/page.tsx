import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Inbox,
  MapPin,
  Repeat,
  Wrench,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PriorityTag, StatusChip } from "@/components/status-chip";
import { CategoryMark } from "@/components/category-mark";
import { Medallion } from "@/components/medallion";
import { EmptyState, Page, Panel, Stat } from "@/components/page";
import { buttonVariants } from "@/components/ui/button";
import { Pager } from "@/components/pager";
import {
  QUEUE_ORDER,
  formatAge,
  formatWhen,
  relName,
  type Status,
} from "@/lib/complaints/display";

export const metadata = { title: "Your queue · CampusFix" };

/* Four states, and between them nearly the whole of a department's world. */
/* Marks, and only one of them coloured. */
const TILES = [
  { status: "assigned", label: "Waiting to start", icon: Clock, urgent: true },
  { status: "in_progress", label: "Being worked on", icon: Wrench },
  { status: "resolved", label: "Waiting on the student", icon: CheckCircle2 },
  { status: "closed", label: "Confirmed closed", icon: Archive },
] as const;

/* The office's queue paginates at 20 and this one did not: Electrical's 56
   rows made a 3,948px page whose top three were the only ones that needed
   doing. Same size, same Pager, so the two queues page alike. */
const PAGE_SIZE = 20;

/** Anything else in ?status= is treated as no filter at all. */
const FILTERS: Status[] = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
];

const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default async function WorkQueuePage({
  searchParams,
}: PageProps<"/work">) {
  const session = await requireStaff();
  const sp = await searchParams;
  const requested = first(sp.status) as Status;
  const filter = FILTERS.includes(requested) ? requested : "";
  /*
     Set by the handback action, which has to redirect: once the department is
     cleared the complaint is no longer readable here, so re-rendering the page
     they were standing on would 404 and the complaint would appear to have
     vanished.
  */
  const sent = /^CF-\d{1,8}$/.test(first(sp.sent)) ? first(sp.sent) : "";

  const requestedPage = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();

  /*
     Counted server-side, one head query per status, because the tiles have to
     keep saying how much work there is while the list below them shows twenty
     rows of it. Reading every row to count them in memory is what the range
     below exists to stop, and it would cap at PostgREST's 1000.
  */
  const countOf = async (status: Status) => {
    const { count } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("department_id", session.departmentId)
      .eq("status", status);
    return count ?? 0;
  };
  const tallies = await Promise.all(FILTERS.map(countOf));
  const counts = Object.fromEntries(
    FILTERS.map((s, i) => [s, tallies[i]!]),
  ) as Record<Status, number>;

  const total = filter ? counts[filter] : tallies.reduce((n, x) => n + x, 0);
  // Clamped, because a range starting past the end is a 416 from PostgREST.
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, lastPage);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("complaints")
    .select(
      "id, ticket_no, title, status, category, priority, location_detail, created_at, locations(name)",
    )
    .eq("department_id", session.departmentId);
  if (filter) query = query.eq("status", filter);

  for (const { column, ascending } of QUEUE_ORDER) {
    query = query.order(column, { ascending });
  }

  const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
  const rows = data ?? [];

  /* A tile that is already filtering clears it, so the pair is a switch and
     not a one-way door. Dropping ?page= with it: page 3 of everything is not
     page 3 of one status. */
  const tileHref = (status: Status) =>
    filter === status ? "/work" : `/work?status=${status}`;
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (n > 1) params.set("page", String(n));
    const s = params.toString();
    return s ? `/work?${s}` : "/work";
  };

  /*
     The tile's own words, not STATUS_LABEL's: pressing "Waiting to start" gave
     the list below it the heading "Assigned", so one state had two names a few
     inches apart. The chips keep STATUS_LABEL — that is the record's own name
     for the state, and it reads the same for all three roles.

     "Open" would be an odd heading here either way, where the only way a
     complaint is open is that the student sent it back.
  */
  const filterLabel =
    filter === "open"
      ? "Reopened by a student"
      : TILES.find((t) => t.status === filter)?.label;
  const reopened = counts.open;

  return (
    <Page
      title="Your queue"
      description={`Everything the office has assigned to ${
        session.departmentName ?? "your department"
      }. Unfinished work first.`}
      icon={Wrench}
      width="wide"
    >
      {error ? (
        <p className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : (
        <>
          {sent ? (
            <p
              role="status"
              className="mb-4 flex items-start gap-2.5 rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-sm shadow-xs"
            >
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
              <span>
                <span className="font-mono text-[13px]">{sent}</span> has gone
                back to the office to be sent to the right department.
              </span>
            </p>
          ) : null}

          {/* Reopened work gets a line of its own rather than a fifth tile,
              and it is a way in to a list — so it goes once you are on it. */}
          {reopened > 0 && filter !== "open" ? (
            <Link
              href="/work?status=open"
              className="mb-4 flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-sm shadow-xs transition-colors hover:border-primary/30"
            >
              {/* The reopen mark, the same one the timeline uses for the
                  event that put these here. It was a 6px amber dot, which is
                  the app's "something needs attention" mark and says nothing
                  about what happened. */}
              <Medallion icon={Repeat} tone="warn" size="sm" />
              <span className="min-w-0">
                <span className="font-medium tnum">{reopened}</span>{" "}
                {reopened === 1 ? "complaint was" : "complaints were"} reopened
                by a student. The office has to hand{" "}
                {reopened === 1 ? "it" : "them"} back to you.
              </span>
              <ArrowRight
                aria-hidden
                className="ml-auto size-4 shrink-0 text-muted-foreground"
              />
            </Link>
          ) : null}

          {/* Each tile is a filter, not just a figure. A count you cannot act
              on is a poster. */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TILES.map((t) => {
              const count = counts[t.status];
              const on = filter === t.status;
              return (
                <Stat
                  key={t.status}
                  label={t.label}
                  value={count}
                  href={tileHref(t.status)}
                  active={on}
                  icon={t.icon}
                  tone={
                    !on && "urgent" in t && t.urgent && count > 0
                      ? "warn"
                      : undefined
                  }
                />
              );
            })}
          </div>

          <Panel
            bodyClassName=""
            title={filterLabel ?? "Everything assigned to you"}
            description={`${total} complaint${total === 1 ? "" : "s"}${
              total > PAGE_SIZE
                ? ` · showing ${from + 1}–${Math.min(from + PAGE_SIZE, total)}`
                : ""
            }`}
            footer={
              lastPage > 1 ? (
                <Pager page={page} lastPage={lastPage} href={pageHref} />
              ) : undefined
            }
            actions={
              filter ? (
                <Link
                  href="/work"
                  className="text-[13px] font-medium text-primary transition-opacity hover:opacity-80"
                >
                  Show all
                </Link>
              ) : null
            }
          >
            {rows.length > 0 ? (
              <>
                {/* Two renderings of the same rows, as on the office's queue:
                    the table needs 48rem for six columns, so on a phone it
                    would become a sideways scroll just to reach the status. */}
                <ul className="divide-y divide-border md:hidden">
                  {rows.map((c) => {
                    const where = [relName(c.locations), c.location_detail]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/work/${c.id}`}
                          className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40"
                        >
                          {/* The kind of work, which matters more here than on
                              the office's queue: a department is looking at one
                              trade's worth of complaints and the mark tells
                              them at a glance which of their own jobs each row
                              is. */}
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
                            {/* Pinned on the card, plain in the table — the
                                table has a column headed "Where" doing this
                                job, and the card has no headers. */}
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin aria-hidden className="size-3 shrink-0" />
                              {where}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <PriorityTag
                                priority={c.priority}
                                className="text-xs"
                              />
                              <span
                                className="tnum ml-auto shrink-0"
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

                {/* MEASURED: 43rem, which is what lets this table fit from 1024
                    up and never scroll sideways above the breakpoint where it
                    appears. */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[43rem] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left">
                        <Th className="w-10">Kind</Th>
                        <Th>Ticket</Th>
                        <Th>Issue</Th>
                        <Th>Priority</Th>
                        <Th className="text-right">Age</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((c) => {
                        const href = `/work/${c.id}`;
                        return (
                          <tr
                            key={c.id}
                            className="transition-colors hover:bg-accent/40"
                          >
                            <td className="py-3 pl-4 align-top">
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
                            <td className="max-w-[22rem] px-4 py-3 align-top">
                              <Link
                                href={href}
                                className="block truncate font-medium transition-colors hover:text-primary"
                              >
                                {c.title}
                              </Link>
                              {/* Under the title and pinned, not a column of its own — the
                                  same trade the office's queue makes, and for the same
                                  reason: a nowrap location column pushes the status off the
                                  right edge of a laptop. */}
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin
                                  aria-hidden
                                  className="size-3 shrink-0"
                                />
                                <span className="truncate">
                                  {[relName(c.locations), c.location_detail]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </span>
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
            ) : filter ? (
              <EmptyState
                icon={Inbox}
                title="Nothing here"
                description="Nothing in your department is at this stage right now."
                action={
                  <Link
                    href="/work"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Show all
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon={Inbox}
                title="Nothing assigned to you yet"
                description="When the office hands your department a complaint, it lands here — and the student is told it is with you."
              />
            )}
          </Panel>
        </>
      )}
    </Page>
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
