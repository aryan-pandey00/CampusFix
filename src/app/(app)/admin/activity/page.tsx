import Link from "next/link";
import { History } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Medallion } from "@/components/medallion";
import { EmptyState, Page, Panel, Stat } from "@/components/page";
import { Pager } from "@/components/pager";
import { REPORT_TABS, SubNav } from "@/components/sub-nav";
import { eventIcon } from "@/lib/complaints/icons";
import {
  EVENT_LABEL,
  describeEvent,
  formatRelative,
  formatWhen,
  relFullName,
  type TimelineEvent,
} from "@/lib/complaints/display";
import { ActivityFilters } from "./activity-filters";

export const metadata = { title: "Activity · CampusFix" };

/*
   20, not 30. Thirty rows made this panel 2,291px on a 3,896px page — and the
   queue and the department's queue both page at 20, so a log that paged at 30
   was the odd one out as well as the tall one.
*/
const PAGE_SIZE = 20;

const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

/** A date from the URL, or nothing. Anything unparseable is ignored. */
const day = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

type Row = TimelineEvent & {
  complaint_id: string;
  complaints: unknown;
  profiles: unknown;
};

export default async function ActivityPage({
  searchParams,
}: PageProps<"/admin/activity">) {
  const session = await requireAdmin();
  const sp = await searchParams;

  const who = first(sp.who);
  const type = first(sp.type);
  const department = first(sp.department);
  const from = day(first(sp.from));
  const to = day(first(sp.to));
  const requestedPage = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();

  const [{ data: roster }, { data: departments }] = await Promise.all([
    // Reused rather than a fourth query shape: this is the same function the
    // Users screen calls, and it already refuses anyone who is not an admin.
    supabase.rpc("admin_list_users"),
    supabase.from("departments").select("id, name").order("name"),
  ]);

  // Only the people who act on complaints. Students appear as actors too, but
  // "what has this student done" is answered better by the queue filtered to
  // them — which is what the Users screen links to.
  const people = (
    (roster ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      role: string;
    }>
  )
    .filter((u) => u.role !== "student")
    .map((u) => ({
      id: u.id,
      name: u.full_name ?? u.email ?? "Unnamed",
      role: u.role,
    }));

  const departmentName = new Map(
    (departments ?? []).map((d) => [d.id, d.name as string]),
  );

  /*
    The filters, described once and applied to two query builders. The values
    are shared and the loop is not: a generic function over both makes
    TypeScript unfold Supabase's builder types until it gives up (TS2589).
    `complaints!inner` is what makes the department filter possible at all —
    it is a column on the complaint, not on the event.
  */
  const SELECT =
    "id, type, from_status, to_status, note, is_internal, created_at, actor_id, complaint_id, complaints!inner(ticket_no, title, department_id), profiles!complaint_events_actor_id_fkey(full_name)";

  /* Everything EXCEPT the event type, which is passed per call. */
  const eqs: Array<[string, string]> = [];
  if (who) eqs.push(["actor_id", who]);
  if (department) eqs.push(["complaints.department_id", department]);

  /**
   * How many events match, optionally narrowed to one type.
   *
   * `head: true`, so Postgres counts and sends no rows: tallying fetched rows
   * in JavaScript would under-count silently past PostgREST's row cap. The
   * return type is annotated to stop the TS2589 unfolding described above.
   */
  const countEvents = async (eventType?: string): Promise<number> => {
    let q = supabase
      .from("complaint_events")
      .select("id, complaints!inner(department_id)", {
        count: "exact",
        head: true,
      });
    for (const [col, val] of eqs) q = q.eq(col, val);
    if (eventType) q = q.eq("type", eventType);
    if (from) q = q.gte("created_at", from);
    // `to` is inclusive on screen, so the bound is the start of the next day —
    // otherwise picking today as the end date hides everything that happened
    // today, which reads as the filter being broken.
    if (to) q = q.lt("created_at", nextDay(to));
    const { count } = await q;
    return count ?? 0;
  };

  const [total, confirmed, reopened, returned] = await Promise.all([
    countEvents(type || undefined),
    countEvents("confirmed"),
    countEvents("reopened"),
    countEvents("returned"),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, lastPage);

  let query = supabase.from("complaint_events").select(SELECT);
  for (const [col, val] of eqs) query = query.eq(col, val);
  if (type) query = query.eq("type", type);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lt("created_at", nextDay(to));

  const start = (page - 1) * PAGE_SIZE;
  const { data: events, error } = await query
    .order("created_at", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  const rows = (events ?? []) as Row[];

  const href = (patch: Record<string, string>) => {
    const params = new URLSearchParams();
    const all = {
      who,
      type,
      department,
      from,
      to,
      page: "",
      ...patch,
    };
    for (const [k, v] of Object.entries(all)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/admin/activity?${s}` : "/admin/activity";
  };

  const pageHref = (n: number) => href({ page: n > 1 ? String(n) : "" });

  /*
     Pressing a tile that is already on turns it off, because the tile is the
     only place that filter is visible as a shape.
  */
  const typeHref = (t: string) => href({ type: type === t ? "" : t, page: "" });

  return (
    <Page
      title="Reports"
      description={
        total === 0
          ? "Nothing matches those filters."
          : `${total} recorded change${total === 1 ? "" : "s"}${
              total > PAGE_SIZE
                ? ` · showing ${start + 1}–${Math.min(start + PAGE_SIZE, total)}`
                : ""
            }`
      }
    >
      <SubNav items={REPORT_TABS} />

      <ActivityFilters people={people} departments={departments ?? []} />

      {/* The three outcomes, and why these three. */}
      <div className="mb-5 grid grid-cols-3 gap-3 sm:gap-4">
        <Stat
          icon={eventIcon("confirmed")}
          label={EVENT_LABEL.confirmed}
          value={confirmed}
          href={typeHref("confirmed")}
          active={type === "confirmed"}
        />
        <Stat
          icon={eventIcon("reopened")}
          label={EVENT_LABEL.reopened}
          value={reopened}
          href={typeHref("reopened")}
          active={type === "reopened"}
        />
        <Stat
          icon={eventIcon("returned")}
          label={EVENT_LABEL.returned}
          value={returned}
          href={typeHref("returned")}
          active={type === "returned"}
        />
      </div>

      {error ? (
        <p className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : (
        <Panel
          title="Everything that happened to a complaint"
          description="Newest first. Internal notes included — this screen is admin-only."
          bodyClassName=""
          /* Conditional at the call site, not inside Pager: Panel decides
             whether to draw the footer band from whether `footer` was given at
             all, and a component that renders null is still an element. One
             page of results was getting an empty strip under the list. */
          footer={
            lastPage > 1 ? (
              <Pager page={page} lastPage={lastPage} href={pageHref} />
            ) : undefined
          }
        >
          {rows.length > 0 ? (
            <ul className="divide-y divide-border">
              {rows.map((e) => {
                const complaint = e.complaints as unknown as {
                  ticket_no: string;
                  title: string;
                  department_id: string | null;
                } | null;
                const actor = relFullName(e.profiles);
                const { who: actorLabel, text } = describeEvent(
                  e,
                  session.userId,
                  complaint?.department_id
                    ? departmentName.get(complaint.department_id)
                    : null,
                  actor,
                );

                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 px-4 py-3 sm:gap-3.5 sm:px-5"
                  >
                    {/* The same mark this event has on the dashboard, drawn by
                        the same function. */}
                    <Medallion icon={eventIcon(e.type)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                        <span className="font-medium">{actorLabel}</span>
                        <span className="text-muted-foreground">{text}</span>
                        {e.is_internal ? (
                          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                            Internal
                          </span>
                        ) : null}
                        <span
                          className="ml-auto shrink-0 text-xs text-muted-foreground tnum"
                          title={formatWhen(e.created_at)}
                        >
                          {formatRelative(e.created_at)}
                        </span>
                      </div>
                      {complaint ? (
                        <Link
                          href={`/admin/complaints/${e.complaint_id}`}
                          className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs transition-colors hover:text-primary"
                        >
                          <span className="font-mono text-muted-foreground">
                            {complaint.ticket_no}
                          </span>
                          <span className="text-muted-foreground">
                            {complaint.title}
                          </span>
                        </Link>
                      ) : null}
                      {e.note ? (
                        <p className="mt-1.5 line-clamp-2 rounded-[var(--radius-md)] border border-border bg-muted/50 px-2.5 py-1.5 text-xs whitespace-pre-wrap">
                          {e.note}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={History}
              title="Nothing matches those filters"
              description="Widen them, or clear them to see everything that has happened."
              action={
                <Link
                  href="/admin/activity"
                  className="text-sm font-medium text-primary underline underline-offset-4"
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

/** Who did it. */

/** "an admin", "a student", "part of Electrical Services". */

/** The day after the one given, as a date string. */
function nextDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
