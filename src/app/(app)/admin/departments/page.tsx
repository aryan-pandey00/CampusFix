import Link from "next/link";
import { ArrowRight, CircleDashed } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Page, Panel } from "@/components/page";
import { DepartmentMark } from "@/components/department-mark";
import { Medallion } from "@/components/medallion";
import { REPORT_TABS, SubNav } from "@/components/sub-nav";
import {
  ACTIVE_STATUSES,
  formatDuration,
  type Status,
} from "@/lib/complaints/display";

export const metadata = { title: "Departments · CampusFix" };

export default async function DepartmentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: departments }, { data: rows }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, slug, contact_name, is_active")
      .order("name"),
    supabase
      .from("complaints")
      .select("department_id, status, created_at, resolved_at"),
  ]);

  const complaints = rows ?? [];
  const unassigned = complaints.filter(
    (c) =>
      c.department_id === null && ACTIVE_STATUSES.includes(c.status as Status),
  ).length;

  const load = (departments ?? []).map((d) => {
    const mine = complaints.filter((c) => c.department_id === d.id);
    const open = mine.filter((c) =>
      ACTIVE_STATUSES.includes(c.status as Status),
    );
    const done = mine.filter((c) => c.resolved_at);
    const avg =
      done.length > 0
        ? done.reduce(
            (sum, c) =>
              sum +
              (new Date(c.resolved_at!).getTime() -
                new Date(c.created_at).getTime()),
            0,
          ) / done.length
        : null;
    return {
      ...d,
      total: mine.length,
      open: open.length,
      done: done.length,
      avg,
    };
  });

  const busiest = Math.max(1, ...load.map((d) => d.open));

  /* Sorted by what the page says it is about. */
  const ranked = [...load].sort(
    (a, b) => b.open - a.open || a.name.localeCompare(b.name),
  );

  /*
     Open and Resolved partition Total, so the three columns always add up:
     reopen_complaint (0008) clears resolved_at, which is what keeps a reopened
     complaint out of both at once.
  */
  const openNow = load.reduce((n, d) => n + d.open, 0);
  const everHandled = load.reduce((n, d) => n + d.total, 0);

  return (
    <Page
      /*
         "Reports", not "Departments". The H1 names the group and the tab picks
         the view — a heading that changes with the tab makes switching feel
         like leaving the section rather than moving inside it.
      */
      title="Reports"
      description="Who work is handed to, and how much each is carrying."
    >
      <SubNav items={REPORT_TABS} />

      {/* Was a yellow box. Amber is this app's "in flight" colour, and a filled
          amber panel next to green status chips was the loudest thing on the
          screen for what is really a one-line prompt. */}
      {unassigned > 0 ? (
        <Link
          href="/admin/complaints?status=open&department=none"
          className="mb-4 flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-sm shadow-xs transition-colors hover:border-primary/30"
        >
          {/* The dashed ring, which is this app's mark for nothing-claimed —
              the same one on the dashboard's Unassigned tile and bar, and in
              the queue's Department column. */}
          <Medallion icon={CircleDashed} tone="warn" size="sm" />
          <span className="flex-1">
            <span className="font-medium tnum">{unassigned}</span> open
            complaint
            {unassigned === 1 ? " is" : "s are"} not with any department yet.
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      <Panel
        bodyClassName=""
        footer={
          <>
            {/* Renaming or retiring a department is still done by editing
                0004_seed.sql — a developer's job, not an admin's, so the file
                name does not belong on the screen. PLAN.md has the how. */}
            {ranked.length} departments, carrying {openNow} of the{" "}
            {everHandled} complaints ever handed out. They cannot be added or
            renamed from here, and one that retires keeps the complaints it has
            already finished.
          </>
        }
      >
        {/*
           Four figures per department, in columns, because the question this
           tab exists to answer is a comparison and the old row made one
           impossible: three of the four sat in a single line of 12px text
           ("49 ever · 25 resolved, averaging 5.9 hr · see the 24 open"), so
           nothing lined up with the row above it.

           Columns from `md`. Below that a row keeps those facts as one line of
           text, which is the only thing that fits on a phone.
        */}
        <div className="hidden items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase sm:px-5 md:flex">
          <span aria-hidden className="w-7 shrink-0" />
          <span className="w-48 shrink-0">Department</span>
          <span className="w-12 shrink-0 text-right">Open</span>
          <span aria-hidden className="min-w-0 flex-1" />
          <span className="w-14 shrink-0 text-right">Total</span>
          <span className="w-20 shrink-0 text-right">Resolved</span>
          <span className="w-[5.5rem] shrink-0 text-right">Average</span>
        </div>

        <ul className="divide-y divide-border">
          {ranked.map((d) => (
            <li key={d.id}>
              <Link
                href={`/admin/complaints?department=${d.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 sm:px-5"
              >
                {/* The trade's own mark, the same one the complaint carries in
                    the queue and the same one on the dashboard's load rows. */}
                <DepartmentMark slug={d.slug} />
                <span className="min-w-0 flex-1 md:w-48 md:flex-none">
                  <span className="block truncate font-medium tracking-[-0.01em]">
                    {d.name}
                    {!d.is_active ? (
                      <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                        Inactive
                      </span>
                    ) : null}
                  </span>
                  {d.contact_name ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.contact_name}
                    </span>
                  ) : null}
                  <span className="block text-xs text-muted-foreground md:hidden">
                    {d.total} in total ·{" "}
                    {d.done > 0 ? (
                      <>
                        {d.done} resolved, averaging{" "}
                        <span className="whitespace-nowrap">
                          {formatDuration(d.avg!)}
                        </span>
                      </>
                    ) : (
                      "nothing resolved yet"
                    )}
                  </span>
                </span>

                <span className="shrink-0 text-right text-[0.9375rem] font-semibold tnum md:w-12">
                  {d.open}
                  {/* The word only where no column heading is saying it. */}
                  <span className="text-xs font-normal text-muted-foreground md:hidden">
                    {" "}
                    open
                  </span>
                </span>
                {/* Every bar on the same scale, so who is carrying the most is
                    answerable without reading a number. This is the column that
                    takes the row's slack — the same shape as the ranked lists on
                    the Overview tab, and it was the name column taking it that
                    left 470px of nothing in the middle of every row. */}
                <span
                  aria-hidden
                  className="hidden h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted md:block"
                >
                  {d.open > 0 ? (
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (d.open / busiest) * 100)}%`,
                        background: "var(--chart-4)",
                      }}
                    />
                  ) : null}
                </span>
                <span className="hidden w-14 shrink-0 text-right text-sm tnum md:block">
                  {d.total}
                </span>
                <span className="hidden w-20 shrink-0 text-right text-sm text-muted-foreground tnum md:block">
                  {d.done}
                </span>
                <span className="hidden w-[5.5rem] shrink-0 text-right text-sm text-muted-foreground tnum md:block">
                  {d.avg !== null ? formatDuration(d.avg) : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </Page>
  );
}
