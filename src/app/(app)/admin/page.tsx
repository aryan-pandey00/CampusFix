import Link from "next/link";
import {
  CircleDashed,
  Hourglass,
  Inbox,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PriorityTag, StatusChip } from "@/components/status-chip";
import { CategoryMark } from "@/components/category-mark";
import { DepartmentMark } from "@/components/department-mark";
import { Medallion } from "@/components/medallion";
import { EmptyState, Page, Panel, SectionLabel } from "@/components/page";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventIcon } from "@/lib/complaints/icons";
import {
  ACTIVE_STATUSES,
  GROUP_LABEL,
  GROUP_ORDER,
  GROUP_STATUSES,
  GROUP_VAR,
  PRIORITY_DOT,
  STATUS_LABEL,
  ageingCutoff,
  describeEvent,
  formatDuration,
  formatRelative,
  relName,
  type Status,
  type StatusGroup,
  type TimelineEvent,
} from "@/lib/complaints/display";

export const metadata = { title: "Dashboard · CampusFix" };

const AGEING_DAYS = 3;
/** Rows per panel. Chosen so the two columns of a row end at about the same height. */
const OLDEST = 6;
const DEPARTMENTS = 6;
const ACTIVITY = 6;
/** Fetched before de-duplication, so six busy complaints do not fill the feed. */
const ACTIVITY_SCAN = 60;

