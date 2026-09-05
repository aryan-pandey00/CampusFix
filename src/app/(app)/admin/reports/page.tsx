import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Page, Panel, SectionLabel } from "@/components/page";
import { AgeHistogram } from "@/components/age-histogram";
import { StackedBar, type Segment } from "@/components/stacked-bar";
import { CATEGORY_LABEL, formatDuration } from "@/lib/complaints/display";
import {
  ageBuckets,
  buildReports,
  weeklyVolume,
  type ReportRow,
} from "@/lib/complaints/reports";
import { REPORT_TABS, SubNav } from "@/components/sub-nav";
import { WeeklyTrendChart } from "./charts";
import { RankedList, type RankedRow } from "./ranked-list";

export const metadata = { title: "Reports · CampusFix" };

const WEEKS = 8;

export default async function ReportsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: rows }, { data: locations }, { data: departments }] =
    await Promise.all([
      supabase
        .from("complaints")
        .select(
          "status, category, location_id, department_id, created_at, resolved_at",
        ),
      supabase.from("locations").select("id, name"),
      supabase.from("departments").select("id, name"),
    ]);

  const complaints = (rows ?? []) as ReportRow[];
  const locationName = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const departmentName = new Map(
    (departments ?? []).map((d) => [d.id, d.name]),
  );

  const { byLocation, byCategory, recurring, byDepartment } = buildReports(
    complaints,
    locationName,
    departmentName,
    CATEGORY_LABEL,
  );
  /* One clock reading for the whole render, taken once. */
  const now = new Date();
  const weeks = weeklyVolume(complaints, WEEKS, now);
  const ages = ageBuckets(complaints, now);

  const fastest = byDepartment.at(-1);
  const slowest = byDepartment.at(0);

  /* Three ranked lists in place of three bar charts. */
  /* Six places, then the rest as one row. */
  const TOP_PLACES = 6;
  const placeTail = byLocation.slice(TOP_PLACES);
  const tailCount = placeTail.reduce((n, l) => n + l.count, 0);
  const tailOpen = placeTail.reduce((n, l) => n + l.open, 0);
  const maxLocation = Math.max(1, ...byLocation.map((l) => l.count));

  const locationRows: RankedRow[] = [
    ...byLocation.slice(0, TOP_PLACES).map((l) => ({
      key: l.key,
      name: l.name,
      fraction: l.count / maxLocation,
      value: String(l.count),
      note: l.open > 0 ? `${l.open} still open` : undefined,
      noteTone: l.open > 0 ? ("warn" as const) : undefined,
      href: `/admin/complaints?location=${l.key}`,
    })),
    ...(placeTail.length > 0
      ? [
          {
            key: "rest",
            name: `${placeTail.length} other place${placeTail.length === 1 ? "" : "s"}`,
            fraction: tailCount / maxLocation,
            value: String(tailCount),
            note: tailOpen > 0 ? `${tailOpen} still open` : undefined,
            noteTone: tailOpen > 0 ? ("warn" as const) : undefined,
          },
        ]
      : []),
  ];

  /* Kinds become one stacked bar rather than seven ranked rows. */
  const categorySegments: Segment[] = byCategory.map((c) => ({
    key: c.key,
    name: c.name,
    count: c.count,
    open: c.open,
    href: `/admin/complaints?category=${c.key}`,
  }));

  const slowestHours = Math.max(1, ...byDepartment.map((d) => d.hours));
  const departmentRows: RankedRow[] = byDepartment.map((d) => ({
    key: d.key,
    name: d.name,
    fraction: d.hours / slowestHours,
    // The sample size travels with the average. Four hours "on average" across
    // one complaint is not an average, and the old chart hid that.
    value: formatDuration(d.hours * 3_600_000),
    note: `${d.resolved} resolved`,
    href: `/admin/complaints?department=${d.key}`,
  }));

  return (
    <Page
      title="Reports"
      description={`${complaints.length} complaint${complaints.length === 1 ? "" : "s"} in total, since the first one was filed.`}
      /*
         The default measure, not `wide`, and that changed when Departments
         joined this group as a tab.
      */
    >
      <SubNav items={REPORT_TABS} />

      {/* Recurring problems lead, and as a table rather than a chart. */}
      <SectionLabel>What keeps happening</SectionLabel>

      {/* xl, not lg: the shell's own rail appears at lg, so a second column
          there left the table 369px wide inside a 512px minimum and it had to
          be scrolled sideways to read. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <Panel
          title="Recurring problems"
          description="The same kind of fault, in the same place, more than once. Grouped by location and category only — the spot inside a place is free text, so counting it would split every repeat."
          bodyClassName=""
        >
          {recurring.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <Th>Location</Th>
                    <Th>Kind</Th>
                    <Th className="text-right">Times</Th>
                    <Th className="text-right">Still open</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recurring.map((r) => (
                    <tr key={`${r.location}-${r.category}`}>
                      <td className="px-4 py-2.5 font-medium">{r.location}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {r.category}
                      </td>
                      <td className="px-4 py-2.5 text-right tnum">{r.count}</td>
                      <td className="px-4 py-2.5 text-right tnum">
                        {r.open > 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span
                              aria-hidden
                              className="size-1.5 rounded-full bg-amber-500"
                            />
                            {r.open}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Nothing has gone wrong twice yet"
              description="In the same place, with the same kind of fault. That is either good news or not enough data."
            />
          )}
        </Panel>

        {/* One finding, stated in words. A number an admin can repeat in a
            meeting is worth more than a fifth chart. */}
        <Panel title="Finding">
          {byDepartment.length > 1 && slowest && fastest ? (
            <>
              <p className="text-sm leading-relaxed">
                <span className="font-medium">{fastest.name}</span> resolves
                fastest, at {formatDuration(fastest.hours * 3_600_000)} on
                average, against {formatDuration(slowest.hours * 3_600_000)} for{" "}
                <span className="font-medium">{slowest.name}</span>.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Measured from when a complaint was filed to when it was marked
                resolved — not from when the department received it.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Two departments need to have resolved something before their
              speeds can be compared.
            </p>
          )}
        </Panel>
      </div>

      {/* Fourteen places on the left against seven kinds on the right is a
          150px hole in the corner, which is what `items-start` was hiding. */}
      {/* The kinds get the full width, because one bar of seven parts IS one
          row and putting it in a half-width column would squeeze the only
          segment big enough to hold its own label. */}
      <div className="mt-8">
        <SectionLabel>What kind of trouble, and how old</SectionLabel>
        <Panel
          title="What kind of trouble"
          description="Every complaint ever filed, by the kind the student chose. Largest first."
        >
          {categorySegments.length > 0 ? (
            <StackedBar segments={categorySegments} />
          ) : (
            <EmptyState title="No complaints yet" />
          )}
        </Panel>

        {/* Also xl: at 1024 these two halves were 345px, and a ranked row's
            fixed columns come to 384px — so the meter, the only part of it
            that is a chart, collapsed to nothing. */}
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {/* New information, not a restyle: nothing in this app answered
              "is anything rotting?" before. */}
          <Panel
            title="How long the open ones have been waiting"
            description="Only complaints that are still open. Three days is the same line the dashboard warns on."
          >
            <AgeHistogram buckets={ages} />
          </Panel>

          <Panel
            title="Average time to resolve"
            description="Filed to resolved, slowest first. Only departments that have resolved something appear."
            bodyClassName=""
          >
            {departmentRows.length > 0 ? (
              <RankedList rows={departmentRows} />
            ) : (
              <EmptyState
                title="Nothing resolved yet"
                description="There is no time to average until something has been fixed."
              />
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel>Where it happens</SectionLabel>
        <Panel
          title="Which places give the most trouble"
          description="Every complaint ever filed, by location. The busiest six, then the rest together."
          bodyClassName=""
          footer="Counted by location only — the spot inside a place is free text, so it is not grouped."
        >
          {locationRows.length > 0 ? (
            <RankedList rows={locationRows} />
          ) : (
            <EmptyState title="No complaints yet" />
          )}
        </Panel>
      </div>

      <div className="mt-8">
        <SectionLabel>How much, week by week</SectionLabel>
        <WeeklyTrendChart data={weeks} />
      </div>
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