type Cell = {
  label: string;
  value: React.ReactNode;
  hint: string;
  href?: string;
  tone?: "warn" | "danger";
  /** The one figure the whole screen is about. Emphasis is in the label's
      colour, never the figure's size — see the band below. */
  lead?: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

/** The maintenance office's first screen. */
export default async function AdminPage() {
  const session = await requireAdmin();
  const supabase = await createClient();

  // One read, counted in memory. Fine at campus scale (hundreds of rows); if
  // this ever reaches five figures it should become a SQL view or an RPC that
  // aggregates in the database instead of shipping every row to the server.
  const [{ data: rows }, { data: departmentRows }, { data: eventRows }] =
    await Promise.all([
      supabase
        .from("complaints")
        .select(
          "id, ticket_no, title, status, category, priority, department_id, created_at, resolved_at, departments(name, slug)",
        ),
      supabase
        .from("departments")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("complaint_events")
        .select(
          "id, type, from_status, to_status, note, is_internal, created_at, actor_id, complaint_id",
        )
        .order("created_at", { ascending: false })
        .limit(ACTIVITY_SCAN),
    ]);

  const complaints = rows ?? [];
  const count = (fn: (c: (typeof complaints)[number]) => boolean) =>
    complaints.filter(fn).length;
  const isActive = (c: (typeof complaints)[number]) =>
    ACTIVE_STATUSES.includes(c.status as Status);

  const byStatus = Object.fromEntries(
    (Object.keys(STATUS_LABEL) as Status[]).map((s) => [
      s,
      count((c) => c.status === s),
    ]),
  ) as Record<Status, number>;

  /* The same counts collapsed to three, for the ring. */
  const byGroup = GROUP_ORDER.reduce(
    (acc, g) => {
      acc[g] = GROUP_STATUSES[g].reduce((n, st) => n + byStatus[st], 0);
      return acc;
    },
    {} as Record<StatusGroup, number>,
  );

  const active = count(isActive);
  const unassigned = count(
    (c) => c.status === "open" && c.department_id === null,
  );
  const urgent = count((c) => c.priority === "urgent" && isActive(c));

  const cutoff = ageingCutoff(AGEING_DAYS);
  const ageing = count(
    (c) => isActive(c) && new Date(c.created_at).getTime() < cutoff,
  );

  const resolvedDurations = complaints
    .filter((c) => c.resolved_at)
    .map(
      (c) =>
        new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime(),
    );
  const avgResolution =
    resolvedDurations.length > 0
      ? formatDuration(
          resolvedDurations.reduce((a, b) => a + b, 0) /
            resolvedDurations.length,
        )
      : null;

  // What to pick up next: oldest first, because age is the thing nobody
  // notices on their own.
  const oldest = complaints
    .filter(isActive)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .slice(0, OLDEST);

  /*
     Open work per department, with the unassigned pile pinned to the top
     rather than sorted in.
  */
  const activeByDepartment = new Map<string, number>();
  for (const c of complaints) {
    if (!isActive(c) || !c.department_id) continue;
    activeByDepartment.set(
      c.department_id,
      (activeByDepartment.get(c.department_id) ?? 0) + 1,
    );
  }
  const load = [
    {
      key: "none",
      name: "Unassigned",
      slug: "",
      count: unassigned,
      href: "/admin/complaints?status=open&department=none",
    },
    ...(departmentRows ?? [])
      .map((d) => ({
        key: d.id,
        name: d.name as string,
        slug: d.slug as string,
        count: activeByDepartment.get(d.id) ?? 0,
        href: `/admin/complaints?department=${d.id}`,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, DEPARTMENTS),
  ];
  const busiestDepartment = Math.max(1, ...load.map((l) => l.count));

  /* Newest entry per complaint, not simply the newest entries. */
  const seen = new Set<string>();
  const events: Array<TimelineEvent & { complaint_id: string }> = [];
  for (const e of (eventRows ?? []) as Array<
    TimelineEvent & { complaint_id: string }
  >) {
    if (seen.has(e.complaint_id)) continue;
    seen.add(e.complaint_id);
    events.push(e);
    if (events.length === ACTIVITY) break;
  }

  // Admins can read every profile, so the activity feed names people.
  const actorIds = [
    ...new Set(events.map((e) => e.actor_id).filter(Boolean)),
  ] as string[];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const actorName = new Map(
    (actors ?? []).map((a) => [a.id, a.full_name as string | null]),
  );
  const complaintById = new Map(complaints.map((c) => [c.id, c]));

  /* No sparkline in this band: only one of the five figures had a history
     worth drawing, so four cells were left with blank space where the fifth
     had a chart. The backlog trend lives on Reports instead. */
  const cells: Cell[] = [
    {
      label: "Open right now",
      value: active,
      hint: `of ${complaints.length} filed in total`,
      href: "/admin/complaints",
      lead: true,
      icon: Inbox,
    },
    {
      label: "Unassigned",
      value: unassigned,
      hint: "Open, no department yet",
      href: "/admin/complaints?status=open&department=none",
      tone: unassigned > 0 ? "warn" : undefined,
      // An outline with nothing in it. The `open` chip is the only outlined
      // one for the same reason: nothing has been claimed yet.
      icon: CircleDashed,
    },
    {
      label: "Urgent",
      value: urgent,
      hint: "Still open",
      href: "/admin/complaints?priority=urgent",
      tone: urgent > 0 ? "danger" : undefined,
      icon: TriangleAlert,
    },
    {
      label: `Older than ${AGEING_DAYS} days`,
      value: ageing,
      hint: "Still not resolved",
      href: "/admin/complaints?sort=oldest",
      tone: ageing > 0 ? "warn" : undefined,
      // Two of these are about elapsed time, so they get two different
      // pictures of it: sand running out here, a stopwatch for the average.
      // Reusing one clock for both would say they are the same measure.
      icon: Hourglass,
    },
    {
      // Shortened from "Average time to resolve", which is the only label in
      // the band that does not fit one line — see the budget above the label.
      label: "Average fix time",
      value: avgResolution ?? "—",
      hint:
        resolvedDurations.length > 0
          ? `Across ${resolvedDurations.length} resolved`
          : "Nothing resolved yet",
      icon: Timer,
    },
  ];

  return (
    <Page
      title="Dashboard"
      description="What needs attention now, and where the work is sitting."
      width="wide"
      actions={
        <Link href="/admin/complaints" className={buttonVariants()}>
          <Inbox className="size-4" />
          Open the queue
        </Link>
      }
    >
      {/* Separate cards on a phone, one continuous instrument on a wide screen. */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5 xl:gap-0 xl:overflow-hidden xl:rounded-[var(--radius)] xl:border xl:border-border xl:bg-card xl:shadow-xs">
        {cells.map((c, i) => {
          const body = (
            <div className="relative">
              {/* The corner mark carries the tone; there is no longer a dot. */}
              <Medallion
                icon={c.icon}
                size="sm"
                tone={c.tone ?? (c.lead ? "primary" : "default")}
                className="absolute top-0 right-0"
              />
              {/*
                EVERY LABEL HERE MUST FIT ONE LINE AT 116px — about nineteen
                characters. Nothing reserves label height, so one that wraps
                pushes its own figure down and only its own, and the row of
                five reads as a rendering fault. Anything longer belongs in the
                hint line below the figure, which wraps for free.
              */}
              <p
                className={cn(
                  "max-w-[calc(100%-2.25rem)] text-[11px] leading-tight font-medium sm:text-xs",
                  c.lead ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {c.label}
              </p>
              <p className="mt-2.5 text-[1.75rem] leading-none font-semibold tracking-[-0.03em]">
                {c.value}
              </p>
              <p className="mt-3 text-xs leading-tight text-muted-foreground">
                {c.hint}
              </p>
            </div>
          );

          const shell = cn(
            "block overflow-hidden rounded-[var(--radius)] border border-border bg-card px-4 py-3.5 shadow-xs transition-colors sm:px-5",
            // The card's own edges dissolve into the band above xl; only the
            // left hairline survives, and not on the first cell.
            "xl:rounded-none xl:border-y-0 xl:border-r-0 xl:shadow-none",
            i === 0 && "xl:border-l-0",
            i === cells.length - 1 && "col-span-2 xl:col-span-1",
            c.href && "hover:bg-accent/40",
          );

          return c.href ? (
            <Link key={c.label} href={c.href} className={shell}>
              {body}
            </Link>
          ) : (
            <div key={c.label} className={shell}>
              {body}
            </div>
          );
        })}
      </div>

      <div className="mt-7">
        <SectionLabel>Needs attention</SectionLabel>
        {/* Also `xl`, and for the same reason. At 1024 a third of 976px left
            the right-hand column 229px wide, which is not tight — it is broken:
            the ring's legend labels were allotted 0px and the department names
            20px, so both panels rendered as columns of ellipses. */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Waiting longest"
            description="Still open, oldest first"
            bodyClassName=""
            /*
               Stretched to the grid row, deliberately, and this was tried the
               other way for exactly one review. `xl:self-start` ends the card
               at its last row, which is tidier inside — and leaves its bottom
               edge 60px above the column beside it, which Aryan spotted
               immediately. Two cards in a row ending at different heights
               reads as broken; a list card with a blank strip under its last
               row reads as a list with that many rows in it.

               Not the same case as the announcements screen, where the cards
               were misaligned at the TOP. That was a real defect — an eyebrow
               inside one card and not the other. This is what a grid row does.
            */
            className="xl:col-span-2"
            actions={
              <Link
                href="/admin/complaints?sort=oldest"
                className="text-xs font-medium text-primary underline underline-offset-4"
              >
                See all
              </Link>
            }
          >
            {oldest.length > 0 ? (
              <ul className="divide-y divide-border">
                {oldest.map((c) => {
                  const department = relName(c.departments);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/admin/complaints/${c.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 sm:gap-4 sm:px-5"
                      >
                        {/* What kind of trouble it is, which the row never
                            said. */}
                        {/* Named by CategoryMark, because the category is
                            nowhere else in this row — the line under the title
                            is the department. */}
                        <CategoryMark category={c.category} />
                        <span className="min-w-0 flex-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {c.ticket_no}
                          </span>
                          <span className="mt-0.5 block truncate text-sm font-medium">
                            {c.title}
                          </span>
                          {/* Who owns it, which is the first thing you want to
                              know about something that has been waiting. */}
                          {department ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {department}
                            </span>
                          ) : (
                            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                aria-hidden
                                className="size-1.5 shrink-0 rounded-full bg-amber-500"
                              />
                              No department yet
                            </span>
                          )}
                        </span>
                        <PriorityTag
                          priority={c.priority}
                          className="hidden w-[4.75rem] shrink-0 text-xs sm:inline-flex"
                        />
                        {/* The dot on its own below `sm`, where the tag with
                            its word does not fit. */}
                        <span
                          title={`Priority: ${c.priority}`}
                          className="shrink-0 sm:hidden"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "block size-2 rounded-full",
                              PRIORITY_DOT[c.priority] ??
                                "bg-muted-foreground/50",
                            )}
                          />
                          <span className="sr-only">
                            Priority: {c.priority}
                          </span>
                        </span>
                        <span className="tnum shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                          {formatRelative(c.created_at)}
                        </span>
                        <StatusChip
                          status={c.status as Status}
                          className="hidden w-[5.75rem] shrink-0 justify-center sm:inline-flex"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="Nothing open"
                description="Every complaint has been resolved or closed."
              />
            )}
          </Panel>

          <div className="flex flex-col gap-4">
            {/*
               A bar, where a ring was, where five bars were before that.

               The ring was arithmetically right and read as broken. Its hole
               held 69 OUTSTANDING while the legend beside it added to 167, so
               the one number drawn largest belonged to no arc — and the lead
               tile at the top of this page already says "69, of 167 filed in
               total", which is where that figure belongs. Aryan added the
               legend up twice and called it an error both times.

               A single full-width bar cannot make that mistake: it is
               obviously one whole, split three ways, and the three counts
               under it are the only numbers on show.

               No text inside the parts. Above `xl` this panel sits in a 314px
               column, so the smallest part is about 60px — "Not started 33"
               does not go in it. And no percentages anywhere: 20 + 22 + 59 is
               101, which is the mistake this panel already made once.
            */}
            <Panel
              title="Where everything stands"
              description={`All ${complaints.length} complaints, by stage.`}
              bodyClassName=""
            >
              <div className="px-4 py-4 sm:px-5">
                {/* aria-hidden, and the parts are not links: the legend
                    below is the same three destinations in text, and a
                    role="img" wrapper prunes its own descendants from the
                    accessibility tree — which would leave three links
                    focusable but unreadable. */}
                <div
                  aria-hidden
                  className="flex h-2.5 overflow-hidden rounded-full"
                >
                  {GROUP_ORDER.map((g, i) => {
                    const share = (byGroup[g] / (complaints.length || 1)) * 100;
                    if (share === 0) return null;
                    return (
                      <div
                        key={g}
                        title={`${GROUP_LABEL[g]}: ${byGroup[g]} of ${complaints.length}`}
                        /* 2px of the panel's own background between parts,
                           drawn as a border so they stay flush with the
                           rounded ends. The same trick as StackedBar. */
                        className={cn(
                          "h-full min-w-0 shrink-0",
                          i > 0 && "border-l-2 border-card",
                        )}
                        style={{ width: `${share}%`, background: GROUP_VAR[g] }}
                      />
                    );
                  })}
                </div>

                <ul className="mt-3.5 space-y-1">
                  {GROUP_ORDER.map((g) => (
                    <li key={g}>
                      <Link
                        href={`/admin/complaints?status=${g}`}
                        className="-mx-2 flex items-baseline gap-2 rounded-[var(--radius-md)] px-2 py-1 transition-colors hover:bg-accent/40"
                      >
                        <span
                          aria-hidden
                          /* Lines up with the first line of the label, not
                             with the middle of the row: `items-baseline` on a
                             block that has no text of its own puts it on the
                             bottom edge, so it is nudged instead. */
                          className="mt-[0.3em] size-2.5 shrink-0 rounded-[3px]"
                          style={{ background: GROUP_VAR[g] }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {GROUP_LABEL[g]}
                        </span>
                        <span className="tnum text-sm font-medium">
                          {byGroup[g]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel
              title="Open work by department"
              description="Busiest first"
              bodyClassName=""
            >
              <ul className="divide-y divide-border">
                {load.map((l) => (
                  <li key={l.key}>
                    <Link
                      href={l.href}
                      className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-accent/40 sm:px-5"
                    >
                      {/* The trade's own mark, and the same one the complaint
                          carries in the list to the left — so a bolt in the
                          queue and a bolt on this row are recognisably the same
                          kind of work. */}
                      {/* Unassigned keeps the semantic amber and the dashed ring rather
                          than a trade colour, because it is not a trade — it is the same
                          work the ring's "Not started" arc counts, and its bar below is
                          that amber too. */}
                      {l.key === "none" ? (
                        <Medallion icon={CircleDashed} tone="warn" size="sm" />
                      ) : (
                        <DepartmentMark slug={l.slug} />
                      )}
                      {/* The bar sits under the name, not beside it. */}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs">
                            {l.name}
                          </span>
                          <span className="tnum shrink-0 text-sm font-medium">
                            {l.count}
                          </span>
                        </span>
                        <span
                          aria-hidden
                          className="mt-1.5 block h-2 overflow-hidden rounded-full bg-muted"
                        >
                          {/* One hue for every department, because the bar's
                            length is already the whole message — giving each
                            team its own colour would invite reading the colours
                            as a ranking on top of a list that is already
                            sorted. */}
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(l.count / busiestDepartment) * 100}%`,
                              background:
                                l.key === "none"
                                  ? GROUP_VAR.open
                                  : /* Step 4, not 3: re-stepping the ramp
                                     for the stacked bar made --chart-3 dark
                                     enough to turn these bars into blocks. */
                                    "var(--chart-4)",
                            }}
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>

      {/* The timeline is the product, and until now none of it appeared on the
          first screen an admin sees. */}
      <div className="mt-7">
        <Panel
          /* The eyebrow's words, moved into the panel it labelled: one
             untitled card under a section heading was the same mismatch the
             activity screen had, and an untitled Panel cannot carry a
             description or an action either. */
          title="Latest activity"
          description="Newest first, one row per complaint"
          bodyClassName=""
          actions={
            <Link
              href="/admin/activity"
              className="text-xs font-medium text-primary underline underline-offset-4"
            >
              See all
            </Link>
          }
        >
          {events.length > 0 ? (
            <ul className="divide-y divide-border">
              {events.map((e) => {
                const complaint = complaintById.get(e.complaint_id);
                const { who, text } = describeEvent(
                  e,
                  session.userId,
                  complaint ? relName(complaint.departments) : null,
                  e.actor_id ? actorName.get(e.actor_id) : null,
                );
                return (
                  <li key={e.id}>
                    <Link
                      href={
                        complaint
                          ? `/admin/complaints/${complaint.id}`
                          : "/admin/complaints"
                      }
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40 sm:items-center sm:gap-4 sm:px-5"
                    >
                      {/* What happened, as a shape. Six rows of "confirmed the
                          fix / filed this complaint / assigned it to Plumbing"
                          is a wall of sentences that all begin with a name, and
                          the verb — the only part that differs — sits in the
                          middle of each line where nothing lines it up. */}
                      <Medallion icon={eventIcon(e.type)} size="sm" />
                      {/* The row's own two-column behaviour is kept inside a
                          wrapper rather than moved onto the Link, so the mark
                          stays put while the text and the time still stack on
                          a phone and sit apart above `sm`. */}
                      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <span className="min-w-0">
                          <span className="block text-sm">
                            <span className="font-medium">{who}</span>{" "}
                            <span className="text-muted-foreground">
                              {text}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            <span className="font-mono">
                              {complaint?.ticket_no ?? "—"}
                            </span>
                            {complaint ? ` · ${complaint.title}` : null}
                          </span>
                        </span>
                        <span className="tnum shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                          {formatRelative(e.created_at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="Nothing has happened yet"
              description="Every status change writes an entry here."
            />
          )}
        </Panel>
      </div>
    </Page>
  );
}
